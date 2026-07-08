const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { scopeToOrg } = require("../middleware/tenantScope");
const { requireRole } = require("../middleware/requireRole");
const asyncHandler = require("../utils/asyncHandler");
const sitesService = require("../services/sitesService");

const router = express.Router();

router.use(requireAuth, scopeToOrg);

router.post(
  "/",
  requireRole("admin", "technician"),
  asyncHandler(async function (req, res) {
    const site = await sitesService.createSite(req.orgId, req.body.name, req.body.address);
    res.status(201).json(site);
  })
);

router.get(
  "/",
  asyncHandler(async function (req, res) {
    const sites = await sitesService.listSites(req.orgId);
    res.json(sites);
  })
);

router.get(
  "/:id",
  asyncHandler(async function (req, res) {
    const site = await sitesService.getSite(req.params.id, req.orgId);
    res.json(site);
  })
);

router.put(
  "/:id",
  requireRole("admin", "technician"),
  asyncHandler(async function (req, res) {
    const site = await sitesService.updateSite(req.params.id, req.orgId, req.body.name, req.body.address);
    res.json(site);
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async function (req, res) {
    const id = await sitesService.deleteSite(req.params.id, req.orgId);
    res.json({ status: "deleted", id: id });
  })
);

module.exports = router;