import { useState } from 'react';
import api, { apiError } from '../../api/client.js';
import { Alert } from '../../components/ui/Bits.jsx';

export default function BulkUpload({ onDone }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return setError('Choose an Excel (.xlsx) or CSV file first.');
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/diamonds/bulk-upload', fd);
      setResult(res.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Expected columns (header row, case-insensitive):</p>
        <code className="mt-1 block text-xs">
          SKU, Certificate Type, Certificate Number, Shape, Carat, Color, Clarity, Cut, Polish, Symmetry, Measurements, Origin, Price, Cost
        </code>
        <p className="mt-2 text-xs">Only <b>SKU</b> is required. Duplicate or existing SKUs are skipped and reported.</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Alert>{error}</Alert>
        <input
          className="input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onDone}>Close</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Uploading…' : 'Upload'}</button>
        </div>
      </form>

      {result && (
        <div className="space-y-2">
          <Alert kind="success">
            Inserted {result.inserted} diamond(s). Skipped {result.skipped}.
          </Alert>
          {result.errors?.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 p-3 text-xs">
              <p className="mb-1 font-medium text-slate-600">Issues:</p>
              <ul className="list-inside list-disc space-y-0.5 text-slate-500">
                {result.errors.map((e, i) => (
                  <li key={i}>Row/SKU {String(e.row)}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <button className="btn-primary" onClick={onDone}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
