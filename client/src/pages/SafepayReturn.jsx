import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import api from "../api";

export default function SafepayReturn() {
  const [params] = useSearchParams();
  const { token } = useAuth();
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const orderId = params.get("order_id");
  const [message, setMessage] = useState("Verifying your Safepay payment…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!orderId || !token) return;

    let attempts = 0;
    let timer;

    async function verify() {
      try {
        const result = await api.safepayStatus(orderId, token);

        if (result.payment_status === "paid") {
          clearCart();
          navigate(`/order/${orderId}`, { state: { order: result.order }, replace: true });
          return;
        }

        attempts += 1;
        if (attempts < 8) {
          setMessage("Payment is being confirmed securely. Please wait…");
          timer = window.setTimeout(verify, 1500);
        } else {
          setMessage("We could not confirm the payment yet. Your order is still saved.");
          setFailed(true);
        }
      } catch (err) {
        attempts += 1;
        if (attempts < 8) {
          timer = window.setTimeout(verify, 1500);
        } else {
          setMessage(err.message || "Payment verification is temporarily unavailable.");
          setFailed(true);
        }
      }
    }

    verify();
    return () => window.clearTimeout(timer);
  }, [orderId, token, navigate, clearCart]);

  return (
    <div className="container page" style={{ maxWidth: 640 }}>
      <div className="card payment-result">
        <div className="payment-seal">{failed ? "!" : "K"}</div>
        <h2>{failed ? "Payment Verification Pending" : "Confirming Your Payment"}</h2>
        <p>{message}</p>
        {orderId && <p className="mono-note">Order #{orderId}</p>}
        {failed && (
          <Link to={`/order/${orderId}`} className="btn btn-primary" style={{ marginTop: 16 }}>
            View Order
          </Link>
        )}
      </div>
    </div>
  );
}
