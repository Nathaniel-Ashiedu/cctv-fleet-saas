const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");
const asyncHandler = require("../utils/asyncHandler");
const alertsService = require("../services/alertsService");

const router = express.Router();

router.use(requireAuth, scopeToOrg);

router.get(
  "/",
  asyncHandler(async function (req, res) {
    const alerts = await alertsService.listAlerts(req.orgId, req.query.resolved);
    res.json(alerts);
  })
);

router.put(
  "/:id/resolve",
  asyncHandler(async function (req, res) {
    const alert = await alertsService.resolveAlert(req.params.id, req.orgId);
    res.json(alert);
  })
);

module.exports = router;