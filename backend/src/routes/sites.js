const express = require("express");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");

const router = express.Router();

// All routes below require a valid JWT AND org scoping
router.use(requireAuth, scopeToOrg);

// POST /sites — create a new site under the logged-in user's org
router.post("/", async function (req, res) {
  const { name, address } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const result = await db.query(
      "INSERT INTO sites (org_id, name, address) VALUES ($1, $2, $3) RETURNING id, name, address, created_at",
      [req.orgId, name, address || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create site", message: err.message });
  }
});

// GET /sites — list all sites for the logged-in user's org
router.get("/", async function (req, res) {
  try {
    const result = await db.query(
      "SELECT id, name, address, created_at FROM sites WHERE org_id = $1 ORDER BY created_at DESC",
      [req.orgId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sites", message: err.message });
  }
});

// GET /sites/:id — get one site, only if it belongs to this org
router.get("/:id", async function (req, res) {
  try {
    const result = await db.query(
      "SELECT id, name, address, created_at FROM sites WHERE id = $1 AND org_id = $2",
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch site", message: err.message });
  }
});

// PUT /sites/:id — update a site, only if it belongs to this org
router.put("/:id", async function (req, res) {
  const { name, address } = req.body;

  try {
    const result = await db.query(
      "UPDATE sites SET name = COALESCE($1, name), address = COALESCE($2, address) WHERE id = $3 AND org_id = $4 RETURNING id, name, address, created_at",
      [name || null, address || null, req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update site", message: err.message });
  }
});

// DELETE /sites/:id — delete a site, only if it belongs to this org
router.delete("/:id", async function (req, res) {
  try {
    const result = await db.query(
      "DELETE FROM sites WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Site not found" });
    }
    res.json({ status: "deleted", id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete site", message: err.message });
  }
});

module.exports = router;