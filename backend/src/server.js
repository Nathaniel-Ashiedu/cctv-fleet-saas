const app = require("./app");
const { scheduleHealthChecks } = require("./jobs/deviceHealthCheck");

const PORT = process.env.PORT || 4000;
app.listen(PORT, async function () {
  console.log("Backend running on http://localhost:" + PORT);
  await scheduleHealthChecks();
});