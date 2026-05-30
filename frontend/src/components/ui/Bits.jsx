import { STATUS_STYLES } from '../../lib/format.js';

export function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 ring-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 no-print">
      <div className={`mt-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} card`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// Inline field error message + red-border helper for inputs
export function FieldError({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-rose-600">{children}</p>;
}

export const inputCls = (hasError) =>
  `input ${hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500' : ''}`;

export function Spinner({ label = 'Loading…' }) {
  return <div className="py-10 text-center text-slate-500">{label}</div>;
}

export function EmptyState({ children }) {
  return <div className="py-10 text-center text-slate-400">{children}</div>;
}

// Animated skeleton rows for tables while data loads
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <table className="min-w-full">
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r} className="border-b border-slate-100">
            {Array.from({ length: cols }).map((__, c) => (
              <td key={c} className="px-3 py-3">
                <div className="h-3 w-full max-w-[140px] animate-pulse rounded bg-slate-200" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Page footer: "Showing X–Y of Z" + prev/next
export function Pagination({ page, pages, total, limit, onPage }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-sm text-slate-500">
      <span>
        Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b>
      </span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost px-2 py-1 text-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Prev
        </button>
        <span className="text-xs">Page {page} / {pages}</span>
        <button className="btn-ghost px-2 py-1 text-xs" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

// Clickable column header that toggles asc/desc and shows the arrow
export function SortHeader({ label, field, sort, onSort, className = '' }) {
  const [active, dir] = (sort || '').split(':');
  const isActive = active === field;
  const next = isActive && dir === 'desc' ? `${field}:asc` : `${field}:desc`;
  return (
    <th className={`th cursor-pointer select-none ${className}`} onClick={() => onSort(next)}>
      {label} {isActive ? (dir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const styles = {
    error: 'bg-rose-50 text-rose-700 ring-rose-200',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    info: 'bg-blue-50 text-blue-700 ring-blue-200',
  }[kind];
  return <div className={`rounded-md px-3 py-2 text-sm ring-1 ring-inset ${styles}`}>{children}</div>;
}

export function ConfirmButton({ onConfirm, children = 'Delete', className = 'btn-danger', message = 'Are you sure?' }) {
  return (
    <button
      className={className}
      onClick={() => {
        if (window.confirm(message)) onConfirm();
      }}
    >
      {children}
    </button>
  );
}
