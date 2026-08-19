const axios = require("axios");

// ---------------------------------------------------------------------------
// WhatsApp architecture
//
// This module intentionally does NOT call any WhatsApp API by default. There
// is no free/unofficial WhatsApp automation that is safe or ToS-compliant to
// wire up automatically, so instead this provides:
//
//   1. A message-template builder (buildMessage) — pure text, matches the
//      tone requested in the spec.
//   2. A pluggable "driver" — if WHATSAPP_API_URL + WHATSAPP_API_TOKEN +
//      WHATSAPP_PHONE_ID are present in server/.env, messages are POSTed to
//      that endpoint using the WhatsApp Cloud API's message-send shape
//      (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages).
//      That's the official Meta API — when the store owner completes
//      WhatsApp Business API onboarding, dropping the three env vars in is
//      enough to go live.
//   3. Until then, every "send" is logged to notifications_log with status
//      'not_configured' so the admin panel can show exactly what *would*
//      have been sent.
// ---------------------------------------------------------------------------

function isConfigured() {
  return Boolean(
    process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID
  );
}

function buildMessage(event, storeName, order) {
  const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const greeting = `Hello ${order.contact_name},`;

  const lines = {
    order_received: `${greeting}\n\nWe've received your order #${order.id} from ${storeName}.\n\nTotal: ${money(order.total)}\nStatus: Pending\n\nThank you for shopping with ${storeName}.`,
    order_confirmed: `${greeting}\n\nYour order #${order.id} from ${storeName} has been confirmed.\n\nTotal: ${money(order.total)}\nStatus: Confirmed\n\nThank you for shopping with ${storeName}.`,
    payment_confirmed: `${greeting}\n\nYour payment for order #${order.id} has been verified. Total: ${money(order.total)}.\n\nThank you for shopping with ${storeName}.`,
    payment_rejected: `${greeting}\n\nWe could not verify your payment for order #${order.id}. Please check the payment details and resubmit proof.\n\n${storeName}`,
    out_for_delivery: `${greeting}\n\nYour order #${order.id} from ${storeName} is out for delivery.\n\nThank you for shopping with ${storeName}.`,
    delivered: `${greeting}\n\nYour order #${order.id} from ${storeName} has been delivered. Enjoy!\n\nThank you for shopping with ${storeName}.`,
    cancelled: `${greeting}\n\nYour order #${order.id} from ${storeName} has been cancelled. Contact us if this is unexpected.\n\n${storeName}`,
  };

  return lines[event] || null;
}

async function sendWhatsApp({ event, storeName, order, toPhone }) {
  const message = buildMessage(event, storeName, order);
  if (!message) return { ok: false, status: "failed", detail: "Unknown event" };

  if (!isConfigured()) {
    return {
      ok: false,
      status: "not_configured",
      detail: "WhatsApp Business API not configured (set WHATSAPP_API_URL, WHATSAPP_API_TOKEN, WHATSAPP_PHONE_ID)",
      message,
    };
  }

  try {
    await axios.post(
      `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: toPhone,
        type: "text",
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` } }
    );
    return { ok: true, status: "sent", message };
  } catch (err) {
    console.error("[whatsapp] send failed:", err.message);
    return { ok: false, status: "failed", detail: err.message, message };
  }
}

module.exports = { buildMessage, sendWhatsApp, isConfigured };
