const { ok, notFound } = require('../utils/response');
const { getTicketTimeline, getSlaReport } = require('../services/sla.service');

async function timeline(req, res, next) {
  try {
    const data = await getTicketTimeline(req.params.id);
    return ok(res, data);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

async function slaReport(req, res, next) {
  try {
    const data = await getSlaReport(req.query);
    return ok(res, data);
  } catch (err) { next(err); }
}

module.exports = { timeline, slaReport };
