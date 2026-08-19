const db = require("../db");

// Defaults used the first time a key is read before the admin has saved
// anything. Keeping them here (not scattered across routes/components)
// means the whole site can be re-themed/re-configured from one place.
const DEFAULTS = {
  store: {
    name: "Khalid Super Store",
    logo: "",
    phone: "+92 300 0000000",
    email: "info@khalidsuperstore.pk",
    address: "Main Boulevard, Gulberg III, Lahore",
    opens_at: "09:00",
    closes_at: "22:00",
    delivery_info: "We deliver across Lahore within our delivery radius.",
  },
  payment: {
    bank_name: "",
    account_title: "",
    account_number: "",
    iban: "",
    instructions:
      "Transfer the exact order total to the account above, then upload a screenshot of your payment confirmation.",
  },
  delivery: {
    fee: 150,
    free_delivery_threshold: 3000,
    areas: "",
    estimated_time: "45–90 minutes",
  },
  email: {
    enabled: true,
    from_name: "Khalid Super Store",
    from_email: "",
    notify_customer_on_order: true,
    notify_customer_on_status_change: true,
  },
  whatsapp: {
    enabled: false,
    business_number: "",
    notify_customer_on_order: true,
    notify_customer_on_status_change: true,
  },
  homepage: {
    hero_title: "Fresh groceries, delivered to your door.",
    hero_subtitle: "Shop everyday essentials from Khalid Super Store.",
    hero_image: "",
    banner_image: "",
    banner_video: "",
    cta_text: "Shop Now",
    cta_link: "/",
    announcement: "",
    featured_category_ids: [],
  },
};

function getSetting(key) {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
  const fallback = DEFAULTS[key] || {};
  if (!row) return fallback;
  try {
    return { ...fallback, ...JSON.parse(row.value) };
  } catch {
    return fallback;
  }
}

function setSetting(key, value) {
  const existing = getSetting(key);
  const merged = { ...existing, ...value };
  db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(merged));
  return merged;
}

function getAllSettings() {
  const keys = Object.keys(DEFAULTS);
  return Object.fromEntries(keys.map((k) => [k, getSetting(k)]));
}

module.exports = { getSetting, setSetting, getAllSettings, DEFAULTS };
