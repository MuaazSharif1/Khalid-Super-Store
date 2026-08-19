const express = require("express");
const db = require("../db");
const { getAllSettings } = require("../lib/settings");

const router = express.Router();

// Public, read-only. Powers the homepage CMS, checkout payment instructions,
// and footer/store-info without hardcoding any of it in React components.
router.get("/", (req, res) => {
  const all = getAllSettings();
  const { homepage } = all;

  let featuredCategories = [];
  if (Array.isArray(homepage.featured_category_ids) && homepage.featured_category_ids.length) {
    const placeholders = homepage.featured_category_ids.map(() => "?").join(",");
    featuredCategories = db
      .prepare(`SELECT * FROM categories WHERE id IN (${placeholders}) AND is_active = 1`)
      .all(...homepage.featured_category_ids);
  }

  res.json({
    store: all.store,
    payment: all.payment,
    delivery: all.delivery,
    homepage: { ...homepage, featured_categories: featuredCategories },
  });
});

module.exports = router;
