import React from "react";
import { Link, useSearchParams } from "react-router-dom";

export default function SafepayCancel() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");

  return (
    <div className="container page" style={{ maxWidth: 640 }}>
      <div className="card payment-result">
        <div className="payment-seal">×</div>
        <h2>Payment Cancelled</h2>
        <p>Your Safepay checkout was cancelled. Your order has not been marked as paid.</p>
        {orderId && <p className="mono-note">Order #{orderId}</p>}
        <Link to="/checkout" className="btn btn-primary" style={{ marginTop: 16 }}>
          Return to Checkout
        </Link>
      </div>
    </div>
  );
}
