import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { resolveImageUrl } from "../api";

const DELIVERY_FEE = 150;
const FREE_DELIVERY_THRESHOLD = 3000;

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, fulfillment } = useCart();
  const navigate = useNavigate();

  const deliveryFee = fulfillment === "delivery" && subtotal < FREE_DELIVERY_THRESHOLD && subtotal > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="container page">
        <h2 style={{ marginBottom: 12 }}>Your Cart</h2>
        <p style={{ marginBottom: 20 }}>Your cart is empty. Let's fix that.</p>
        <Link to="/" className="btn btn-primary">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <h2 style={{ marginBottom: 20 }}>Your Cart</h2>
      <div className="cart-layout">
        <div className="card">
          {items.map(({ product, quantity }) => (
            <div className="cart-line" key={product.id}>
              <div className="thumb">{product.image ? <img src={resolveImageUrl(product.image)} alt="" /> : "🛒"}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{product.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  {product.unit} &middot; Rs. {product.price.toLocaleString()}
                </div>
              </div>
              <div className="qty-control">
                <button onClick={() => updateQuantity(product.id, quantity - 1)}>-</button>
                <span style={{ minWidth: 20, textAlign: "center" }}>{quantity}</span>
                <button onClick={() => updateQuantity(product.id, quantity + 1)}>+</button>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>Rs. {(product.price * quantity).toLocaleString()}</div>
                <button className="icon-btn danger" onClick={() => removeItem(product.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 18, marginBottom: 14 }}>Order Summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div className="summary-row">
            <span>{fulfillment === "pickup" ? "Pickup fee" : "Delivery fee"}</span>
            <span>{deliveryFee === 0 ? "Free" : `Rs. ${deliveryFee}`}</span>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>Rs. {total.toLocaleString()}</span>
          </div>
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={() => navigate("/checkout")}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
