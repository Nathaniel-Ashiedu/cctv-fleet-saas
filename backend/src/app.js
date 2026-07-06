const express = require("express");
const cors = require("cors");
require("dotenv").config();
const db = require("./config/db");
const authRoutes = require("./routes/auth");
const sitesRoutes = require("./routes/sites");
const devicesRoutes = require("./routes/devices");
const alertsRoutes = require("./routes/alerts");
const { requireAuth } = require("./middleware/auth");
const { scheduleHealthChecks } = require("./jobs/deviceHealthCheck");

const app = express();

const allowedOrigins = ["http://localhost:5173", "https://cctv-fleet-saas.vercel.app"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
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
app.use("/sites", sitesRoutes);
app.use("/devices", devicesRoutes);
app.use("/alerts", alertsRoutes);

app.get("/me", requireAuth, function (req, res) {
  res.json({ status: "ok", user: req.user });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async function () {
  console.log("Backend running on http://localhost:" + PORT);
  await scheduleHealthChecks();
});