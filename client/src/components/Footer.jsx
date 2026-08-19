import React, { useEffect, useState } from "react";
import api from "../api";

export default function Footer() {
  const [store, setStore] = useState({});
  const [delivery, setDelivery] = useState({});

  useEffect(() => {
    api
      .getSiteSettings()
      .then((d) => {
        if (d.store) setStore(d.store);
        if (d.delivery) setDelivery(d.delivery);
      })
      .catch(() => {});
  }, []);

  const storeName = store.name || "Khalid Super Store";

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>{storeName}</h4>
            <p style={{ fontSize: 13, maxWidth: "32ch" }}>
              Your neighbourhood grocery store, now online. Fresh produce, everyday
              essentials, and honest prices — delivered or ready for pickup.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <a href="/">Home</a>
            <a href="/search?q=">All Products</a>
            <a href="/cart">Cart</a>
          </div>
          <div>
            <h4>Account</h4>
            <a href="/login">Login</a>
            <a href="/register">Create Account</a>
            <a href="/account">Order History</a>
          </div>
          <div>
            <h4>Delivery Area</h4>
            <p style={{ fontSize: 13, margin: "0 0 12px", maxWidth: "24ch" }}>
              {store.delivery_info || "Home delivery within 5–6 km. Currently serving Mozang and surrounding neighbourhoods."}
              {delivery.estimated_time && ` Estimated delivery time: ${delivery.estimated_time}.`}
            </p>
            <h4>Get in Touch</h4>
            {store.phone && <a href={`tel:${store.phone.replace(/\s+/g, "")}`}>{store.phone}</a>}
            {store.email && <a href={`mailto:${store.email}`}>{store.email}</a>}
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</span>
          <span>Built for the neighbourhood.</span>
        </div>
      </div>
    </footer>
  );
}
