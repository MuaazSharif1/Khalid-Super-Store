import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

export default function AdminCustomers() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.adminCustomers(token).then((d) => setCustomers(d.customers));
  }, [token]);

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Customers</h2>
      <div className="admin-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.order_count}</td>
                <td>Rs. {c.total_spent.toLocaleString()}</td>
                <td>{new Date(c.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p style={{ color: "var(--ink-soft)" }}>No customers yet.</p>}
      </div>
    </div>
  );
}
