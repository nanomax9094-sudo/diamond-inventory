import { money, formatDate } from '../lib/format.js';

/**
 * Branded, printable document for a Memo or Invoice.
 * The #print-area id + print CSS in index.css isolate this when printing.
 */
export default function PrintDocument({ kind, doc }) {
  const number = kind === 'Memo' ? doc.memoNumber : doc.invoiceNumber;
  const customer = doc.customer || {};

  return (
    <div id="print-area" className="card p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-navy-900 pb-4">
        <div>
          <div className="text-2xl font-bold tracking-widest text-navy-900">STIENHARDT</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-gold-500">
            Ethical Lab-Grown Diamond Jewelry
          </div>
          <div className="mt-1 text-xs text-slate-500">New York • Surat • stienhardt.com</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold uppercase text-navy-900">{kind}</div>
          <div className="text-sm text-slate-600">{number}</div>
          <div className="text-xs text-slate-500">{formatDate(doc.createdAt)}</div>
        </div>
      </div>

      {/* Customer */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Billed To</div>
          <div className="mt-1 font-medium text-navy-900">{customer.name}</div>
          {customer.company && <div className="text-slate-600">{customer.company}</div>}
          {customer.email && <div className="text-slate-600">{customer.email}</div>}
          {customer.phone && <div className="text-slate-600">{customer.phone}</div>}
          {customer.address && <div className="text-slate-600">{customer.address}</div>}
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</div>
          <div className="mt-1 capitalize text-navy-900">{doc.status}</div>
        </div>
      </div>

      {/* Line items */}
      <table className="mt-6 min-w-full border-t border-slate-200 text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2">#</th>
            <th className="py-2">SKU</th>
            <th className="py-2">Description</th>
            <th className="py-2">Cert</th>
            <th className="py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {doc.items?.map((it, i) => {
            const d = it.diamond || {};
            return (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{i + 1}</td>
                <td className="py-2 font-medium">{d.sku}</td>
                <td className="py-2">
                  {[d.shape, d.carat && `${d.carat}ct`, d.color, d.clarity].filter(Boolean).join(' · ')}
                </td>
                <td className="py-2">{[d.certificateType, d.certificateNumber].filter(Boolean).join(' ')}</td>
                <td className="py-2 text-right">{money(it.price)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Items</span>
            <span>{doc.items?.length || 0}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-navy-900">
            <span>Total</span>
            <span>{money(doc.totalAmount)}</span>
          </div>
        </div>
      </div>

      {doc.notes && (
        <div className="mt-6 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</div>
          <p className="mt-1 text-slate-600">{doc.notes}</p>
        </div>
      )}

      <div className="mt-10 border-t border-slate-200 pt-3 text-center text-xs text-slate-400">
        Thank you for your business. • STIENHARDT & STONES
      </div>
    </div>
  );
}
