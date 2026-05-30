/**
 * Reusable pagination + sorting for list endpoints.
 *
 * Query params: page (default 1), limit (default 20, max 100), sort ("field:dir").
 * Returns a normalized envelope: { items, total, page, pages, limit }.
 */
export function parsePaging(query, { defaultSort = '-createdAt', maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // sort=price:desc  ->  { price: -1 }   (falls back to defaultSort)
  let sort = defaultSort;
  if (query.sort) {
    const [field, dir] = String(query.sort).split(':');
    if (field) sort = { [field]: dir === 'asc' ? 1 : -1 };
  }
  return { page, limit, skip, sort };
}

/**
 * Run a paginated query against a Mongoose model.
 * `options`: { filter, select, sort, populate, lean }.
 */
export async function paginate(model, query, options = {}) {
  const { defaultSort, maxLimit, ...rest } = options;
  const { page, limit, skip, sort } = parsePaging(query, { defaultSort, maxLimit });

  let q = model.find(rest.filter || {}).sort(sort).skip(skip).limit(limit);
  if (rest.select) q = q.select(rest.select);
  if (rest.populate) q = q.populate(rest.populate);
  if (rest.lean !== false) q = q.lean();

  const [items, total] = await Promise.all([
    q.exec(),
    model.countDocuments(rest.filter || {}),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) || 1, limit };
}
