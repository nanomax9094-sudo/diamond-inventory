import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api, { apiError } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Spinner, Alert } from '../../components/ui/Bits.jsx';
import PrintDocument from '../../components/PrintDocument.jsx';

export default function InvoiceView() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setInvoice((await api.get(`/invoices/${id}`)).data);
    } catch (err) {
      setError(apiError(err));
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function finalize() {
    if (!window.confirm('Finalize this sale? Diamonds will be marked as Sold.')) return;
    setBusy(true);
    try {
      await api.patch(`/invoices/${id}/finalize`);
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['diamonds'] });
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!invoice) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <Link to="/invoices" className="btn-ghost">← Back to Invoices</Link>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => window.print()}>🖨 Print</button>
          {invoice.status === 'open' && can('invoices', 'update') && (
            <button className="btn-gold" onClick={finalize} disabled={busy}>
              {busy ? 'Finalizing…' : 'Finalize Sale (→ Sold)'}
            </button>
          )}
          {invoice.sourceMemo && (
            <Link to={`/memos/${invoice.sourceMemo._id || invoice.sourceMemo}`} className="btn-ghost">
              ← Source Memo
            </Link>
          )}
        </div>
      </div>

      <PrintDocument kind="Invoice" doc={invoice} />
    </div>
  );
}
