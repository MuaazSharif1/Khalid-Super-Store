import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import PaymentScreenshotUpload from "../components/PaymentScreenshotUpload";
import Receipt from "../components/Receipt";

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  completed: "Delivered",
  cancelled: "Cancelled",
};

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const { token } = useAuth();
  const [order, setOrder] = useState(location.state?.order || null);
  const [store, setStore] = useState({});
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!order && token) {
      api.getOrder(id, token).then((d) => setOrder(d.order)).catch(() => {});
    }
  }, [id, order, token]);

  useEffect(() => {
    api.getSiteSettings().then((d) => d.store && setStore(d.store)).catch(() => {});
  }, []);

  if (!order) {
    return (
      <div className="container page">
        <h2>Order Placed!</h2>
        <p>
          Your order number is <strong>#{id}</strong>. Thank you for shopping with Khalid Super
          Store.
        </p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="card" style={{ maxWidth: 640 }}>
        <span className="success-banner">Order #{order.id} confirmed ✓</span>
        <h2 style={{ fontSize: 26, marginBottom: 8 }}>Thank you, {order.contact_name}!</h2>
        <p style={{ marginBottom: 8 }}>
          {order.fulfillment_type === "delivery"
            ? "We're preparing your order for delivery."
            : "Your order will be ready for pickup shortly."}
        </p>
        <p style={{ marginBottom: 20, fontSize: 13, color: "var(--ink-soft)" }}>
          Order status: <strong>{STATUS_LABEL[order.status] || order.status}</strong>
        </p>

        {order.items?.map((item) => (
          <div className="summary-row" key={item.id}>
            <span>{item.product_name} x {item.quantity}</span>
            <span>Rs. {item.line_total.toLocaleString()}</span>
          </div>
        ))}
        <div className="summary-row">
          <span>Subtotal</span>
          <span>Rs. {order.subtotal.toLocaleString()}</span>
        </div>
        <div className="summary-row">
          <span>Delivery / Pickup fee</span>
          <span>{order.delivery_fee === 0 ? "Free" : `Rs. ${order.delivery_fee}`}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>Rs. {order.total.toLocaleString()}</span>
        </div>

        <PaymentScreenshotUpload order={order} onUpdated={setOrder} />

        <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
          <Link to="/" className="btn btn-primary">
            Continue Shopping
          </Link>
          <Link to="/account" className="btn">
            View My Orders
          </Link>
          <button type="button" className="btn" onClick={() => setShowReceipt((s) => !s)}>
            {showReceipt ? "Hide Invoice" : "View Invoice"}
          </button>
        </div>

        {showReceipt && (
          <div style={{ marginTop: 20 }}>
            <div className="receipt-frame">
              <Receipt order={order} store={store} />
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => window.print()}>
              🖨️ Print Invoice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
