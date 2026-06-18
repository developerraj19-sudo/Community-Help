const logger = require('../utils/logger');

/**
 * Global Error Handler Middleware
 * Intercepts all unhandled errors, logs them using Winston, 
 * and formats the response safely depending on the environment.
 */
const errorHandler = (err, req, res, next) => {
  // Determine status code (default to 500 Internal Server Error)
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Set message
  let message = err.message || 'Server Error';

  // Specific Error Handling (e.g., Mongoose bad ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Log the error securely using Winston
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Hide internal stack trace from client in production
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? '🥞 [Hidden]' : err.stack,
  });
};

module.exports = errorHandler;
