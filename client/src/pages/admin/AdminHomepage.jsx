import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import ImagePicker from "../../components/ImagePicker";

export default function AdminHomepage() {
  const { token } = useAuth();
  const [homepage, setHomepage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.adminGetSettings(token).then((d) => setHomepage(d.settings.homepage));
    api.adminCategories(token).then((d) => setCategories(d.categories));
  }, [token]);

  if (!homepage) return <div>Loading...</div>;

  function update(field, value) {
    setHomepage((h) => ({ ...h, [field]: value }));
  }

  function toggleFeaturedCategory(id) {
    const current = homepage.featured_category_ids || [];
    update(
      "featured_category_ids",
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    );
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.adminUpdateSettings("homepage", homepage, token);
      setHomepage(updated.value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Homepage</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>
        Control what shoppers see on your storefront's homepage — no code required.
      </p>

      <div className="admin-panel" style={{ maxWidth: 560 }}>
        <h3>Hero Section</h3>
        <div className="form-row">
          <label>Hero Title (use a line break for the highlighted second line)</label>
          <textarea rows={2} value={homepage.hero_title} onChange={(e) => update("hero_title", e.target.value)} />
        </div>
        <div className="form-row">
          <label>Hero Subtitle</label>
          <textarea rows={2} value={homepage.hero_subtitle} onChange={(e) => update("hero_subtitle", e.target.value)} />
        </div>
        <ImagePicker label="Hero Image (shown in the big card, top right)" value={homepage.hero_image} onChange={(v) => update("hero_image", v)} />
        <ImagePicker label="Hero Background Banner" value={homepage.banner_image} onChange={(v) => update("banner_image", v)} />
        <div className="two-col">
          <div className="form-row">
            <label>CTA Button Text</label>
            <input value={homepage.cta_text} onChange={(e) => update("cta_text", e.target.value)} />
          </div>
          <div className="form-row">
            <label>CTA Button Link</label>
            <input value={homepage.cta_link} onChange={(e) => update("cta_link", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="admin-panel" style={{ maxWidth: 560 }}>
        <h3>Store Announcement</h3>
        <div className="form-row">
          <label>Announcement Bar (leave blank to hide)</label>
          <input
            value={homepage.announcement}
            onChange={(e) => update("announcement", e.target.value)}
            placeholder="e.g. Eid holiday hours: closing early on Friday"
          />
        </div>
      </div>

      <div className="admin-panel" style={{ maxWidth: 560 }}>
        <h3>Featured Categories</h3>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
          Highlighted for future homepage sections; select which categories you want to promote.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {categories.map((c) => {
            const active = (homepage.featured_category_ids || []).includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleFeaturedCategory(c.id)}
                className="btn"
                style={active ? { background: "#464B71", color: "#fff" } : {}}
              >
                {c.icon} {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Homepage"}
      </button>
    </div>
  );
}
