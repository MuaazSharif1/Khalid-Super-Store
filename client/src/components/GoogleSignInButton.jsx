import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function GoogleSignInButton({ redirectTo = "/account" }) {
  const { googleLogin } = useAuth();
  const buttonRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;

    function renderGoogleButton() {
      if (!window.google?.accounts?.id || !buttonRef.current) return false;

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        setError("Google Sign-In is not configured yet.");
        return true;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setError("");
          try {
            const user = await googleLogin(response.credential);
            window.location.href = user.role === "admin" ? "/admin" : redirectTo;
          } catch (err) {
            setError(err.message);
          }
        },
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
        shape: "rectangular",
      });
      return true;
    }

    if (!renderGoogleButton()) {
      timer = window.setInterval(() => {
        if (renderGoogleButton()) window.clearInterval(timer);
      }, 150);
    }

    return () => window.clearInterval(timer);
  }, [googleLogin, redirectTo]);

  return (
    <div style={{ marginTop: 18 }}>
      <div className="auth-divider"><span>or continue with</span></div>
      <div ref={buttonRef} className="google-button-wrap" />
      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
