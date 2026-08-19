const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { getSetting } = require("../lib/settings");
const { notifyOrderEvent } = require("../lib/notify");

const router = express.Router();

const PAYMENT_VERIFICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function formatAddress(order) {
  if (order.fulfillment_type !== "delivery" || !order.address_id) return null;
  const addr = db.prepare("SELECT * FROM addresses WHERE id = ?").get(order.address_id);
  if (!addr) return null;
  const name = [addr.first_name, addr.last_name].filter(Boolean).join(" ");
  return [name, addr.address_line, addr.area, addr.city].filter(Boolean).join(", ");
}

function attachExtras(order) {
  const items = db
    .prepare(`
      SELECT oi.*, p.image AS product_image
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `)
    .all(order.id);
  const history = db
    .prepare("SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC, id ASC")
    .all(order.id);
  const address = order.fulfillment_type === "delivery" ? db.prepare("SELECT * FROM addresses WHERE id = ?").get(order.address_id) : null;
  let paymentSecondsRemaining = null;
  if (order.payment_method === "bank_transfer" && order.payment_status === "pending_verification" && order.payment_submitted_at) {
    const submittedAt = new Date(order.payment_submitted_at.replace(" ", "T") + "Z").getTime();
    const elapsed = Date.now() - submittedAt;
    paymentSecondsRemaining = Math.max(0, Math.round((PAYMENT_VERIFICATION_WINDOW_MS - elapsed) / 1000));
  }
  return {
    ...order,
    items,
    status_history: history,
    delivery_address: formatAddress(order),
    address,
    payment_seconds_remaining: paymentSecondsRemaining,
  };
}

function recordStatusChange(orderId, status, note) {
  db.prepare(
    "INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)"
  ).run(orderId, status, note || null);
}

function createOrderFromPayload(req, payload, paymentMethod = "cod") {
  const {
    items,
    fulfillment_type,
    store_id,
    address,
    contact_name,
    contact_phone,
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Cart is empty");
  }
  if (fulfillment_type === "pickup" && !store_id) {
    throw new Error("Please select a pickup store");
  }
  if (fulfillment_type === "delivery" && !address) {
    throw new Error("Delivery address is required");
  }
  if (!contact_name || !contact_phone) {
    throw new Error("Contact name and phone are required");
  }

  const deliverySettings = getSetting("delivery");
  const DELIVERY_FEE = Number(deliverySettings.fee) || 150;
  const FREE_DELIVERY_THRESHOLD = Number(deliverySettings.free_delivery_threshold) || 3000;

  const getProduct = db.prepare("SELECT * FROM products WHERE id = ?");
  let subtotal = 0;
  const lineItems = [];

  for (const item of items) {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Invalid product quantity");
    }

    const product = getProduct.get(item.product_id);
    if (!product) throw new Error(`Product ${item.product_id} not found`);
    if (!product.is_active) throw new Error(`${product.name} is not currently available`);
    if (product.stock < quantity) {
      throw new Error(`${product.name} is out of stock`);
    }

    const lineTotal = product.price * quantity;
    subtotal += lineTotal;
    lineItems.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
      line_total: lineTotal,
    });
  }

  const deliveryFee =
    fulfillment_type === "delivery" && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  const initialPaymentStatus =
    paymentMethod === "safepay" || paymentMethod === "bank_transfer" ? "pending" : "unpaid";

  const txn = db.transaction(() => {
    let addressId = null;

    if (fulfillment_type === "delivery") {
      const info = db
        .prepare(`INSERT INTO addresses
          (user_id, label, first_name, last_name, phone, city, area, address_line)
          VALUES (?, 'Order Address', ?, ?, ?, ?, ?, ?)`)
        .run(
          req.user ? req.user.id : null,
          address.first_name,
          address.last_name || "",
          address.phone || contact_phone,
          address.city,
          address.area || "",
          address.address_line
        );
      addressId = info.lastInsertRowid;
    }

    const orderInfo = db
      .prepare(`INSERT INTO orders
        (user_id, fulfillment_type, store_id, address_id, contact_name, contact_phone,
         subtotal, delivery_fee, total, payment_method, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        req.user ? req.user.id : null,
        fulfillment_type,
        fulfillment_type === "pickup" ? store_id : null,
        addressId,
        contact_name,
        contact_phone,
        subtotal,
        deliveryFee,
        total,
        paymentMethod,
        initialPaymentStatus
      );

    const orderId = orderInfo.lastInsertRowid;

    const insertItem = db.prepare(`INSERT INTO order_items
      (order_id, product_id, product_name, unit_price, quantity, line_total)
      VALUES (?, ?, ?, ?, ?, ?)`);
    const decrementStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

    for (const li of lineItems) {
      insertItem.run(
        orderId,
        li.product_id,
        li.product_name,
        li.unit_price,
        li.quantity,
        li.line_total
      );
      decrementStock.run(li.quantity, li.product_id);
    }

    recordStatusChange(orderId, "pending", "Order placed");

    return orderId;
  });

  const orderId = txn();
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId);
  return { ...order, items: orderItems };
}

function rollbackUnpaidOrder(orderId) {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
  if (!order) return;

  const items = db.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").all(orderId);
  const restoreStock = db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");

  const txn = db.transaction(() => {
    for (const item of items) {
      if (item.product_id) restoreStock.run(item.quantity, item.product_id);
    }
    db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
  });
  txn();
}

// Checkout requires a logged-in account (spec §11) — the cart itself lives
// client-side and is preserved across the login redirect there.
router.post("/", requireAuth, (req, res) => {
  try {
    const paymentMethod = ["safepay", "bank_transfer"].includes(req.body.payment_method)
      ? req.body.payment_method
      : "cod";
    const order = createOrderFromPayload(req, req.body, paymentMethod);

    const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.user.id);
    notifyOrderEvent("order_received", attachExtras(order), user?.email).catch(() => {});

    res.status(201).json({ order: attachExtras(order) });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not create order" });
  }
});

router.get("/my", requireAuth, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);

  res.json({ orders: orders.map(attachExtras) });
});

router.get("/my/history", requireAuth, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json({ orders: orders.map(attachExtras) });
});

router.get("/:id", requireAuth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  if (order.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Not authorized to view this order" });
  }

  res.json({ order: attachExtras(order) });
});

// Customer uploads payment proof for a bank-transfer order they own.
router.post("/:id/payment-screenshot", requireAuth, (req, res) => {
  upload.single("screenshot")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No screenshot uploaded" });

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this order" });
    }
    if (order.payment_method !== "bank_transfer") {
      return res.status(400).json({ error: "This order is not using bank transfer payment" });
    }

    db.prepare(`
      UPDATE orders SET
        payment_screenshot = ?,
        payment_status = 'pending_verification',
        payment_submitted_at = datetime('now')
      WHERE id = ?
    `).run(`/uploads/${req.file.filename}`, order.id);

    const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
    res.json({ order: attachExtras(updated) });
  });
});

module.exports = router;
module.exports.createOrderFromPayload = createOrderFromPayload;
module.exports.rollbackUnpaidOrder = rollbackUnpaidOrder;
module.exports.attachExtras = attachExtras;
module.exports.recordStatusChange = recordStatusChange;
