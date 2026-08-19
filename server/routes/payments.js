const express = require("express");
const Safepay = require("@sfpy/node-core");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { createOrderFromPayload, rollbackUnpaidOrder } = require("./orders");

const router = express.Router();

function getClientOrigin() {
  return (process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
}

function getSafepay() {
  const env = (process.env.SAFEPAY_ENV || "sandbox").toLowerCase();
  return Safepay(process.env.SAFEPAY_SECRET_KEY, {
    authType: "secret",
    host: env === "production"
      ? "https://api.getsafepay.com"
      : "https://sandbox.api.getsafepay.com",
  });
}

function getEnvironment() {
  return (process.env.SAFEPAY_ENV || "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

// Create a local order first so the cart/stock and Safepay tracker are tied together.
router.post("/session", requireAuth, async (req, res) => {
  if (!process.env.SAFEPAY_API_KEY || !process.env.SAFEPAY_SECRET_KEY) {
    return res.status(503).json({
      error: "Safepay is not configured. Add SAFEPAY_API_KEY and SAFEPAY_SECRET_KEY to server/.env.",
    });
  }

  let order = null;

  try {
    order = createOrderFromPayload(req, req.body, "safepay");
    const safepay = getSafepay();

    // Khalid Super Store stores prices in rupees; Safepay expects the
    // currency's lowest denomination, so PKR 1,000 becomes 100000.
    const amount = Math.round(Number(order.total) * 100);

   const sessionResponse = await safepay.payments.session.setup({
  merchant_api_key: process.env.SAFEPAY_API_KEY,
  intent: "CYBERSOURCE",
  mode: "payment",
  entry_mode: "raw",
  currency: "PKR",
  amount,

  include_fees: false,
});

    const tracker = sessionResponse?.data?.tracker?.token || sessionResponse?.tracker?.token;
    if (!tracker) throw new Error("Safepay did not return a payment tracker.");

    const authResponse = await safepay.client.passport.create();
    const authToken = authResponse?.data || authResponse?.data?.token;
    if (!authToken) throw new Error("Safepay did not return an authentication token.");

const checkoutURL = safepay.checkout.createCheckoutUrl({
  tracker,
  tbt: authToken,
  env: getEnvironment(),
});

    db.prepare(
      "UPDATE orders SET payment_reference = ?, payment_status = 'pending' WHERE id = ?"
    ).run(tracker, order.id);

    order = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);

    res.json({
      checkout_url: checkoutURL,
      tracker,
      order: { ...order, items },
    });
  } catch (err) {
    console.error("Safepay session error:", err);
    if (order?.id) {
      try {
        rollbackUnpaidOrder(order.id);
      } catch (rollbackError) {
        console.error("Safepay rollback error:", rollbackError);
      }
    }
    res.status(400).json({
      error: err.message || "Unable to start Safepay checkout.",
    });
  }
});

// Server-to-server verification of the tracker. The browser redirect is never
// treated as proof of payment by itself.
router.get("/status/:orderId", requireAuth, async (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.orderId);

  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized to view this payment" });
  }

  if (order.payment_method !== "safepay" || !order.payment_reference) {
    return res.json({ order, payment_status: order.payment_status });
  }

  try {
    const safepay = getSafepay();
    const response = await safepay.reporter.payments.fetch(order.payment_reference);
    const tracker = response?.data?.tracker || response?.tracker;
    const state = tracker?.state || "UNKNOWN";

    if (state === "TRACKER_ENDED") {
      db.prepare(
        "UPDATE orders SET payment_status = 'paid' WHERE id = ? AND payment_reference = ?"
      ).run(order.id, order.payment_reference);
    }

    const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);

    res.json({
      order: { ...updated, items },
      payment_status: updated.payment_status,
      tracker_state: state,
    });
  } catch (err) {
    console.error("Safepay status error:", err);
    res.status(502).json({ error: "Could not verify the Safepay payment yet." });
  }
});

module.exports = router;
