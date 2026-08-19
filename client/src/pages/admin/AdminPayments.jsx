import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api, { resolveImageUrl } from "../../api";

export default function AdminPayments() {
  const { token } = useAuth();
  const [payment, setPayment] = useState(null);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function loadQueue() {
    api.adminOrders({}, token).then((d) =>
      setOrders(
        d.orders.filter(
          (o) => o.payment_method === "bank_transfer" && ["pending", "pending_verification"].includes(o.payment_status)
        )
      )
    );
  }

  useEffect(() => {
    api.adminGetSettings(token).then((d) => setPayment(d.settings.payment));
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!payment) return <div>Loading...</div>;

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.adminUpdateSettings("payment", payment, token);
      setPayment(updated.value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Payments</h2>

      <div className="admin-panel">
        <h3>Bank Transfer Details (shown to customers at checkout)</h3>
        <div style={{ maxWidth: 480 }}>
          <div className="form-row"><label>Bank Name</label>
            <input value={payment.bank_name} onChange={(e) => setPayment({ ...payment, bank_name: e.target.value })} />
          </div>
          <div className="form-row"><label>Account Title</label>
            <input value={payment.account_title} onChange={(e) => setPayment({ ...payment, account_title: e.target.value })} />
          </div>
          <div className="form-row"><label>Account Number</label>
            <input value={payment.account_number} onChange={(e) => setPayment({ ...payment, account_number: e.target.value })} />
          </div>
          <div className="form-row"><label>IBAN</label>
            <input value={payment.iban} onChange={(e) => setPayment({ ...payment, iban: e.target.value })} />
          </div>
          <div className="form-row"><label>Payment Instructions</label>
            <textarea rows={2} value={payment.instructions} onChange={(e) => setPayment({ ...payment, instructions: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>

      <div className="admin-panel">
        <h3>Awaiting Verification ({orders.length})</h3>
        {orders.length === 0 ? (
          <p style={{ color: "var(--ink-soft)" }}>No bank-transfer payments waiting for review.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Screenshot</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>{o.contact_name}</td>
                  <td>Rs. {o.total.toLocaleString()}</td>
                  <td>
                    {o.payment_screenshot ? (
                      <img src={resolveImageUrl(o.payment_screenshot)} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }} />
                    ) : (
                      <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>Not uploaded</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{o.payment_submitted_at || "—"}</td>
                  <td><Link className="icon-btn" to={`/admin/orders/${o.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
