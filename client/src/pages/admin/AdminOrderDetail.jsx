import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api, { resolveImageUrl } from "../../api";
import Receipt from "../../components/Receipt";

const STATUSES = [
  "pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "completed", "cancelled",
];

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AdminOrderDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [notes, setNotes] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [store, setStore] = useState({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [error, setError] = useState("");

  function load() {
    api.adminGetOrder(id, token).then((d) => {
      setOrder(d.order);
      setNotes(d.order.admin_notes || "");
      setSecondsLeft(d.order.payment_seconds_remaining);
    });
  }

  useEffect(load, [id, token]);
  useEffect(() => {
    api.getSiteSettings().then((d) => d.store && setStore(d.store)).catch(() => {});
  }, []);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  if (!order) return <div>Loading order...</div>;

  async function updateStatus(status) {
    setBusy(true);
    setError("");
    try {
      await api.adminUpdateOrderStatus(id, status, statusNote, token);
      setStatusNote("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    setBusy(true);
    try {
      await api.adminUpdateOrderNotes(id, notes, token);
    } finally {
      setBusy(false);
    }
  }

  async function confirmPayment() {
    setBusy(true);
    setError("");
    try {
      await api.adminConfirmPayment(id, "Verified by admin", token);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function rejectPayment() {
    setBusy(true);
    setError("");
    try {
      await api.adminRejectPayment(id, "Could not verify screenshot", token);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <Link to="/admin/orders" style={{ fontSize: 13, color: "var(--ink-soft)" }}>← Back to Orders</Link>
          <h2 style={{ marginTop: 4 }}>Order #{order.id}</h2>
        </div>
        <span className={`badge badge-${order.status}`}>{order.status.replace(/_/g, " ")}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div>
          {/* Customer + order info */}
          <div className="admin-panel">
            <h3>Customer Information</h3>
            <p><strong>{order.contact_name}</strong></p>
            <p>{order.contact_phone}</p>
            {order.customer?.email && <p>{order.customer.email}</p>}
          </div>

          <div className="admin-panel">
            <h3>Order Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13.5 }}>
              <div><strong>Order Date:</strong> {new Date(order.created_at.replace(" ", "T") + "Z").toLocaleString()}</div>
              <div><strong>Fulfillment:</strong> {order.fulfillment_type === "delivery" ? "Home Delivery" : "Self Pickup"}</div>
              <div><strong>Payment Method:</strong> {order.payment_method}</div>
              <div><strong>Payment Status:</strong> {order.payment_status}</div>
            </div>
            {order.fulfillment_type === "delivery" && order.delivery_address && (
              <p style={{ marginTop: 10 }}><strong>Delivery Address:</strong> {order.delivery_address}</p>
            )}
          </div>

          {/* Items */}
          <div className="admin-panel">
            <h3>Order Items</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product (at time of order)</th>
                  <th>Price Charged</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>Rs. {item.unit_price.toLocaleString()}</td>
                    <td>{item.quantity}</td>
                    <td>Rs. {item.line_total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, textAlign: "right", fontSize: 14 }}>
              <div>Subtotal: Rs. {order.subtotal.toLocaleString()}</div>
              <div>Delivery: {order.delivery_fee ? `Rs. ${order.delivery_fee.toLocaleString()}` : "Free"}</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Total: Rs. {order.total.toLocaleString()}</div>
            </div>
          </div>

          {/* Payment verification */}
          {order.payment_method === "bank_transfer" && (
            <div className="admin-panel">
              <h3>Payment Verification</h3>
              {order.payment_screenshot ? (
                <>
                  <img
                    src={resolveImageUrl(order.payment_screenshot)}
                    alt="Payment screenshot"
                    style={{ maxWidth: 260, borderRadius: 8, border: "1px solid var(--line)", marginBottom: 12 }}
                  />
                  {order.payment_status === "pending_verification" && secondsLeft !== null && (
                    <p style={{ fontSize: 13, color: secondsLeft > 0 ? "#8a6100" : "#a3231b", marginBottom: 10 }}>
                      {secondsLeft > 0
                        ? <>Time remaining: <strong>{formatCountdown(secondsLeft)}</strong></>
                        : <>Verification time exceeded — please review manually.</>}
                    </p>
                  )}
                  {["pending", "pending_verification", "rejected"].includes(order.payment_status) && (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button className="btn btn-primary" onClick={confirmPayment} disabled={busy}>
                        Confirm Payment
                      </button>
                      <button className="btn" onClick={rejectPayment} disabled={busy}>
                        Reject Payment
                      </button>
                    </div>
                  )}
                  {order.payment_status === "paid" && (
                    <span className="status-pill status-good">Payment Received</span>
                  )}
                  {order.payment_verification_note && (
                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8 }}>
                      Note: {order.payment_verification_note}
                    </p>
                  )}
                </>
              ) : (
                <p style={{ color: "var(--ink-soft)" }}>Customer hasn't uploaded a payment screenshot yet.</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="admin-panel">
            <h3>Internal Notes</h3>
            <textarea
              rows={3}
              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes visible only to admin staff..."
            />
            <button className="btn" style={{ marginTop: 8 }} onClick={saveNotes} disabled={busy}>
              Save Notes
            </button>
          </div>
        </div>

        <div>
          {/* Status control */}
          <div className="admin-panel">
            <h3>Update Status</h3>
            <select
              value={order.status}
              onChange={(e) => updateStatus(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid var(--line)", marginBottom: 8 }}
              disabled={busy}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input
              placeholder="Optional note for this status change"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid var(--line)" }}
            />
          </div>

          {/* Timeline */}
          <div className="admin-panel">
            <h3>Order Status Timeline</h3>
            <div className="timeline">
              {order.status_history.map((h) => (
                <div className="timeline-item" key={h.id}>
                  <div className="timeline-status">{h.status.replace(/_/g, " ")}</div>
                  <div className="timeline-time">{new Date(h.changed_at.replace(" ", "T") + "Z").toLocaleString()}</div>
                  {h.note && <div className="timeline-note">{h.note}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Invoice */}
          <div className="admin-panel">
            <h3>Invoice</h3>
            <button className="btn" onClick={() => setShowReceipt((s) => !s)} style={{ width: "100%" }}>
              {showReceipt ? "Hide Invoice" : "Preview Invoice"}
            </button>
            {showReceipt && (
              <>
                <div className="receipt-frame" style={{ marginTop: 12 }}>
                  <Receipt order={order} store={store} />
                </div>
                <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={() => window.print()}>
                  🖨️ Print Invoice
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
