const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { upload, uploadMedia, uploadDir } = require("../middleware/upload");
const { getSetting, setSetting, getAllSettings } = require("../lib/settings");
const { notifyOrderEvent } = require("../lib/notify");
const { attachExtras, recordStatusChange } = require("./orders");

const router = express.Router();
router.use(requireAuth, requireAdmin);

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ==================== Media ====================
// Kept for backwards-compatible single-image uploads (e.g. inline product form).
router.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    db.prepare(
      "INSERT INTO media (url, type, original_name, size_bytes) VALUES (?, 'image', ?, ?)"
    ).run(url, req.file.originalname, req.file.size);
    res.json({ url });
  });
});

// Media Library upload — accepts images and short videos, always logged to
// the reusable `media` table so it can be browsed/reused everywhere.
router.post("/media", (req, res) => {
  uploadMedia.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    const type = req.file.mimetype.startsWith("video/") ? "video" : "image";
    const info = db
      .prepare("INSERT INTO media (url, type, original_name, size_bytes) VALUES (?, ?, ?, ?)")
      .run(url, type, req.file.originalname, req.file.size);
    const media = db.prepare("SELECT * FROM media WHERE id = ?").get(info.lastInsertRowid);
    res.status(201).json({ media });
  });
});

router.get("/media", (req, res) => {
  const media = db.prepare("SELECT * FROM media ORDER BY created_at DESC").all();
  res.json({ media });
});

router.delete("/media/:id", (req, res) => {
  const item = db.prepare("SELECT * FROM media WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Media not found" });
  const filePath = path.join(uploadDir, path.basename(item.url));
  fs.unlink(filePath, () => {});
  db.prepare("DELETE FROM media WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ==================== Dashboard ====================
router.get("/stats", (req, res) => {
  const productCount = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
  const categoryCount = db.prepare("SELECT COUNT(*) AS n FROM categories").get().n;
  const orderCount = db.prepare("SELECT COUNT(*) AS n FROM orders").get().n;
  const customerCount = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").get().n;
  const revenue = db.prepare("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status != 'cancelled'").get().n;
  const todaySales = db
    .prepare("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status != 'cancelled' AND date(created_at) = date('now')")
    .get().n;
  const monthlySales = db
    .prepare("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status != 'cancelled' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')")
    .get().n;
  const lowStock = db.prepare("SELECT COUNT(*) AS n FROM products WHERE stock > 0 AND stock <= low_stock_threshold").get().n;
  const outOfStock = db.prepare("SELECT COUNT(*) AS n FROM products WHERE stock <= 0").get().n;
  const recentOrders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5").all();
  const recentCustomers = db
    .prepare("SELECT id, name, email, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 5")
    .all();

  const salesRows = db
    .prepare(`
      SELECT date(created_at) AS day, COALESCE(SUM(total), 0) AS revenue
      FROM orders
      WHERE status != 'cancelled' AND date(created_at) >= date('now', '-6 days')
      GROUP BY day
    `)
    .all();
  const salesByDate = Object.fromEntries(salesRows.map((r) => [r.day, r.revenue]));
  const salesByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    salesByDay.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      revenue: salesByDate[key] || 0,
    });
  }

  const statusRows = db.prepare("SELECT status, COUNT(*) AS count FROM orders GROUP BY status").all();
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  const ordersByStatus = statusRows.map((r) => ({ status: r.status, count: r.count }));

  res.json({
    productCount,
    categoryCount,
    orderCount,
    customerCount,
    revenue,
    todaySales,
    monthlySales,
    lowStock,
    outOfStock,
    recentOrders,
    recentCustomers,
    salesByDay,
    ordersByStatus,
    statusCounts: {
      pending: statusCounts.pending || 0,
      confirmed: statusCounts.confirmed || 0,
      preparing: statusCounts.preparing || 0,
      ready_for_pickup: statusCounts.ready_for_pickup || 0,
      out_for_delivery: statusCounts.out_for_delivery || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
    },
  });
});

