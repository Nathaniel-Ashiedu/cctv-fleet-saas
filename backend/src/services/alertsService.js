const db = require("../config/db");
const AppError = require("../utils/AppError");

async function listAlerts(orgId, resolvedFilter) {
  let query = `
    SELECT a.id, a.device_id, d.name AS device_name, a.type, a.message, a.resolved, a.created_at
    FROM alerts a
    JOIN devices d ON d.id = a.device_id
    JOIN sites s ON s.id = d.site_id
    WHERE s.org_id = $1
  `;
  const params = [orgId];

  if (resolvedFilter === "true" || resolvedFilter === "false") {
    query += " AND a.resolved = $2";
    params.push(resolvedFilter === "true");
  }

  query += " ORDER BY a.created_at DESC LIMIT 100";

  const result = await db.query(query, params);
  return result.rows;
}

async function resolveAlert(alertId, orgId) {
  const result = await db.query(
    `UPDATE alerts a SET resolved = true
     FROM devices d, sites s
     WHERE a.id = $1 AND a.device_id = d.id AND d.site_id = s.id AND s.org_id = $2
     RETURNING a.id, a.resolved`,
    [alertId, orgId]
  );
  if (result.rows.length === 0) {
    throw new AppError(404, "Alert not found");
  }
  return result.rows[0];
}

module.exports = { listAlerts, resolveAlert };