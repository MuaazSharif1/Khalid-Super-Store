const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken, requireAuth } = require("../middleware/auth");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");

const googleClient = new OAuth2Client();

const router = express.Router();

router.post("/register", (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, 'customer')")
    .run(name, email.toLowerCase(), hash, phone || null);

  const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post("/google", async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Google credential is required" });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: "Google Sign-In is not configured on the server." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: "Google account email could not be verified." });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];
    const googleId = payload.sub;

    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    if (user) {
      db.prepare(
        "UPDATE users SET google_id = ?, auth_provider = 'google', name = ? WHERE id = ?"
      ).run(googleId, name, user.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    } else {
      // password_hash is required by the existing schema, so Google-only
      // accounts receive an unusable random password hash.
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hash = bcrypt.hashSync(randomPassword, 10);

      const info = db
        .prepare(`INSERT INTO users
          (name, email, password_hash, phone, google_id, auth_provider, role)
          VALUES (?, ?, ?, ?, ?, 'google', 'customer')`)
        .run(name, email, hash, payload.phone_number || null, googleId);

      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Google sign-in error:", err);
    res.status(401).json({ error: "Google Sign-In failed. Please try again." });
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?")
    .get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// Addresses
router.get("/addresses", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC").all(req.user.id);
  res.json({ addresses: rows });
});

router.post("/addresses", requireAuth, (req, res) => {
  const { label, first_name, last_name, phone, city, area, address_line, is_default } = req.body;
  if (!first_name || !phone || !city || !address_line) {
    return res.status(400).json({ error: "First name, phone, city and address are required" });
  }
  if (is_default) {
    db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(req.user.id);
  }
  const info = db
    .prepare(`INSERT INTO addresses (user_id, label, first_name, last_name, phone, city, area, address_line, is_default)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(req.user.id, label || "Home", first_name, last_name || "", phone, city, area || "", address_line, is_default ? 1 : 0);
  const address = db.prepare("SELECT * FROM addresses WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ address });
});

router.delete("/addresses/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
