const AppError = require("../utils/AppError");

function notFoundHandler(req, res, next) {
  next(new AppError(404, "Route not found"));
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, ...err.extra });
  }

  // Unexpected error — log full detail server-side, don't leak internals to the client
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

module.exports = { notFoundHandler, errorHandler };