const { Client } = require("pg");

const client = new Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "cctv_fleet",
});

client.connect()
  .then(function () {
    return client.query("SELECT NOW()");
  })
  .then(function (res) {
    console.log("Success:", res.rows);
    client.end();
  })
  .catch(function (err) {
    console.error("Failed:", err.message);
    client.end();
  });