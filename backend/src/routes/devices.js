const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");
const { requireRole } = require("../middleware/requireRole");
const asyncHandler = require("../utils/asyncHandler");
const devicesService = require("../services/devicesService");

const router = express.Router();

router.use(requireAuth, scopeToOrg);

router.post(
  "/",
  requireRole("admin", "technician"),
  asyncHandler(async function (req, res) {
    const device = await devicesService.createDevice(req.orgId, req.body);
    res.status(201).json(device);
  })
);

router.get(
  "/",
  asyncHandler(async function (req, res) {
    const devices = await devicesService.listDevices(req.orgId, req.query.siteId);
    res.json(devices);
  })
);

router.get(
  "/:id",
  asyncHandler(async function (req, res) {
    const device = await devicesService.getDevice(req.params.id, req.orgId);
    res.json(device);
  })
);

router.put(
  "/:id",
  requireRole("admin", "technician"),
  asyncHandler(async function (req, res) {
    const device = await devicesService.updateDevice(req.params.id, req.orgId, req.body);
    res.json(device);
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async function (req, res) {
    const id = await devicesService.deleteDevice(req.params.id, req.orgId);
    res.json({ status: "deleted", id: id });
  })
);

router.get(
  "/:id/health",
  asyncHandler(async function (req, res) {
    const logs = await devicesService.getDeviceHealth(req.params.id, req.orgId);
    res.json(logs);
  })
);

router.get(
  "/:id/snapshot",
  asyncHandler(async function (req, res) {
    const uri = await devicesService.getDeviceSnapshot(req.params.id, req.orgId);
    res.json({ uri: uri });
  })
);

module.exports = router;