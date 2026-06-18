const { ok, notFound } = require('../utils/response');
const categoriesService = require('../services/categories.service');

async function list(req, res, next) {
  try {
    const categories = await categoriesService.listCategories();
    return ok(res, categories);
  } catch (err) { next(err); }
}

async function getBySlug(req, res, next) {
  try {
    const category = await categoriesService.getCategoryBySlug(req.params.slug);
    return ok(res, category);
  } catch (err) {
    if (err.status === 404) return notFound(res, err.message);
    next(err);
  }
}

module.exports = { list, getBySlug };
