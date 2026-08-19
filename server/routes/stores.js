const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const stores = db.prepare("SELECT * FROM stores ORDER BY name ASC").all();
  res.json({ stores });
});

module.exports = router;
