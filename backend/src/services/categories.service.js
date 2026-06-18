const prisma = require('../utils/prisma');

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  sortOrder: true,
  active: true,
  subcategories: {
    where:   { active: true },
    orderBy: { sortOrder: 'asc' },
    select:  { id: true, name: true, slug: true, sortOrder: true },
  },
};

// ─── Return all active categories with their subcategories ───────────────────
async function listCategories() {
  return prisma.category.findMany({
    where:   { active: true },
    orderBy: { sortOrder: 'asc' },
    select:  CATEGORY_SELECT,
  });
}

// ─── Return a single category by id or slug ──────────────────────────────────
async function getCategoryBySlug(slug) {
  const cat = await prisma.category.findUnique({
    where:  { slug },
    select: CATEGORY_SELECT,
  });
  if (!cat) throw Object.assign(new Error('Category not found'), { status: 404 });
  return cat;
}

// ─── Validate that a subcategory belongs to the given category ───────────────
async function validateSubcategory(categoryId, subcategoryId) {
  if (!subcategoryId) return true; // optional field
  const sub = await prisma.subcategory.findFirst({
    where: { id: subcategoryId, categoryId, active: true },
  });
  return !!sub;
}

module.exports = { listCategories, getCategoryBySlug, validateSubcategory };
