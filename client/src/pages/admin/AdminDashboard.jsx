import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";

const STATUS_COLORS = {
  pending: "#fce803",
  confirmed: "#fc2003",
  preparing: "#fc7d03",
  out_for_delivery: "#0a0303",
  ready_for_pickup: "#5c5555",
  completed: "#1f8a3a",
  cancelled: "#b8b6b4",
};

function StatusLabel(status) {
  return status
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.adminStats(token).then(setStats);
  }, [token]);

  if (!stats) return <p>Loading dashboard...</p>;

  const s = stats.statusCounts;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Dashboard</h2>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="num">{stats.orderCount}</div>
          <div className="label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="num">{s.pending}</div>
          <div className="label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="num">{s.confirmed}</div>
          <div className="label">Confirmed</div>
        </div>
        <div className="stat-card">
          <div className="num">{s.preparing}</div>
          <div className="label">Preparing</div>
        </div>
        <div className="stat-card">
          <div className="num">{s.out_for_delivery}</div>
          <div className="label">Out for Delivery</div>
        </div>
        <div className="stat-card">
          <div className="num">{s.completed}</div>
          <div className="label">Delivered</div>
        </div>
        <div className="stat-card">
          <div className="num">{s.cancelled}</div>
          <div className="label">Cancelled</div>
        </div>
        <div className="stat-card">
          <div className="num">Rs. {stats.revenue.toLocaleString()}</div>
          <div className="label">Total Sales</div>
        </div>
        <div className="stat-card">
          <div className="num">Rs. {stats.todaySales.toLocaleString()}</div>
          <div className="label">Today's Sales</div>
        </div>
        <div className="stat-card">
          <div className="num">Rs. {stats.monthlySales.toLocaleString()}</div>
          <div className="label">Monthly Sales</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.customerCount}</div>
          <div className="label">Total Customers</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.productCount}</div>
          <div className="label">Products</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.lowStock}</div>
          <div className="label">Low-Stock Products</div>
        </div>
        <div className="stat-card">
          <div className="num">{stats.outOfStock}</div>
          <div className="label">Out-of-Stock Products</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.salesByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,3,3,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#5c5555" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#5c5555" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, "Revenue"]}
                contentStyle={{ borderRadius: 8, border: "1px solid rgba(10,3,3,0.15)", fontSize: 13 }}
              />
              <Bar dataKey="revenue" fill="#fc2003" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Orders by Status</h3>
          {stats.ordersByStatus.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {stats.ordersByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#5c5555"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, StatusLabel(name)]} />
                <Legend
                  formatter={(value) => StatusLabel(value)}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <h3 style={{ fontSize: 16, margin: "28px 0 12px" }}>Recent Orders</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Type</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {stats.recentOrders.map((o) => (
            <tr key={o.id}>
              <td><Link to={`/admin/orders/${o.id}`}>#{o.id}</Link></td>
              <td>{o.fulfillment_type}</td>
              <td>Rs. {o.total.toLocaleString()}</td>
              <td><span className={`status-badge ${o.status}`}>{o.status}</span></td>
              <td>{new Date(o.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ fontSize: 16, margin: "28px 0 12px" }}>Recent Customers</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {stats.recentCustomers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{new Date(c.created_at.replace(" ", "T") + "Z").toLocaleDateString()}</td>
            </tr>
          ))}
          {stats.recentCustomers.length === 0 && (
            <tr><td colSpan={3} style={{ color: "var(--ink-soft)" }}>No customers yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
