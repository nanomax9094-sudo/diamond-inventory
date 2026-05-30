import xlsx from 'xlsx';

/**
 * Map of accepted Excel header (lower-cased, trimmed) -> Diamond field.
 * Keeps the importer forgiving about column naming/casing.
 */
const HEADER_MAP = {
  sku: 'sku',
  'certificate type': 'certificateType',
  certtype: 'certificateType',
  'certificate number': 'certificateNumber',
  certno: 'certificateNumber',
  'cert number': 'certificateNumber',
  shape: 'shape',
  carat: 'carat',
  weight: 'carat',
  color: 'color',
  colour: 'color',
  clarity: 'clarity',
  cut: 'cut',
  polish: 'polish',
  symmetry: 'symmetry',
  measurements: 'measurements',
  origin: 'origin',
  type: 'origin',
  price: 'price',
  cost: 'cost',
};

const NUMERIC = new Set(['carat', 'price', 'cost']);

function normalizeOrigin(val) {
  const v = String(val || '').toLowerCase();
  if (v.includes('nat')) return 'natural';
  return 'lab-grown';
}

/**
 * Parse an Excel/CSV buffer into validated diamond rows.
 * Returns { rows: [validDiamondObj], errors: [{ row, message }] }.
 */
export function parseDiamondsExcel(buffer) {
  const wb = xlsx.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const rows = [];
  const errors = [];

  raw.forEach((record, i) => {
    const rowNum = i + 2; // +1 for header, +1 for 1-based
    const mapped = {};

    for (const [key, value] of Object.entries(record)) {
      const field = HEADER_MAP[String(key).trim().toLowerCase()];
      if (!field) continue;
      mapped[field] = value;
    }

    if (!mapped.sku || String(mapped.sku).trim() === '') {
      errors.push({ row: rowNum, message: 'Missing SKU' });
      return;
    }

    mapped.sku = String(mapped.sku).trim().toUpperCase();
    for (const f of NUMERIC) {
      if (mapped[f] !== undefined && mapped[f] !== '') {
        const n = Number(mapped[f]);
        mapped[f] = Number.isFinite(n) ? n : 0;
      }
    }
    if (mapped.origin !== undefined) mapped.origin = normalizeOrigin(mapped.origin);
    if (mapped.certificateType) {
      mapped.certificateType = String(mapped.certificateType).trim().toUpperCase();
      if (!['IGI', 'GIA', 'OTHER'].includes(mapped.certificateType)) {
        mapped.certificateType = 'OTHER';
      }
    }
    mapped.status = 'Available';
    rows.push(mapped);
  });

  return { rows, errors };
}
