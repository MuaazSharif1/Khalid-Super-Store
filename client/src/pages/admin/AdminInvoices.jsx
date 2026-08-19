import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import Receipt from "../../components/Receipt";

export default function AdminInvoices() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [store, setStore] = useState({});

  useEffect(() => {
    api.adminOrders({}, token).then((d) => setOrders(d.orders));
    api.getSiteSettings().then((d) => d.store && setStore(d.store)).catch(() => {});
  }, [token]);

  const filtered = search
    ? orders.filter(
        (o) =>
          String(o.id).includes(search) ||
          o.contact_name.toLowerCase().includes(search.toLowerCase()) ||
          o.contact_phone.includes(search)
      )
    : orders;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Invoices</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div>
          <div className="admin-toolbar">
            <input
              placeholder="Search order #, name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 260 }}
            />
          </div>
          <div className="admin-panel">
            <table className="admin-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Total</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.contact_name}</td>
                    <td>Rs. {o.total.toLocaleString()}</td>
                    <td>{new Date(o.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
                    <td><button className="icon-btn" onClick={() => setSelected(o)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {selected ? (
            <div className="admin-panel">
              <div className="receipt-frame">
                <Receipt order={selected} store={store} />
              </div>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={() => window.print()}>
                🖨️ Print Invoice
              </button>
            </div>
          ) : (
            <div className="admin-panel" style={{ textAlign: "center", color: "var(--ink-soft)" }}>
              Select an order to preview its invoice.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
