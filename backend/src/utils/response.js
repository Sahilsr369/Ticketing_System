/**
 * Standardised API response helpers.
 * Every controller uses these — never raw res.json().
 */

const ok = (res, data = {}, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

const created = (res, data = {}, message = 'Created') =>
  ok(res, data, message, 201);

const noContent = (res) =>
  res.status(204).send();

const badRequest = (res, message = 'Bad request', errors = []) =>
  res.status(400).json({ success: false, error: { message, errors } });

const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, error: { message } });

const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, error: { message } });

const notFound = (res, message = 'Not found') =>
  res.status(404).json({ success: false, error: { message } });

const conflict = (res, message = 'Conflict') =>
  res.status(409).json({ success: false, error: { message } });

const serverError = (res, message = 'Internal server error') =>
  res.status(500).json({ success: false, error: { message } });

module.exports = { ok, created, noContent, badRequest, unauthorized, forbidden, notFound, conflict, serverError };
