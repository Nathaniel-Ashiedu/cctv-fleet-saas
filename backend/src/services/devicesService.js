const db = require("../config/db");
const AppError = require("../utils/AppError");
const { encrypt, decrypt } = require("../utils/crypto");
const { getSnapshotUri } = require("./onvifPoller");

async function getOwnedSite(siteId, orgId) {
  const result = await db.query("SELECT id FROM sites WHERE id = $1 AND org_id = $2", [siteId, orgId]);
  return result.rows[0] || null;
}

async function createDevice(orgId, data) {
  const { siteId, name, ipAddress, type, onvifXaddr, onvifUsername, onvifPassword, firmwareVersion } = data;

  if (!siteId || !name || !ipAddress) {
    throw new AppError(400, "siteId, name, and ipAddress are required");
  }

  const site = await getOwnedSite(siteId, orgId);
  if (!site) {
    throw new AppError(404, "Site not found");
  }

  const orgResult = await db.query("SELECT plan FROM organizations WHERE id = $1", [orgId]);
  const plan = orgResult.rows[0]?.plan || "free";

  if (plan === "free") {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM devices d JOIN sites s ON s.id = d.site_id WHERE s.org_id = $1`,
      [orgId]
    );
    const deviceCount = parseInt(countResult.rows[0].count, 10);
    if (deviceCount >= 3) {
      throw new AppError(403, "Free plan is limited to 3 devices. Upgrade to Pro for unlimited devices.", {
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
  return result.rows[0];
}

async function listDevices(orgId, siteId) {
  if (siteId) {
    const result = await db.query(
      `SELECT d.id, d.site_id, d.name, d.ip_address, d.type, d.status, d.firmware_version, d.last_seen_at, d.created_at
       FROM devices d JOIN sites s ON s.id = d.site_id
       WHERE d.site_id = $1 AND s.org_id = $2 ORDER BY d.created_at DESC`,
      [siteId, orgId]
    );
    return result.rows;
  }
  const result = await db.query(
    `SELECT d.id, d.site_id, d.name, d.ip_address, d.type, d.status, d.firmware_version, d.last_seen_at, d.created_at
     FROM devices d JOIN sites s ON s.id = d.site_id
     WHERE s.org_id = $1 ORDER BY d.created_at DESC`,
    [orgId]
  );
  return result.rows;
}

async function getDevice(deviceId, orgId) {
  const result = await db.query(
    `SELECT d.id, d.site_id, d.name, d.ip_address, d.type, d.status, d.firmware_version, d.last_seen_at, d.created_at
     FROM devices d JOIN sites s ON s.id = d.site_id
     WHERE d.id = $1 AND s.org_id = $2`,
    [deviceId, orgId]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "Device not found");
  }
  return result.rows[0];
}

async function updateDevice(deviceId, orgId, data) {
  const { name, ipAddress, type, firmwareVersion, status } = data;
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
    [name || null, ipAddress || null, type || null, firmwareVersion || null, status || null, deviceId, orgId]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "Device not found");
  }
  return result.rows[0];
}

async function deleteDevice(deviceId, orgId) {
  const result = await db.query(
    `DELETE FROM devices d USING sites s
     WHERE d.id = $1 AND d.site_id = s.id AND s.org_id = $2
     RETURNING d.id`,
    [deviceId, orgId]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "Device not found");
  }
  return result.rows[0].id;
}

async function getDeviceHealth(deviceId, orgId) {
  const deviceCheck = await db.query(
    `SELECT d.id FROM devices d JOIN sites s ON s.id = d.site_id WHERE d.id = $1 AND s.org_id = $2`,
    [deviceId, orgId]
  );
  if (deviceCheck.rows.length === 0) {
    throw new AppError(404, "Device not found");
  }

  const result = await db.query(
    `SELECT id, checked_at, status, storage_used_pct, latency_ms
     FROM health_logs WHERE device_id = $1 ORDER BY checked_at DESC LIMIT 50`,
    [deviceId]
  );
  return result.rows;
}

async function getDeviceSnapshot(deviceId, orgId) {
  const result = await db.query(
    `SELECT d.id, d.name, d.onvif_xaddr, d.username_enc, d.password_enc
     FROM devices d JOIN sites s ON s.id = d.site_id
     WHERE d.id = $1 AND s.org_id = $2`,
    [deviceId, orgId]
  );

  if (result.rows.length === 0) {
    throw new AppError(404, "Device not found");
  }

  const device = result.rows[0];

  if (!device.onvif_xaddr) {
    throw new AppError(400, "This device has no ONVIF connection configured");
  }

  const decryptedDevice = {
    ...device,
    username_enc: decrypt(device.username_enc),
    password_enc: decrypt(device.password_enc),
  };

  try {
    return await getSnapshotUri(decryptedDevice);
  } catch (err) {
    console.error(err);
    throw new AppError(502, "Failed to get snapshot from camera", { message: err.message });
  }
}

module.exports = {
  createDevice,
  listDevices,
  getDevice,
  updateDevice,
  deleteDevice,
  getDeviceHealth,
  getDeviceSnapshot,
};