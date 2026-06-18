const morgan = require('morgan');
const logger = require('../utils/logger');

// Stream morgan output through winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

const requestLogger = morgan(
  ':method :url :status :res[content-length]b - :response-time ms',
  { stream }
);

module.exports = requestLogger;
