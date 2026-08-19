import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

const STATUSES = [
  "pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "completed", "cancelled",
];

export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .adminOrders({ ...(status ? { status } : {}), ...(search ? { search } : {}) }, token)
      .then((d) => setOrders(d.orders))
      .finally(() => setLoading(false));
  }

  useEffect(load, [token, status]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    load();
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Orders</h2>

      <form className="admin-toolbar" onSubmit={handleSearchSubmit}>
        <input
          placeholder="Search by order #, name or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button className="btn" type="submit">Search</button>
      </form>

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="admin-panel" style={{ textAlign: "center", color: "var(--ink-soft)" }}>
          No orders match your filters.
        </div>
      ) : (
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>
                    {o.contact_name}
                    <br />
                    <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{o.contact_phone}</span>
                  </td>
                  <td>{o.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}</td>
                  <td>Rs. {o.total.toLocaleString()}</td>
                  <td>
                    <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{o.payment_method.replace("_", " ")}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{o.payment_status}</div>
                  </td>
                  <td><span className={`badge badge-${o.status}`}>{o.status.replace(/_/g, " ")}</span></td>
                  <td>{new Date(o.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
                  <td>
                    <Link className="icon-btn" to={`/admin/orders/${o.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
