import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import ImagePicker from "../../components/ImagePicker";

const TABS = [
  { key: "store", label: "Store" },
  { key: "delivery", label: "Delivery" },
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
];

export default function AdminSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState("store");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.adminGetSettings(token).then((d) => setSettings(d.settings));
  }, [token]);

  if (!settings) return <div>Loading settings...</div>;

  function update(field, value) {
    setSettings((s) => ({ ...s, [tab]: { ...s[tab], [field]: value } }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.adminUpdateSettings(tab, settings[tab], token);
      setSettings((s) => ({ ...s, [tab]: updated.value }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const s = settings[tab];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Settings</h2>

      <div className="settings-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="admin-panel" style={{ maxWidth: 560 }}>
        {tab === "store" && (
          <>
            <ImagePicker label="Store Logo" value={s.logo} onChange={(v) => update("logo", v)} />
            <div className="form-row"><label>Store Name</label>
              <input value={s.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="form-row"><label>Phone</label>
              <input value={s.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="form-row"><label>Email</label>
              <input value={s.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="form-row"><label>Address</label>
              <textarea rows={2} value={s.address} onChange={(e) => update("address", e.target.value)} />
            </div>
            <div className="two-col">
              <div className="form-row"><label>Opens At</label>
                <input value={s.opens_at} onChange={(e) => update("opens_at", e.target.value)} placeholder="09:00" />
              </div>
              <div className="form-row"><label>Closes At</label>
                <input value={s.closes_at} onChange={(e) => update("closes_at", e.target.value)} placeholder="22:00" />
              </div>
            </div>
            <div className="form-row"><label>Delivery Information</label>
              <textarea rows={2} value={s.delivery_info} onChange={(e) => update("delivery_info", e.target.value)} />
            </div>
          </>
        )}

        {tab === "delivery" && (
          <>
            <div className="two-col">
              <div className="form-row"><label>Delivery Fee (Rs.)</label>
                <input type="number" value={s.fee} onChange={(e) => update("fee", Number(e.target.value))} />
              </div>
              <div className="form-row"><label>Free Delivery Above (Rs.)</label>
                <input
                  type="number"
                  value={s.free_delivery_threshold}
                  onChange={(e) => update("free_delivery_threshold", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="form-row"><label>Delivery Areas</label>
              <textarea rows={2} value={s.areas} onChange={(e) => update("areas", e.target.value)} placeholder="Gulberg, DHA, Model Town..." />
            </div>
            <div className="form-row"><label>Estimated Delivery Time</label>
              <input value={s.estimated_time} onChange={(e) => update("estimated_time", e.target.value)} />
            </div>
          </>
        )}

        {tab === "email" && (
          <>
            <div className="form-row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={s.enabled} onChange={(e) => update("enabled", e.target.checked)} id="email-enabled" />
              <label htmlFor="email-enabled" style={{ margin: 0 }}>Send email notifications</label>
            </div>
            <div className="form-row"><label>From Name</label>
              <input value={s.from_name} onChange={(e) => update("from_name", e.target.value)} />
            </div>
            <div className="form-row"><label>From Email</label>
              <input value={s.from_email} onChange={(e) => update("from_email", e.target.value)} placeholder="orders@yourdomain.com" />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              SMTP server credentials (host, username, password) are configured on the server via environment
              variables, not here, so they're never exposed to the browser.
            </p>
          </>
        )}

        {tab === "whatsapp" && (
          <>
            <div className="form-row" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={s.enabled} onChange={(e) => update("enabled", e.target.checked)} id="wa-enabled" />
              <label htmlFor="wa-enabled" style={{ margin: 0 }}>Send WhatsApp notifications</label>
            </div>
            <div className="form-row"><label>Business WhatsApp Number</label>
              <input value={s.business_number} onChange={(e) => update("business_number", e.target.value)} placeholder="+92 300 0000000" />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              Actually sending messages requires an official WhatsApp Business API connection (Meta Cloud API).
              Until that's configured on the server, messages are logged instead of sent — visible in the
              Notifications log.
            </p>
          </>
        )}

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
