const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", function (err) {
  console.error("Unexpected Postgres pool error:", err);
});

module.exports = {
  query: function (text, params) {
    return pool.query(text, params);
  },
  pool: pool,
};