const { validationResult } = require('express-validator');
const { badRequest }       = require('../utils/response');

/**
 * Runs after express-validator chains.
 * If there are errors, returns 400 with details.
 * Otherwise calls next().
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, 'Validation failed', errors.array().map(e => ({
      field: e.path,
      message: e.msg,
    })));
  }
  next();
}

module.exports = { validate };
