import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function Checkout() {
  const { items, subtotal, clearCart, fulfillment, setFulfillment } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [contactName, setContactName] = useState(user?.name || "");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState({
    first_name: user?.name?.split(" ")[0] || "",
    last_name: "",
    city: "Lahore",
    area: "",
    address_line: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState({ fee: 150, free_delivery_threshold: 3000 });
  const [paymentSettings, setPaymentSettings] = useState(null);

  useEffect(() => {
    api.getStores().then((d) => {
      setStores(d.stores);
      if (d.stores[0]) setStoreId(d.stores[0].id);
    });
    api.getSiteSettings().then((d) => {
      if (d.delivery) setDeliverySettings(d.delivery);
      if (d.payment) setPaymentSettings(d.payment);
    });
  }, []);

  useEffect(() => {
    if (items.length === 0) navigate("/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const DELIVERY_FEE = Number(deliverySettings.fee) || 150;
  const FREE_DELIVERY_THRESHOLD = Number(deliverySettings.free_delivery_threshold) || 3000;
  const deliveryFee = fulfillment === "delivery" && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  // Spec §11: an unauthenticated customer must log in / register before
  // checking out. The cart already lives in localStorage (CartContext), so
  // nothing is lost — we just send them to auth and back to /checkout.
  if (!user) {
    return (
      <div className="container page">
        <div className="card" style={{ maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
          <h2 style={{ marginBottom: 10 }}>Please sign in to continue</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>
            Please login or create an account before placing your order. Your cart will be waiting for you.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link className="btn btn-primary" to="/login" state={{ from: "/checkout" }}>
              Log In
            </Link>
            <Link className="btn" to="/register" state={{ from: "/checkout" }}>
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError("");

    if (!contactName || !contactPhone) {
      setError("Please provide your name and phone number.");
      return;
    }
    if (fulfillment === "delivery" && (!address.address_line || !address.first_name)) {
      setError("Please complete your delivery address.");
      return;
    }
    if (fulfillment === "pickup" && !storeId) {
      setError("Please select a pickup store.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        fulfillment_type: fulfillment,
        store_id: fulfillment === "pickup" ? storeId : undefined,
        address: fulfillment === "delivery" ? address : undefined,
        contact_name: contactName,
        contact_phone: contactPhone,
        payment_method: paymentMethod,
      };

      if (paymentMethod === "safepay") {
        const { checkout_url } = await api.createSafepaySession(payload, token);
        window.location.assign(checkout_url);
        return;
      }

      const { order } = await api.createOrder(payload, token);
      clearCart();
      navigate(`/order/${order.id}`, { state: { order } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container page">
      <h2 style={{ marginBottom: 20 }}>Checkout</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="cart-layout">
        <form className="card" onSubmit={handlePlaceOrder}>
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>How would you like your order?</h3>
          <div className="fulfillment-picker">
            <button
              type="button"
              className={fulfillment === "delivery" ? "active" : ""}
              onClick={() => setFulfillment("delivery")}
            >
              🚚 Home Delivery
              <div style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-soft)" }}>
                Free above Rs. {FREE_DELIVERY_THRESHOLD.toLocaleString()}
              </div>
            </button>
            <button
              type="button"
              className={fulfillment === "pickup" ? "active" : ""}
              onClick={() => setFulfillment("pickup")}
            >
              🏬 Self Pickup
              <div style={{ fontWeight: 400, fontSize: 12, color: "var(--ink-soft)" }}>
                Ready in ~45 min
              </div>
            </button>
          </div>

          <div className="form-row">
            <label>Contact Name</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Contact Phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} required />
          </div>

          {fulfillment === "delivery" ? (
            <>
              <div className="two-col">
                <div className="form-row">
                  <label>First Name</label>
                  <input
                    value={address.first_name}
                    onChange={(e) => setAddress({ ...address, first_name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <label>Last Name</label>
                  <input
                    value={address.last_name}
                    onChange={(e) => setAddress({ ...address, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="two-col">
                <div className="form-row">
                  <label>City</label>
                  <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Area</label>
                  <input value={address.area} onChange={(e) => setAddress({ ...address, area: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <label>Full Address</label>
                <textarea
                  rows={3}
                  value={address.address_line}
                  onChange={(e) => setAddress({ ...address, address_line: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--ink-soft)" }}>
                Choose a store for pickup
              </label>
              <div style={{ marginTop: 8 }}>
                {stores.map((s) => (
                  <div
                    key={s.id}
                    className={`store-option ${storeId === s.id ? "active" : ""}`}
                    onClick={() => setStoreId(s.id)}
                  >
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                      {s.address}, {s.city} &middot; {s.opens_at}–{s.closes_at}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ fontSize: 16, margin: "20px 0 10px" }}>Payment</h3>
          <div className="payment-method-grid">
            <button
              type="button"
              className={paymentMethod === "cod" ? "payment-method active" : "payment-method"}
              onClick={() => setPaymentMethod("cod")}
            >
              <span className="payment-method-title">Cash on Delivery / Pickup</span>
              <span className="payment-method-note">Pay when your order arrives or is collected.</span>
            </button>
            <button
              type="button"
              className={paymentMethod === "safepay" ? "payment-method active" : "payment-method"}
              onClick={() => setPaymentMethod("safepay")}
            >
              <span className="payment-method-title">Pay Online with Safepay</span>
              <span className="payment-method-note">Secure hosted checkout for cards and supported local methods.</span>
            </button>
            <button
              type="button"
              className={paymentMethod === "bank_transfer" ? "payment-method active" : "payment-method"}
              onClick={() => setPaymentMethod("bank_transfer")}
            >
              <span className="payment-method-title">Online Bank Transfer</span>
              <span className="payment-method-note">Transfer manually, then upload your payment screenshot.</span>
            </button>
          </div>

          {paymentMethod === "bank_transfer" && paymentSettings && (
            <div className="bank-details-box">
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Transfer to:</div>
              {paymentSettings.bank_name && <div>Bank: {paymentSettings.bank_name}</div>}
              {paymentSettings.account_title && <div>Account Title: {paymentSettings.account_title}</div>}
              {paymentSettings.account_number && <div>Account Number: {paymentSettings.account_number}</div>}
              {paymentSettings.iban && <div>IBAN: {paymentSettings.iban}</div>}
              <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-soft)" }}>
                {paymentSettings.instructions ||
                  "After placing your order you'll be asked to upload a screenshot of your payment."}
              </p>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }} disabled={submitting}>
            {submitting
              ? "Opening Secure Checkout..."
              : paymentMethod === "safepay"
              ? `Pay Securely — Rs. ${total.toLocaleString()}`
              : `Place Order — Rs. ${total.toLocaleString()}`}
          </button>
        </form>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Order Summary</h3>
          {items.map((i) => (
            <div key={i.product.id} className="summary-row">
              <span>{i.product.name} x {i.quantity}</span>
              <span>Rs. {(i.product.price * i.quantity).toLocaleString()}</span>
            </div>
          ))}
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
        </div>
      </div>
    </div>
  );
}
