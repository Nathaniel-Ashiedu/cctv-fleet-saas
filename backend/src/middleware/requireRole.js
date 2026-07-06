// Restricts a route to specific roles. Must run AFTER requireAuth,
// since it reads req.user.role set by the JWT middleware.
function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Missing user role context" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to perform this action" });
    }
    next();
  };
}

module.exports = { requireRole };