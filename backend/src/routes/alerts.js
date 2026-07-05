const express = require("express");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");

const router = express.Router();

router.use(requireAuth, scopeToOrg);

// GET /alerts — all alerts across the org's devices, most recent first.
// Optional ?resolved=true|false to filter.
router.get("/", async function (req, res) {
  const { resolved } = req.query;

  try {
    let query = `
      SELECT a.id, a.device_id, d.name AS device_name, a.type, a.message, a.resolved, a.created_at
      FROM alerts a
      JOIN devices d ON d.id = a.device_id
      JOIN sites s ON s.id = d.site_id
      WHERE s.org_id = $1
    `;
    const params = [req.orgId];

    if (resolved === "true" || resolved === "false") {
      query += " AND a.resolved = $2";
      params.push(resolved === "true");
    }

    query += " ORDER BY a.created_at DESC LIMIT 100";

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alerts", message: err.message });
  }
});

// PUT /alerts/:id/resolve — mark an alert as resolved (org-scoped)
router.put("/:id/resolve", async function (req, res) {
  try {
    const result = await db.query(
      `UPDATE alerts a SET resolved = true
       FROM devices d, sites s
       WHERE a.id = $1 AND a.device_id = d.id AND d.site_id = s.id AND s.org_id = $2
       RETURNING a.id, a.resolved`,
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resolve alert", message: err.message });
  }
});

module.exports = router;