// ==================== Categories ====================
router.get("/categories", (req, res) => {
  const categories = db
    .prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
      FROM categories c ORDER BY c.sort_order ASC
    `)
    .all();
  res.json({ categories });
});

router.post("/categories", (req, res) => {
  const { name, icon, image } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories").get().m;
  const info = db
    .prepare("INSERT INTO categories (name, slug, icon, image, sort_order) VALUES (?, ?, ?, ?, ?)")
    .run(name, slugify(name), icon || "🛒", image || "", maxOrder + 1);
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ category });
});

router.put("/categories/:id", (req, res) => {
  const { name, icon, image, is_active } = req.body;
  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Category not found" });
  db.prepare("UPDATE categories SET name = ?, slug = ?, icon = ?, image = ?, is_active = ? WHERE id = ?").run(
    name || existing.name,
    name ? slugify(name) : existing.slug,
    icon || existing.icon,
    image !== undefined ? image : existing.image,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    req.params.id
  );
  res.json({ category: db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id) });
});

router.put("/categories/:id/reorder", (req, res) => {
  const { direction } = req.body; // 'up' | 'down'
  const current = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!current) return res.status(404).json({ error: "Category not found" });
  const neighbor =
    direction === "up"
      ? db.prepare("SELECT * FROM categories WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1").get(current.sort_order)
      : db.prepare("SELECT * FROM categories WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1").get(current.sort_order);
  if (!neighbor) return res.json({ ok: true });
  const txn = db.transaction(() => {
    db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").run(neighbor.sort_order, current.id);
    db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").run(current.sort_order, neighbor.id);
  });
  txn();
  res.json({ ok: true });
});

router.delete("/categories/:id", (req, res) => {
  const productCount = db.prepare("SELECT COUNT(*) AS n FROM products WHERE category_id = ?").get(req.params.id).n;
  if (productCount > 0) {
    return res.status(400).json({ error: "Move or delete this category's products first" });
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ==================== Products ====================
router.get("/products", (req, res) => {
  const products = db
    .prepare(`
      SELECT p.*, c.name AS category_name,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE oi.product_id = p.id AND o.status != 'cancelled') AS sold_quantity
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ORDER BY p.created_at DESC
    `)
    .all();
  res.json({ products });
});

router.post("/products", (req, res) => {
  const {
    category_id, name, description, price, compare_at_price, unit, image,
    stock, is_featured, sku, barcode, is_active, low_stock_threshold,
  } = req.body;
  if (!category_id || !name || !price) {
    return res.status(400).json({ error: "Category, name and price are required" });
  }
  const info = db
    .prepare(`INSERT INTO products
      (category_id, name, slug, description, price, compare_at_price, unit, image, stock,
       is_featured, sku, barcode, is_active, low_stock_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      category_id,
      name,
      slugify(`${name}-${Date.now()}`),
      description || "",
      price,
      compare_at_price || null,
      unit || "each",
      image || "",
      stock ?? 0,
      is_featured ? 1 : 0,
      sku || null,
      barcode || null,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      low_stock_threshold ?? 5
    );
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ product });
});

router.put("/products/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });
  const {
    category_id, name, description, price, compare_at_price, unit, image, stock,
    is_featured, sku, barcode, is_active, low_stock_threshold,
  } = req.body;
  db.prepare(`
    UPDATE products SET
      category_id = ?, name = ?, description = ?, price = ?, compare_at_price = ?,
      unit = ?, image = ?, stock = ?, is_featured = ?, sku = ?, barcode = ?,
      is_active = ?, low_stock_threshold = ?
    WHERE id = ?
  `).run(
    category_id ?? existing.category_id,
    name ?? existing.name,
    description ?? existing.description,
    price ?? existing.price,
    compare_at_price ?? existing.compare_at_price,
    unit ?? existing.unit,
    image ?? existing.image,
    stock ?? existing.stock,
    is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
    sku !== undefined ? sku : existing.sku,
    barcode !== undefined ? barcode : existing.barcode,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    low_stock_threshold ?? existing.low_stock_threshold,
    req.params.id
  );
  res.json({ product: db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) });
});

