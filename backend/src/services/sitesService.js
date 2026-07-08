const db = require("../config/db");
const AppError = require("../utils/AppError");

async function createSite(orgId, name, address) {
  if (!name) {
    throw new AppError(400, "name is required");
  }

  const orgResult = await db.query("SELECT plan FROM organizations WHERE id = $1", [orgId]);
  const plan = orgResult.rows[0]?.plan || "free";

  if (plan === "free") {
    const countResult = await db.query("SELECT COUNT(*) FROM sites WHERE org_id = $1", [orgId]);
    const siteCount = parseInt(countResult.rows[0].count, 10);
    if (siteCount >= 1) {
      throw new AppError(403, "Free plan is limited to 1 site. Upgrade to Pro for unlimited sites.", {
        limitReached: true,
      });
    }
  }

  const result = await db.query(
    "INSERT INTO sites (org_id, name, address) VALUES ($1, $2, $3) RETURNING id, name, address, created_at",
    [orgId, name, address || null]
  );
  return result.rows[0];
}

async function listSites(orgId) {
  const result = await db.query(
    "SELECT id, name, address, created_at FROM sites WHERE org_id = $1 ORDER BY created_at DESC",
    [orgId]
  );
  return result.rows;
}

async function getSite(siteId, orgId) {
  const result = await db.query(
    "SELECT id, name, address, created_at FROM sites WHERE id = $1 AND org_id = $2",
    [siteId, orgId]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "Site not found");
  }
  return result.rows[0];
}

async function updateSite(siteId, orgId, name, address) {
  const result = await db.query(
    "UPDATE sites SET name = COALESCE($1, name), address = COALESCE($2, address) WHERE id = $3 AND org_id = $4 RETURNING id, name, address, created_at",
    [name || null, address || null, siteId, orgId]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "Site not found");
  }
  return result.rows[0];
}

async function deleteSite(siteId, orgId) {
  const result = await db.query("DELETE FROM sites WHERE id = $1 AND org_id = $2 RETURNING id", [
    siteId,
    orgId,
  ]);
  if (result.rows.length === 0) {
    throw new AppError(404, "Site not found");
  }
  return result.rows[0].id;
}

module.exports = { createSite, listSites, getSite, updateSite, deleteSite };