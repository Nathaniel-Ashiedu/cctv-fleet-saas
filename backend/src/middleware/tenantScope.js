// This runs AFTER requireAuth, so req.user.orgId is already available.
// It just makes org scoping explicit and reusable, and gives us one place
// to add extra checks later (e.g. role-based restrictions).
function scopeToOrg(req, res, next) {
  if (!req.user || !req.user.orgId) {
    return res.status(401).json({ error: "Missing organization context" });
  }
  req.orgId = req.user.orgId;
  next();
}

module.exports = { scopeToOrg };