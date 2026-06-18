const logger = require('../utils/logger');

/**
 * Central error handling middleware.
 * All errors passed via next(err) land here.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`${req.method} ${req.originalUrl} — ${status} — ${message}`, {
    stack: err.stack,
    body: req.body,
    user: req.user?.id,
  });

  res.status(status).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * 404 handler — must be registered after all routes.
 */
function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFound };
