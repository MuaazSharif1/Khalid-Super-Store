import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api, { resolveImageUrl } from "../api";

export default function Header() {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [store, setStore] = useState({});
  const [delivery, setDelivery] = useState({ free_delivery_threshold: 3000 });
  const { itemCount, fulfillment, setFulfillment } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getCategories().then((d) => setCategories(d.categories)).catch(() => {});
    api
      .getSiteSettings()
      .then((d) => {
        if (d.store) setStore(d.store);
        if (d.delivery) setDelivery(d.delivery);
      })
      .catch(() => {});
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      <div className="utility-bar">
        <div className="container">
          <span>🚚 Free delivery on orders over Rs. {Number(delivery.free_delivery_threshold || 3000).toLocaleString()}</span>
          <div className="fulfillment-toggle">
            <button
              className={fulfillment === "delivery" ? "active" : ""}
              onClick={() => setFulfillment("delivery")}
            >
              Home Delivery
            </button>
            <button
              className={fulfillment === "pickup" ? "active" : ""}
              onClick={() => setFulfillment("pickup")}
            >
              Self Pickup
            </button>
          </div>
        </div>
      </div>

    <header className="site-header">
  <div className="container header-row">
    <Link to="/" className="brand">
      
      <span className="brand-mark">
        <img
          src={store.logo ? resolveImageUrl(store.logo) : "/khalid_logo.png"}
          alt={`${store.name || "Khalid Super Store"} Logo`}
        />
      </span>

      <span>
        <span className="brand-name" style={{ display: "block" }}>
          {store.name || "Khalid Super Store"}
        </span>

        <span className="brand-tag">
          Fresh &middot; Trusted &middot; Local
        </span>
      </span>

    </Link>
        <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for atta, milk, rice, snacks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="header-actions">
            {user ? (
              <>
                <Link to="/account">Hi, {user.name.split(" ")[0]}</Link>
                {user.role === "admin" && <Link to="/admin">Admin</Link>}
                <button className="linklike" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login">Login</Link>
            )}
            <Link to="/cart" className="cart-pill">
              🛒 Cart
              {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      <nav className="category-strip">
        <div className="container">
          {categories.map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`}>
              {c.icon} {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
