import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div className="admin-nav-brand">
          <span className="admin-nav-brand-mark">KS</span>
          <span>
            <span className="admin-nav-brand-name">Khalid Super Store</span>
            <span className="admin-nav-brand-sub">Admin Panel</span>
          </span>
        </div>

        <Link to="/" className="admin-visit-site">
          🌐 Visit Website
        </Link>

        <div className="admin-nav-links">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/orders" className={({ isActive }) => (isActive ? "active" : "")}>
            Orders
          </NavLink>
          <NavLink to="/admin/products" className={({ isActive }) => (isActive ? "active" : "")}>
            Products
          </NavLink>
          <NavLink to="/admin/categories" className={({ isActive }) => (isActive ? "active" : "")}>
            Categories
          </NavLink>
          <NavLink to="/admin/customers" className={({ isActive }) => (isActive ? "active" : "")}>
            Customers
          </NavLink>
          <NavLink to="/admin/media" className={({ isActive }) => (isActive ? "active" : "")}>
            Media
          </NavLink>
          <NavLink to="/admin/homepage" className={({ isActive }) => (isActive ? "active" : "")}>
            Homepage
          </NavLink>
          <NavLink to="/admin/payments" className={({ isActive }) => (isActive ? "active" : "")}>
            Payments
          </NavLink>
          <NavLink to="/admin/invoices" className={({ isActive }) => (isActive ? "active" : "")}>
            Invoices
          </NavLink>
          <NavLink to="/admin/settings" className={({ isActive }) => (isActive ? "active" : "")}>
            Settings
          </NavLink>
        </div>

        <div className="admin-nav-footer">
          {user && <div className="admin-nav-user">Logged in as {user.name}</div>}
          <button className="admin-logout-btn" onClick={handleLogout}>
            ⎋ Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
