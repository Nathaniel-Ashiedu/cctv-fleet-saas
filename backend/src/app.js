const express = require("express");
require("dotenv").config();
const db = require("./config/db");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "cctv-fleet-backend" });
});

app.get("/health/db", async (req, res) => {
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, function () {
  console.log("Backend running on http://localhost:" + PORT);
});