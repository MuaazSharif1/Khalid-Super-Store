const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "store.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  google_id TEXT UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  role TEXT NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL DEFAULT '🛒',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
  compare_at_price REAL,
  unit TEXT NOT NULL DEFAULT 'each', -- e.g. 1kg, 500ml, each
  image TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  opens_at TEXT NOT NULL DEFAULT '09:00',
  closes_at TEXT NOT NULL DEFAULT '22:00'
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  city TEXT,
  area TEXT,
  address_line TEXT,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'delivery', -- 'delivery' | 'pickup'
  store_id INTEGER REFERENCES stores(id),
  address_id INTEGER REFERENCES addresses(id),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  subtotal REAL NOT NULL,
  delivery_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | preparing | out_for_delivery | ready_for_pickup | completed | cancelled
  payment_method TEXT NOT NULL DEFAULT 'cod', -- cod | safepay
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid | pending | paid | failed
  payment_reference TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  line_total REAL NOT NULL
);

-- Simple key/value store used for the Homepage CMS, store/payment/delivery/
-- email/WhatsApp settings. Values are stored as JSON text so the shape of
-- each setting can evolve without further migrations.
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reusable media library. Admin uploads live here once and get referenced
-- (by URL) from banners, products, categories, etc. instead of being
-- re-uploaded/hardcoded per-use.
CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image', -- 'image' | 'video'
  original_name TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Timestamped log of every order status change, powering the order timeline.
CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Outbound notification log (email / whatsapp). Lets the admin panel show
-- what was sent/attempted, and gives the future WhatsApp Business API
-- integration a queue to read from instead of firing inline.
CREATE TABLE IF NOT EXISTS notifications_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'email' | 'whatsapp'
  event TEXT NOT NULL,   -- 'order_received' | 'order_confirmed' | ...
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'sent' | 'failed' | 'not_configured' | 'pending'
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Safe migrations for databases created by an older version.
const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userColumns.includes("google_id")) db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
if (!userColumns.includes("auth_provider")) db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local'");

const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
if (!orderColumns.includes("payment_status")) db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'");
if (!orderColumns.includes("payment_reference")) db.exec("ALTER TABLE orders ADD COLUMN payment_reference TEXT");
if (!orderColumns.includes("payment_screenshot")) db.exec("ALTER TABLE orders ADD COLUMN payment_screenshot TEXT");
if (!orderColumns.includes("payment_submitted_at")) db.exec("ALTER TABLE orders ADD COLUMN payment_submitted_at TEXT");
if (!orderColumns.includes("payment_verified_at")) db.exec("ALTER TABLE orders ADD COLUMN payment_verified_at TEXT");
if (!orderColumns.includes("payment_verification_note")) db.exec("ALTER TABLE orders ADD COLUMN payment_verification_note TEXT");
if (!orderColumns.includes("admin_notes")) db.exec("ALTER TABLE orders ADD COLUMN admin_notes TEXT");

const productColumns = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
if (!productColumns.includes("sku")) db.exec("ALTER TABLE products ADD COLUMN sku TEXT");
if (!productColumns.includes("barcode")) db.exec("ALTER TABLE products ADD COLUMN barcode TEXT");
if (!productColumns.includes("is_active")) db.exec("ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
if (!productColumns.includes("low_stock_threshold")) db.exec("ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5");

const categoryColumns = db.prepare("PRAGMA table_info(categories)").all().map((c) => c.name);
if (!categoryColumns.includes("is_active")) db.exec("ALTER TABLE categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
if (!categoryColumns.includes("image")) db.exec("ALTER TABLE categories ADD COLUMN image TEXT");

// Backfill an initial status-history row for any pre-existing orders so the
// timeline UI always has at least one entry to show.
const seedHistoryStmt = db.prepare(`
  INSERT INTO order_status_history (order_id, status, note, changed_at)
  SELECT id, status, 'Order created', created_at FROM orders o
  WHERE NOT EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id = o.id)
`);
seedHistoryStmt.run();

module.exports = db;
