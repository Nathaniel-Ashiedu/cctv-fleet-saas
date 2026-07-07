const express = require("express");
const db = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");
const { requireRole } = require("../middleware/requireRole");
const { encrypt } = require("../utils/crypto");

const router = express.Router();

router.use(requireAuth, scopeToOrg);

async function getOwnedSite(siteId, orgId) {
  const result = await db.query("SELECT id FROM sites WHERE id = $1 AND org_id = $2", [siteId, orgId]);
  return result.rows[0] || null;
}

// POST /devices — admins and technicians only
router.post("/", requireRole("admin", "technician"), async function (req, res) {
  const { siteId, name, ipAddress, type, onvifXaddr, onvifUsername, onvifPassword, firmwareVersion } = req.body;

  if (!siteId || !name || !ipAddress) {
    return res.status(400).json({ error: "siteId, name, and ipAddress are required" });
  }

  try {
    const site = await getOwnedSite(siteId, req.orgId);
    if (!site) {
      return res.status(404).json({ error: "Site not found" });
    }

    const orgResult = await db.query("SELECT plan FROM organizations WHERE id = $1", [req.orgId]);
    const plan = orgResult.rows[0]?.plan || "free";

    if (plan === "free") {
      const countResult = await db.query(
        `SELECT COUNT(*) FROM devices d JOIN sites s ON s.id = d.site_id WHERE s.org_id = $1`,
        [req.orgId]
      );
      const deviceCount = parseInt(countResult.rows[0].count, 10);
      if (deviceCount >= 3) {
        return res.status(403).json({
          error: "Free plan is limited to 3 devices. Upgrade to Pro for unlimited devices.",
          limitReached: true,
        });
      }
    }

    const result = await db.query(
      `INSERT INTO devices (site_id, name, ip_address, type, onvif_xaddr, username_enc, password_enc, firmware_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, site_id, name, ip_address, type, onvif_xaddr, firmware_version, status, last_seen_at, created_at`,
      [
        siteId,
        name,
        ipAddress,
        type || "camera",
        onvifXaddr || null,
        encrypt(onvifUsername),
        encrypt(onvifPassword),
        firmwareVersion || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create device", message: err.message });
  }
});

// GET /devices — all roles can view
router.get("/", async function (req, res) {
  const { siteId } = req.query;

  try {
    let result;
    if (siteId) {
      result = await db.query(
        `SELECT d.id, d.site_id, d.name, d.ip_address, d.type, d.status, d.firmware_version, d.last_seen_at, d.created_at
         FROM devices d JOIN sites s ON s.id = d.site_id
         WHERE d.site_id = $1 AND s.org_id = $2 ORDER BY d.created_at DESC`,
        [siteId, req.orgId]
      );
    } else {
      result = await db.query(
        `SELECT d.id, d.site_id, d.name, d.ip_address, d.type, d.status, d.firmware_version, d.last_seen_at, d.created_at
         FROM devices d JOIN sites s ON s.id = d.site_id
         WHERE s.org_id = $1 ORDER BY d.created_at DESC`,
        [req.orgId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch devices", message: err.message });
  }
});

// GET /devices/:id — all roles can view
router.get("/:id", async function (req, res) {
  try {
    const result = await db.query(
      `SELECT d.id, d.site_id, d.name, d.ip_address, d.type, d.status, d.firmware_version, d.last_seen_at, d.created_at
       FROM devices d JOIN sites s ON s.id = d.site_id
       WHERE d.id = $1 AND s.org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch device", message: err.message });
  }
});

// PUT /devices/:id — admins and technicians only
router.put("/:id", requireRole("admin", "technician"), async function (req, res) {
  const { name, ipAddress, type, firmwareVersion, status } = req.body;

  try {
    const result = await db.query(
      `UPDATE devices d SET
         name = COALESCE($1, d.name),
         ip_address = COALESCE($2, d.ip_address),
         type = COALESCE($3, d.type),
         firmware_version = COALESCE($4, d.firmware_version),
         status = COALESCE($5, d.status)
       FROM sites s
       WHERE d.id = $6 AND d.site_id = s.id AND s.org_id = $7
       RETURNING d.id, d.site_id, d.name, d.ip_address, d.type, d.status, d.firmware_version, d.last_seen_at, d.created_at`,
      [name || null, ipAddress || null, type || null, firmwareVersion || null, status || null, req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update device", message: err.message });
  }
});

// DELETE /devices/:id — admins only
router.delete("/:id", requireRole("admin"), async function (req, res) {
  try {
    const result = await db.query(
      `DELETE FROM devices d USING sites s
       WHERE d.id = $1 AND d.site_id = s.id AND s.org_id = $2
       RETURNING d.id`,
      [req.params.id, req.orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }
    res.json({ status: "deleted", id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete device", message: err.message });
  }
});

// GET /devices/:id/health — all roles can view
router.get("/:id/health", async function (req, res) {
  try {
    const deviceCheck = await db.query(
      `SELECT d.id FROM devices d JOIN sites s ON s.id = d.site_id WHERE d.id = $1 AND s.org_id = $2`,
      [req.params.id, req.orgId]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    const result = await db.query(
      `SELECT id, checked_at, status, storage_used_pct, latency_ms
       FROM health_logs WHERE device_id = $1 ORDER BY checked_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch health logs", message: err.message });
  }
});

module.exports = router;