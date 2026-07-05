const { Queue, Worker } = require("bullmq");
const connection = require("../config/redis");
const db = require("../config/db");

const QUEUE_NAME = "device-health-check";
const healthCheckQueue = new Queue(QUEUE_NAME, { connection });

// Simulates checking a single device. In the real version, this is where
// ONVIF polling (via the `onvif` package) will replace the random logic.
function simulateCheck() {
  const isOnline = Math.random() > 0.15; // ~85% chance online, mimics real-world flakiness
  const storageUsedPct = Math.round(Math.random() * 100 * 100) / 100;
  const latencyMs = isOnline ? Math.round(20 + Math.random() * 180) : null;

  return {
    status: isOnline ? "online" : "offline",
    storageUsedPct: storageUsedPct,
    latencyMs: latencyMs,
  };
}

// Processes one "check-all-devices" job: loops every device in the DB,
// simulates a health check, writes a health_logs row, updates the device's
// status/last_seen_at, and raises an alert if something looks bad.
const worker = new Worker(
  QUEUE_NAME,
  async function (job) {
    const devicesResult = await db.query("SELECT id, name, status FROM devices");
    const devices = devicesResult.rows;

    for (const device of devices) {
      const check = simulateCheck();

      await db.query(
        `INSERT INTO health_logs (device_id, status, storage_used_pct, latency_ms, raw_response)
         VALUES ($1, $2, $3, $4, $5)`,
        [device.id, check.status, check.storageUsedPct, check.latencyMs, JSON.stringify(check)]
      );

      await db.query(
        `UPDATE devices SET status = $1, last_seen_at = now() WHERE id = $2`,
        [check.status, device.id]
      );

      // Raise an alert if the device just went offline
      if (check.status === "offline" && device.status !== "offline") {
        await db.query(
          `INSERT INTO alerts (device_id, type, message) VALUES ($1, 'offline', $2)`,
          [device.id, `${device.name} went offline`]
        );
      }

      // Raise an alert if storage is critically high
      if (check.storageUsedPct > 90) {
        await db.query(
          `INSERT INTO alerts (device_id, type, message) VALUES ($1, 'storage_high', $2)`,
          [device.id, `${device.name} storage at ${check.storageUsedPct}%`]
        );
      }
    }

    return { checked: devices.length };
  },
  { connection }
);

worker.on("completed", function (job, result) {
  console.log(`Health check job ${job.id} completed — checked ${result.checked} device(s)`);
});

worker.on("failed", function (job, err) {
  console.error(`Health check job ${job ? job.id : "unknown"} failed:`, err.message);
});

// Schedules the repeating job. Called once at app startup.
async function scheduleHealthChecks() {
  await healthCheckQueue.add(
    "check-all-devices",
    {},
    {
      repeat: { every: 30000 }, // every 30 seconds — fine for a demo, tune later
      removeOnComplete: { count: 20 },
      removeOnFail: { count: 20 },
    }
  );
  console.log("Scheduled recurring device health checks (every 30s)");
}

module.exports = { healthCheckQueue, scheduleHealthChecks };