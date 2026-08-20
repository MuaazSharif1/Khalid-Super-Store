require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const productRoutes = require("./routes/products");
const storeRoutes = require("./routes/stores");
const orderRoutes = require("./routes/orders");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payments");
const settingsRoutes = require("./routes/settings");

const app = express();
const PORT = process.env.PORT || 4000;

// Support one or multiple comma-separated origins, trim spaces and any
// trailing slash so small formatting differences don't silently break CORS.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow tools like curl/health checks with no Origin header at all.
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(clean)) {
        callback(null, true);
      } else {
        console.warn(`Blocked CORS request from origin: "${origin}". Allowed: ${allowedOrigins.join(", ")}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
const uploadsStaticDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsStaticDir));

app.get("/api/health", (req, res) => res.json({ ok: true, store: "Khalid Super Store" }));

app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error(err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Not allowed by CORS" });
  }

  res.status(500).json({ error: "Something went wrong on the server" });
});

app.listen(PORT, () => {
  console.log(`Khalid Super Store API running on port ${PORT}`);
});
