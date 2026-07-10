const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");
const asyncHandler = require("../utils/asyncHandler");
const billingService = require("../services/billingService");
const db = require("../config/db");

const router = express.Router();

router.post(
  "/create-checkout-session",
  requireAuth,
  scopeToOrg,
  asyncHandler(async function (req, res) {
    const url = await billingService.createCheckoutSession(req.orgId);
    res.json({ url: url });
  })
);

router.get(
  "/status",
  requireAuth,
  scopeToOrg,
  asyncHandler(async function (req, res) {
    const plan = await billingService.getBillingStatus(req.orgId);
    res.json({ plan: plan });
  })
);

// Webhook route intentionally left untouched — Stripe requires the raw request body
// for signature verification, and its error format (plain text "Webhook Error: ...")
// follows Stripe's own conventions, not our JSON API shape.
router.post("/webhook", express.raw({ type: "application/json" }), async function (req, res) {
  const stripe = billingService.stripe;
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orgId = session.metadata?.orgId;
    if (orgId) {
      await db.query("UPDATE organizations SET plan = 'pro' WHERE id = $1", [orgId]);
      console.log(`Organization ${orgId} upgraded to pro`);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    await db.query("UPDATE organizations SET plan = 'free' WHERE stripe_customer_id = $1", [customerId]);
    console.log(`Subscription cancelled for customer ${customerId}, downgraded to free`);
  }

  res.json({ received: true });
});

module.exports = router;