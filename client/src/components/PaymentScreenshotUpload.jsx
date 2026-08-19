import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api, { resolveImageUrl } from "../api";

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const STATUS_LABEL = {
  unpaid: { label: "Unpaid", tone: "neutral" },
  pending: { label: "Payment Pending", tone: "warn" },
  pending_verification: { label: "Verification Pending", tone: "warn" },
  paid: { label: "Payment Received", tone: "good" },
  rejected: { label: "Payment Rejected", tone: "bad" },
  failed: { label: "Payment Failed", tone: "bad" },
};

export default function PaymentScreenshotUpload({ order, onUpdated }) {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(order.payment_seconds_remaining);

  useEffect(() => {
    setSecondsLeft(order.payment_seconds_remaining);
  }, [order.payment_seconds_remaining]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  if (order.payment_method !== "bank_transfer") return null;

  const status = STATUS_LABEL[order.payment_status] || { label: order.payment_status, tone: "neutral" };

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { order: updated } = await api.uploadPaymentScreenshot(order.id, file, token);
      onUpdated?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="payment-proof-box">
      <div className="payment-proof-header">
        <span>Bank Transfer Payment</span>
        <span className={`status-pill status-${status.tone}`}>{status.label}</span>
      </div>

      {order.payment_status === "pending_verification" && secondsLeft !== null && (
        <p className="payment-proof-timer">
          {secondsLeft > 0 ? (
            <>Verification window: <strong>{formatCountdown(secondsLeft)}</strong> remaining</>
          ) : (
            <>Verification time exceeded — the store will review it manually.</>
          )}
        </p>
      )}

      {order.payment_screenshot ? (
        <div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 8 }}>
            Screenshot submitted{order.payment_submitted_at ? ` at ${order.payment_submitted_at}` : ""}.
          </p>
          <img
            src={resolveImageUrl(order.payment_screenshot)}
            alt="Payment proof"
            style={{ maxWidth: 220, borderRadius: 8, border: "1px solid var(--line)" }}
          />
          {order.payment_status === "rejected" && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 13, color: "var(--danger, #c0392b)", marginBottom: 6 }}>
                Your payment could not be verified. Please upload a new screenshot.
              </p>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Uploading..." : "Re-upload"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 8 }}>
            Please upload a screenshot of your bank transfer to confirm your payment.
          </p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload Payment Screenshot"}
          </button>
        </div>
      )}
      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
