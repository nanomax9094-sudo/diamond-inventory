import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api, { apiError } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Spinner, Alert } from '../../components/ui/Bits.jsx';
import PrintDocument from '../../components/PrintDocument.jsx';

export default function MemoView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = useAuth();
  const [memo, setMemo] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMemo((await api.get(`/memos/${id}`)).data);
    } catch (err) {
      setError(apiError(err));
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function convert() {
    if (!window.confirm('Convert this memo into an invoice? Diamonds will move to On Invoice.')) return;
    setBusy(true);
    try {
      const res = await api.post(`/memos/${id}/convert`);
      qc.invalidateQueries({ queryKey: ['memos'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['diamonds'] });
      navigate(`/invoices/${res.data._id}`);
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!memo) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <Link to="/memos" className="btn-ghost">← Back to Memos</Link>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => window.print()}>🖨 Print</button>
          {memo.status === 'active' && can('memos', 'update') && can('invoices', 'create') && (
            <button className="btn-gold" onClick={convert} disabled={busy}>
              {busy ? 'Converting…' : 'Convert to Invoice'}
            </button>
          )}
          {memo.status === 'converted' && memo.convertedInvoice && (
            <Link to={`/invoices/${memo.convertedInvoice}`} className="btn-primary">View Invoice →</Link>
          )}
        </div>
      </div>

      <PrintDocument kind="Memo" doc={memo} />
    </div>
  );
}
