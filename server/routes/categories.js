const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const categories = db
    .prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.sort_order ASC
    `)
    .all();
  res.json({ categories });
});

router.get("/:slug", (req, res) => {
  const category = db.prepare("SELECT * FROM categories WHERE slug = ?").get(req.params.slug);
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json({ category });
});

module.exports = router;
