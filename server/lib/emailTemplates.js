function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString()}`;
}

function baseLayout(storeName, title, bodyHtml) {
  return `
  <div style="font-family: 'Manrope', Arial, sans-serif; background:#F2F2ED; padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e5e0;">
      <div style="background:#464B71;padding:20px 24px;">
        <span style="color:#fff;font-size:18px;font-weight:700;">${storeName}</span>
      </div>
      <div style="padding:24px;color:#2b2b2b;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#464B71;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:16px 24px;background:#F2F2ED;color:#777;font-size:12px;">
        This is an automated message from ${storeName}. Please do not reply directly to this email.
      </div>
    </div>
  </div>`;
}

function itemsTable(items) {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #eee;">${i.product_name} × ${i.quantity}</td>
        <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${money(i.line_total)}</td>
      </tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;">${rows}</table>`;
}

function orderSummaryBlock(order) {
  return `
    <p style="margin:0 0 4px;font-size:14px;">Order <strong>#${order.id}</strong></p>
    <p style="margin:0 0 12px;font-size:14px;color:#666;">Delivery address: ${order.delivery_address || "—"}</p>
    ${itemsTable(order.items || [])}
    <table style="width:100%;font-size:14px;margin-top:8px;">
      <tr><td>Subtotal</td><td style="text-align:right;">${money(order.subtotal)}</td></tr>
      <tr><td>Delivery</td><td style="text-align:right;">${order.delivery_fee ? money(order.delivery_fee) : "Free"}</td></tr>
      <tr><td style="font-weight:700;padding-top:6px;">Total</td><td style="text-align:right;font-weight:700;padding-top:6px;">${money(order.total)}</td></tr>
    </table>
    <p style="margin:12px 0 0;font-size:13px;color:#666;">Payment method: ${order.payment_method}</p>
    <p style="margin:2px 0 0;font-size:13px;color:#666;">Order status: ${order.status}</p>
  `;
}

const templates = {
  order_received: (storeName, order) =>
    baseLayout(
      storeName,
      "Your order has been received",
      `<p>Hi ${order.contact_name}, thanks for shopping with us! We've received your order.</p>${orderSummaryBlock(order)}`
    ),
  order_confirmed: (storeName, order) =>
    baseLayout(
      storeName,
      "Your order has been confirmed",
      `<p>Hi ${order.contact_name}, your order #${order.id} has been confirmed and is being prepared.</p>${orderSummaryBlock(order)}`
    ),
  payment_confirmed: (storeName, order) =>
    baseLayout(
      storeName,
      "Payment received",
      `<p>Hi ${order.contact_name}, we've verified your payment for order #${order.id}. Total paid: ${money(order.total)}.</p>`
    ),
  payment_rejected: (storeName, order) =>
    baseLayout(
      storeName,
      "We couldn't verify your payment",
      `<p>Hi ${order.contact_name}, we could not verify the payment proof submitted for order #${order.id}. Please check your payment details and re-submit valid proof, or contact us for help.</p>`
    ),
  out_for_delivery: (storeName, order) =>
    baseLayout(
      storeName,
      "Your order is out for delivery",
      `<p>Hi ${order.contact_name}, order #${order.id} is on its way to you.</p>`
    ),
  delivered: (storeName, order) =>
    baseLayout(
      storeName,
      "Your order has been delivered",
      `<p>Hi ${order.contact_name}, order #${order.id} has been delivered. Thank you for shopping with ${storeName}!</p>`
    ),
  cancelled: (storeName, order) =>
    baseLayout(
      storeName,
      "Your order was cancelled",
      `<p>Hi ${order.contact_name}, order #${order.id} has been cancelled. If this is unexpected, please contact us.</p>`
    ),
};

const SUBJECTS = {
  order_received: (order) => `Order Received — #${order.id}`,
  order_confirmed: (order) => `Order Confirmed — #${order.id}`,
  payment_confirmed: (order) => `Payment Confirmed — Order #${order.id}`,
  payment_rejected: (order) => `Payment Verification Issue — Order #${order.id}`,
  out_for_delivery: (order) => `Out for Delivery — Order #${order.id}`,
  delivered: (order) => `Delivered — Order #${order.id}`,
  cancelled: (order) => `Order Cancelled — #${order.id}`,
};

module.exports = { templates, SUBJECTS };