router.delete("/products/:id", (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ==================== Customers ====================
router.get("/customers", (req, res) => {
  const customers = db
    .prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
        (SELECT COALESCE(SUM(total), 0) FROM orders o WHERE o.user_id = u.id AND o.status != 'cancelled') AS total_spent
      FROM users u
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC
    `)
    .all();
  res.json({ customers });
});

// ==================== Orders ====================
router.get("/orders", (req, res) => {
  const { status, search } = req.query;
  let sql = "SELECT * FROM orders WHERE 1=1";
  const params = [];
  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (search) {
    sql += " AND (contact_name LIKE ? OR contact_phone LIKE ? OR CAST(id AS TEXT) = ?)";
    params.push(`%${search}%`, `%${search}%`, search);
  }
  sql += " ORDER BY created_at DESC";
  const orders = db.prepare(sql).all(...params);
  res.json({ orders: orders.map(attachExtras) });
});

router.get("/orders/:id", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  const customer = order.user_id ? db.prepare("SELECT id, name, email, phone FROM users WHERE id = ?").get(order.user_id) : null;
  res.json({ order: { ...attachExtras(order), customer } });
});

const VALID_STATUSES = [
  "pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery", "completed", "cancelled",
];

const STATUS_TO_EVENT = {
  confirmed: "order_confirmed",
  out_for_delivery: "out_for_delivery",
  completed: "delivered",
  cancelled: "cancelled",
};

router.put("/orders/:id/status", async (req, res) => {
  const { status, note } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  recordStatusChange(req.params.id, status, note || null);

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  const event = STATUS_TO_EVENT[status];
  if (event) {
    const user = updated.user_id ? db.prepare("SELECT email FROM users WHERE id = ?").get(updated.user_id) : null;
    notifyOrderEvent(event, attachExtras(updated), user?.email).catch(() => {});
  }

  res.json({ order: attachExtras(updated) });
});

router.put("/orders/:id/notes", (req, res) => {
  const { admin_notes } = req.body;
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Order not found" });
  db.prepare("UPDATE orders SET admin_notes = ? WHERE id = ?").run(admin_notes || "", req.params.id);
  res.json({ order: attachExtras(db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id)) });
});

// Manual bank-transfer payment verification (spec §15/§16)
router.put("/orders/:id/payment/confirm", async (req, res) => {
  const { note } = req.body;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  db.prepare(`
    UPDATE orders SET
      payment_status = 'paid',
      payment_verified_at = datetime('now'),
      payment_verification_note = ?
    WHERE id = ?
  `).run(note || null, req.params.id);

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  const user = updated.user_id ? db.prepare("SELECT email FROM users WHERE id = ?").get(updated.user_id) : null;
  notifyOrderEvent("payment_confirmed", attachExtras(updated), user?.email).catch(() => {});

  res.json({ order: attachExtras(updated) });
});

router.put("/orders/:id/payment/reject", async (req, res) => {
  const { note } = req.body;
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  db.prepare(`
    UPDATE orders SET
      payment_status = 'rejected',
      payment_verified_at = datetime('now'),
      payment_verification_note = ?
    WHERE id = ?
  `).run(note || null, req.params.id);

  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  const user = updated.user_id ? db.prepare("SELECT email FROM users WHERE id = ?").get(updated.user_id) : null;
  notifyOrderEvent("payment_rejected", attachExtras(updated), user?.email).catch(() => {});

  res.json({ order: attachExtras(updated) });
});

// ==================== Settings (CMS) ====================
router.get("/settings", (req, res) => {
  res.json({ settings: getAllSettings() });
});

router.put("/settings/:key", (req, res) => {
  const allowedKeys = ["store", "payment", "delivery", "email", "whatsapp", "homepage"];
  if (!allowedKeys.includes(req.params.key)) {
    return res.status(400).json({ error: "Unknown settings key" });
  }
  const updated = setSetting(req.params.key, req.body || {});
  res.json({ key: req.params.key, value: updated });
});

// ==================== Notifications log ====================
router.get("/notifications", (req, res) => {
  const logs = db
    .prepare("SELECT * FROM notifications_log ORDER BY created_at DESC LIMIT 100")
    .all();
  res.json({ logs });
});

module.exports = router;
