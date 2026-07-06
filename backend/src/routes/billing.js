const express = require("express");
const Stripe = require("stripe");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /billing/create-checkout-session — starts a real Stripe Checkout flow
router.post("/create-checkout-session", requireAuth, scopeToOrg, async function (req, res) {
  try {
    const orgResult = await db.query(
      "SELECT id, name, stripe_customer_id FROM organizations WHERE id = $1",
      [req.orgId]
    );
    const org = orgResult.rows[0];
    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    let customerId = org.stripe_customer_id;

    // Create a Stripe customer for this org if one doesn't exist yet
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { orgId: org.id },
      });
      customerId = customer.id;
      await db.query("UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2", [
        customerId,
        org.id,
      ]);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard`,
      metadata: { orgId: org.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create checkout session", message: err.message });
  }
});

// GET /billing/status — current plan for the logged-in user's org
router.get("/status", requireAuth, scopeToOrg, async function (req, res) {
  try {
    const result = await db.query("SELECT plan FROM organizations WHERE id = $1", [req.orgId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }
    res.json({ plan: result.rows[0].plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch billing status", message: err.message });
  }
});

// POST /billing/webhook — Stripe calls this directly (no JWT, verified via signature instead)
router.post("/webhook", express.raw({ type: "application/json" }), async function (req, res) {
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