import React from "react";

function money(n) {
  return `Rs. ${Number(n || 0).toLocaleString()}`;
}

const PAYMENT_STATUS_LABEL = {
  unpaid: "Unpaid",
  pending: "Payment Pending",
  pending_verification: "Verification Pending",
  paid: "Paid",
  rejected: "Payment Rejected",
  failed: "Payment Failed",
};

// A small grocery-store style thermal receipt — intentionally NOT an A4
// invoice, and intentionally without product images (spec §9).
// Wrap usage: <Receipt order={order} store={storeSettings} width="80mm" />
// Print it with: window.print() — only #receipt-print-area is visible in
// print media (see the print rules in global.css).
export default function Receipt({ order, store = {}, width = "80mm" }) {
  if (!order) return null;
  const storeName = store.name || "Khalid Super Store";
  const created = new Date(order.created_at?.replace(" ", "T") + "Z");

  return (
    <div id="receipt-print-area" className="receipt" style={{ width, maxWidth: width }}>
      <div className="receipt-center receipt-strong receipt-title">{storeName}</div>
      {store.address && <div className="receipt-center receipt-small">{store.address}</div>}
      {store.phone && <div className="receipt-center receipt-small">{store.phone}</div>}

      <div className="receipt-divider" />

      <div className="receipt-row">
        <span>Order</span>
        <span>#{order.id}</span>
      </div>
      <div className="receipt-row">
        <span>Date</span>
        <span>{created.toLocaleDateString()}</span>
      </div>
      <div className="receipt-row">
        <span>Time</span>
        <span>{created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      <div className="receipt-divider" />

      <div className="receipt-small receipt-strong">Customer</div>
      <div className="receipt-small">{order.contact_name}</div>
      <div className="receipt-small">{order.contact_phone}</div>
      {order.fulfillment_type === "delivery" && order.delivery_address && (
        <div className="receipt-small">{order.delivery_address}</div>
      )}
      {order.fulfillment_type === "pickup" && <div className="receipt-small">Self Pickup</div>}

      <div className="receipt-divider" />

      <div className="receipt-row receipt-strong receipt-small">
        <span>ITEM</span>
        <span>QTY&nbsp;&nbsp;&nbsp;PRICE</span>
      </div>
      <div className="receipt-divider-dashed" />
      {order.items?.map((item) => (
        <div className="receipt-item" key={item.id}>
          <div className="receipt-item-name">{item.product_name}</div>
          <div className="receipt-row receipt-small">
            <span>&nbsp;</span>
            <span>{item.quantity} × {money(item.unit_price)} = {money(item.line_total)}</span>
          </div>
        </div>
      ))}
      <div className="receipt-divider-dashed" />

      <div className="receipt-row">
        <span>Subtotal</span>
        <span>{money(order.subtotal)}</span>
      </div>
      <div className="receipt-row">
        <span>{order.fulfillment_type === "pickup" ? "Pickup Fee" : "Delivery"}</span>
        <span>{order.delivery_fee ? money(order.delivery_fee) : "Free"}</span>
      </div>
      <div className="receipt-row receipt-strong receipt-total">
        <span>TOTAL</span>
        <span>{money(order.total)}</span>
      </div>

      <div className="receipt-divider" />

      <div className="receipt-row receipt-small">
        <span>Payment</span>
        <span>{order.payment_method === "bank_transfer" ? "Bank Transfer" : order.payment_method === "safepay" ? "Online (Safepay)" : "Cash"}</span>
      </div>
      <div className="receipt-row receipt-small">
        <span>Status</span>
        <span>{PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status}</span>
      </div>

      <div className="receipt-divider" />
      <div className="receipt-center receipt-small" style={{ marginTop: 8 }}>
        Thank you for shopping with {storeName}!
      </div>
    </div>
  );
}
