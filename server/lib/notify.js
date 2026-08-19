const db = require("../db");
const { getSetting } = require("./settings");
const { sendEmail } = require("./mailer");
const { templates, SUBJECTS } = require("./emailTemplates");
const { sendWhatsApp } = require("./whatsapp");

function logNotification({ orderId, channel, event, recipient, status, detail }) {
  db.prepare(`
    INSERT INTO notifications_log (order_id, channel, event, recipient, status, detail)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(orderId, channel, event, recipient || null, status, detail || null);
}

// Fires (best-effort, never throws) email + WhatsApp notifications for an
// order-lifecycle event. Safe to call even when nothing is configured —
// everything is logged instead of sent.
async function notifyOrderEvent(event, order, customerEmail) {
  const storeSettings = getSetting("store");
  const emailSettings = getSetting("email");
  const whatsappSettings = getSetting("whatsapp");
  const storeName = storeSettings.name || "Khalid Super Store";

  // Email
  if (emailSettings.enabled && customerEmail && templates[event]) {
    try {
      const html = templates[event](storeName, order);
      const subject = SUBJECTS[event] ? SUBJECTS[event](order) : `Update on order #${order.id}`;
      const result = await sendEmail({
        to: customerEmail,
        subject,
        html,
        fromName: emailSettings.from_name,
        fromEmail: emailSettings.from_email,
      });
      logNotification({
        orderId: order.id,
        channel: "email",
        event,
        recipient: customerEmail,
        status: result.status,
        detail: result.detail,
      });
    } catch (err) {
      logNotification({
        orderId: order.id,
        channel: "email",
        event,
        recipient: customerEmail,
        status: "failed",
        detail: err.message,
      });
    }
  }

  // WhatsApp
  if (whatsappSettings.enabled && order.contact_phone) {
    try {
      const result = await sendWhatsApp({
        event,
        storeName,
        order,
        toPhone: order.contact_phone,
      });
      logNotification({
        orderId: order.id,
        channel: "whatsapp",
        event,
        recipient: order.contact_phone,
        status: result.status,
        detail: result.detail || result.message,
      });
    } catch (err) {
      logNotification({
        orderId: order.id,
        channel: "whatsapp",
        event,
        recipient: order.contact_phone,
        status: "failed",
        detail: err.message,
      });
    }
  }
}

module.exports = { notifyOrderEvent, logNotification };
