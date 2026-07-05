const IORedis = require("ioredis");
require("dotenv").config();

// BullMQ requires this specific option to be null
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

connection.on("error", function (err) {
  console.error("Redis connection error:", err.message);
});

module.exports = connection;