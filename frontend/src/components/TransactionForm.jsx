import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { apiError } from '../api/client.js';
import { useDebounce } from '../lib/useDebounce.js';
import { money } from '../lib/format.js';
import { Alert } from './ui/Bits.jsx';

/**
 * Shared create-form for Memos and Invoices.
 * Pick a customer + one or more *available* diamonds (searchable, server-side),
 * see a live order summary, then POST to the given endpoint.
 */
export default function TransactionForm({ endpoint, onDone, submitLabel = 'Create' }) {
  const [customer, setCustomer] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selected, setSelected] = useState({}); // id -> diamond (persists across searches)
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const customersQ = useQuery({
    queryKey: ['customers', 'picker'],
    queryFn: async () => (await api.get('/customers', { params: { limit: 200 } })).data.items,
  });

  const diamondsQ = useQuery({
    queryKey: ['diamonds', 'picker', debouncedSearch],
    queryFn: async () =>
      (await api.get('/diamonds', { params: { status: 'Available', search: debouncedSearch, limit: 50 } })).data.items,
    placeholderData: keepPreviousData,
  });

  const customers = customersQ.data || [];
  const diamonds = diamondsQ.data || [];
  const chosen = useMemo(() => Object.values(selected), [selected]);
  const total = chosen.reduce((s, d) => s + (d.price || 0), 0);

  function toggle(d) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[d._id]) delete next[d._id];
      else next[d._id] = d;
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    if (!customer) return setError('Please select a customer.');
    if (chosen.length === 0) return setError('Please select at least one diamond.');
    setBusy(true);
    setError('');
    try {
      await api.post(endpoint, { customer, diamondIds: chosen.map((d) => d._id), notes });
      onDone();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{error}</Alert>

      <div>
        <label className="label">Customer *</label>
        <select className="input" value={customer} onChange={(e) => setCustomer(e.target.value)}>
          <option value="">— Select a customer —</option>
          {customers.map((c) => (
            <option key={c._id} value={c._id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
          ))}
        </select>
        {customersQ.isSuccess && customers.length === 0 && (
          <p className="mt-1 text-xs text-rose-600">No customers yet — add one first.</p>
        )}
      </div>

      <div>
        <label className="label">Select Diamonds (available only) — {chosen.length} selected</label>
        <input
          className="input mb-2"
          placeholder="Search available diamonds by SKU, shape, color…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
          {diamondsQ.isLoading ? (
            <div className="p-4 text-center text-sm text-slate-400">Loading…</div>
          ) : diamonds.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">No matching available diamonds.</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="th w-10"></th>
                  <th className="th">SKU</th>
                  <th className="th">Shape</th>
                  <th className="th">Carat</th>
                  <th className="th">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diamonds.map((d) => (
                  <tr key={d._id} className={`cursor-pointer hover:bg-slate-50 ${selected[d._id] ? 'bg-gold-500/10' : ''}`} onClick={() => toggle(d)}>
                    <td className="td"><input type="checkbox" checked={!!selected[d._id]} readOnly /></td>
                    <td className="td font-medium">{d.sku}</td>
                    <td className="td">{d.shape}</td>
                    <td className="td">{d.carat}</td>
                    <td className="td">{money(d.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order summary — selected items, persists across searches */}
      <div className="rounded-md bg-slate-50 p-3">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Order Summary</div>
        {chosen.length > 0 && (
          <ul className="mb-2 max-h-24 overflow-y-auto text-sm text-slate-600">
            {chosen.map((d) => (
              <li key={d._id} className="flex justify-between">
                <span>{d.sku} — {d.shape}</span>
                <span>{money(d.price)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
          <span>{chosen.length} item(s)</span>
          <span className="text-lg font-semibold text-navy-900">{money(total)}</span>
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
