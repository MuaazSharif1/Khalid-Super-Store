import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { resolveImageUrl } from "../api";
import PaymentScreenshotUpload from "../components/PaymentScreenshotUpload";
import Receipt from "../components/Receipt";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  ready_for_pickup: "Ready for Pickup",
  completed: "Delivered",
  cancelled: "Cancelled",
};

export default function Account() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [invoiceFor, setInvoiceFor] = useState(null);
  const [store, setStore] = useState({});

  function load() {
    api.myOrders(token).then((d) => setOrders(d.orders)).finally(() => setLoading(false));
  }

  useEffect(load, [token]);
  useEffect(() => {
    api.getSiteSettings().then((d) => d.store && setStore(d.store)).catch(() => {});
  }, []);

  function updateOrderInList(updated) {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
  }

  return (
    <div className="container page">
      <h2 style={{ marginBottom: 8 }}>My Account</h2>
      <p style={{ marginBottom: 24, color: "var(--ink-soft)" }}>
        {user.name} &middot; {user.email}
      </p>

      <h3 style={{ fontSize: 18, marginBottom: 14 }}>My Orders</h3>
      {loading && <p>Loading orders...</p>}
      {!loading && orders.length === 0 && <p>You haven't placed any orders yet.</p>}

      {orders.map((order) => (
        <div className="card" key={order.id} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <strong>Order #{order.id}</strong>
              <span style={{ marginLeft: 10, fontSize: 12, color: "var(--ink-soft)" }}>
                {new Date(order.created_at.replace(" ", "T") + "Z").toLocaleString()}
              </span>
            </div>
            <span className={`status-badge ${order.status}`}>{STATUS_LABELS[order.status]}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 8 }}>
            {order.fulfillment_type === "delivery" ? "Home Delivery" : "Self Pickup"} &middot; Rs. {order.total.toLocaleString()}
            <br />
            Payment: {order.payment_method === "safepay" ? "Safepay Online" : order.payment_method === "bank_transfer" ? "Bank Transfer" : "Cash on Delivery / Pickup"}
            {order.payment_method !== "cod" && ` · ${order.payment_status || "pending"}`}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <button className="btn" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
              {expanded === order.id ? "Hide Items" : "View Order"}
            </button>
            <button className="btn" onClick={() => setInvoiceFor(invoiceFor === order.id ? null : order.id)}>
              {invoiceFor === order.id ? "Hide Invoice" : "View Invoice"}
            </button>
          </div>

          {expanded === order.id && (
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              {order.items.map((item) => (
                <div className="summary-row" key={item.id}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="table-thumb" style={{ width: 32, height: 32 }}>
                      {item.product_image ? (
                        <img src={resolveImageUrl(item.product_image)} alt="" />
                      ) : (
                        "🛒"
                      )}
                    </span>
                    {item.product_name} x {item.quantity}
                  </span>
                  <span>Rs. {item.line_total.toLocaleString()}</span>
                </div>
              ))}
              {order.fulfillment_type === "delivery" && order.delivery_address && (
                <p style={{ fontSize: 13, marginTop: 8 }}>
                  <strong>Delivery Address:</strong> {order.delivery_address}
                </p>
              )}
              <PaymentScreenshotUpload order={order} onUpdated={updateOrderInList} />
            </div>
          )}

          {invoiceFor === order.id && (
            <div style={{ marginTop: 10 }}>
              <div className="receipt-frame">
                <Receipt order={order} store={store} />
              </div>
              <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => window.print()}>
                🖨️ Print / Download Invoice
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
