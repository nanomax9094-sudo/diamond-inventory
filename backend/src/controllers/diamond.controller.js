import Diamond from '../models/Diamond.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { uploadBuffer, cloudinaryEnabled } from '../config/cloudinary.js';
import { parseDiamondsExcel } from '../services/excelParser.js';
import { toggleHold } from '../services/statusEngine.js';
import { paginate } from '../utils/paginate.js';

// Lightweight projection for the list/table view — only the fields the grid renders
// (+ the few the row actions need). Full attributes come from GET /diamonds/:id.
const LIST_FIELDS =
  'sku shape carat color clarity certificateType certificateNumber price status';

// `cost` is sensitive margin data — only admins should ever receive it.
function serialize(diamond, user) {
  const obj = typeof diamond.toJSON === 'function' ? diamond.toJSON() : diamond;
  if (user?.role !== 'admin') delete obj.cost;
  return obj;
}

export const listDiamonds = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ sku: rx }, { certificateNumber: rx }, { shape: rx }, { color: rx }];
  }
  // Paginated + sorted + lean projection (only the fields the table renders).
  const result = await paginate(Diamond, req.query, { filter, select: LIST_FIELDS });
  res.json(result);
});

// Aggregated inventory stats for the dashboard — computed in the DB, not by
// shipping every document to the client.
export const diamondStats = asyncHandler(async (_req, res) => {
  const [byStatus] = await Promise.all([
    Diamond.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$price' } } },
    ]),
  ]);
  const statusCounts = {};
  let total = 0;
  let inventoryValue = 0;
  for (const row of byStatus) {
    statusCounts[row._id] = row.count;
    total += row.count;
    inventoryValue += row.value || 0;
  }
  res.json({ total, inventoryValue, statusCounts });
});

export const getDiamond = asyncHandler(async (req, res) => {
  const diamond = await Diamond.findById(req.params.id);
  if (!diamond) return res.status(404).json({ message: 'Diamond not found.' });
  res.json(serialize(diamond, req.user));
});

export const createDiamond = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  delete data.status; // status is engine-controlled; new diamonds default to Available
  if (req.user?.role !== 'admin') delete data.cost; // only admins set cost
  await attachUploads(req, data);
  const diamond = await Diamond.create(data);
  res.status(201).json(serialize(diamond, req.user));
});

export const updateDiamond = asyncHandler(async (req, res) => {
  const diamond = await Diamond.findById(req.params.id);
  if (!diamond) return res.status(404).json({ message: 'Diamond not found.' });

  const data = { ...req.body };
  delete data.status; // prevent manual status edits via the generic update
  if (req.user?.role !== 'admin') delete data.cost; // non-admins can't see or change cost
  await attachUploads(req, data);
  Object.assign(diamond, data);
  await diamond.save();
  res.json(serialize(diamond, req.user));
});

export const deleteDiamond = asyncHandler(async (req, res) => {
  const diamond = await Diamond.findById(req.params.id);
  if (!diamond) return res.status(404).json({ message: 'Diamond not found.' });
  if (['On Memo', 'On Invoice'].includes(diamond.status)) {
    return res
      .status(409)
      .json({ message: `Cannot delete a diamond that is "${diamond.status}".` });
  }
  await diamond.deleteOne();
  res.json({ message: 'Diamond deleted.' });
});

// PATCH /:id/hold  body: { hold: true|false }
export const setHold = asyncHandler(async (req, res) => {
  const diamond = await Diamond.findById(req.params.id);
  if (!diamond) return res.status(404).json({ message: 'Diamond not found.' });
  const updated = await toggleHold(diamond, !!req.body.hold);
  res.json(updated);
});

// POST /bulk-upload  (multipart form field: "file")
export const bulkUpload = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No Excel file uploaded (field "file").' });

  const { rows, errors } = parseDiamondsExcel(req.file.buffer);

  // Skip SKUs that already exist
  const skus = rows.map((r) => r.sku);
  const existing = await Diamond.find({ sku: { $in: skus } }).select('sku');
  const existingSet = new Set(existing.map((d) => d.sku));

  const toInsert = [];
  for (const row of rows) {
    if (existingSet.has(row.sku)) {
      errors.push({ row: row.sku, message: 'SKU already exists' });
    } else {
      existingSet.add(row.sku); // also guards in-file duplicates
      toInsert.push(row);
    }
  }

  let inserted = 0;
  if (toInsert.length) {
    const result = await Diamond.insertMany(toInsert, { ordered: false });
    inserted = result.length;
  }

  res.status(201).json({
    inserted,
    skipped: rows.length - inserted + errors.filter((e) => e.message !== 'Missing SKU').length,
    totalRows: rows.length + errors.filter((e) => e.message === 'Missing SKU').length,
    errors,
  });
});

async function attachUploads(req, data) {
  if (!req.files) return;
  if (req.files.image?.[0]) {
    const url = await uploadBuffer(req.files.image[0].buffer, 'diamonds/images');
    if (url) data.imageUrl = url;
  }
  if (req.files.certificate?.[0]) {
    const url = await uploadBuffer(req.files.certificate[0].buffer, 'diamonds/certificates');
    if (url) data.certificateUrl = url;
  }
  // Surface a hint if files were sent but Cloudinary isn't configured
  if (!cloudinaryEnabled && (req.files.image || req.files.certificate)) {
    data._uploadNote = 'Cloudinary not configured; file ignored.';
  }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
