const express = require("express");
require("dotenv").config();
const db = require("./config/db");
const authRoutes = require("./routes/auth");
const { requireAuth } = require("./middleware/auth");

const app = express();
app.use(express.json());

app.get("/health", function (req, res) {
  res.json({ status: "ok", service: "cctv-fleet-backend" });
});

app.get("/health/db", async function (req, res) {
  try {
    const result = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    res.json({ status: "ok", tables: result.rows.map(function (r) { return r.table_name; }) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use("/auth", authRoutes);

// A protected route to prove the JWT middleware works
app.get("/me", requireAuth, function (req, res) {
  res.json({ status: "ok", user: req.user });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, function () {
  console.log("Backend running on http://localhost:" + PORT);
});