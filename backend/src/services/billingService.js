const db = require("../config/db");
const Stripe = require("stripe");
const AppError = require("../utils/AppError");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(orgId) {
  const orgResult = await db.query(
    "SELECT id, name, stripe_customer_id FROM organizations WHERE id = $1",
    [orgId]
  );
  const org = orgResult.rows[0];
  if (!org) {
    throw new AppError(404, "Organization not found");
  }

  try {
    let customerId = org.stripe_customer_id;

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

    return session.url;
  } catch (err) {
    console.error(err);
    throw new AppError(500, "Failed to create checkout session", { message: err.message });
  }
}

async function getBillingStatus(orgId) {
  const result = await db.query("SELECT plan FROM organizations WHERE id = $1", [orgId]);
  if (result.rows.length === 0) {
    throw new AppError(404, "Organization not found");
  }
  return result.rows[0].plan;
}

module.exports = { createCheckoutSession, getBillingStatus, stripe };