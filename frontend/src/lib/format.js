export const STATUS_STYLES = {
  Added: 'bg-slate-100 text-slate-700 ring-slate-200',
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'On Memo': 'bg-amber-50 text-amber-700 ring-amber-200',
  'On Invoice': 'bg-blue-50 text-blue-700 ring-blue-200',
  Sold: 'bg-rose-50 text-rose-700 ring-rose-200',
  'On Hold': 'bg-violet-50 text-violet-700 ring-violet-200',
};

export const DIAMOND_STATUSES = [
  'Added',
  'Available',
  'On Memo',
  'On Invoice',
  'Sold',
  'On Hold',
];

export function money(n) {
  const num = Number(n || 0);
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
