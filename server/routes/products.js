const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const { category, search, featured, limit } = req.query;
  let sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (category) {
    sql += " AND c.slug = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND (p.name LIKE ? OR p.description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (featured === "true") {
    sql += " AND p.is_featured = 1";
  }
  sql += " ORDER BY p.created_at DESC";
  if (limit) {
    sql += " LIMIT ?";
    params.push(Number(limit));
  }

  const products = db.prepare(sql).all(...params);
  res.json({ products });
});

router.get("/:slug", (req, res) => {
  const product = db
    .prepare(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? AND p.is_active = 1
    `)
    .get(req.params.slug);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json({ product });
});

module.exports = router;
