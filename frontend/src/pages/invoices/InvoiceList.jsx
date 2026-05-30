import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api, { apiError } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { money, formatDate } from '../../lib/format.js';
import { Modal, SkeletonTable, EmptyState, Alert, ConfirmButton, Pagination } from '../../components/ui/Bits.jsx';
import TransactionForm from '../../components/TransactionForm.jsx';

const STATUS = {
  open: 'bg-blue-50 text-blue-700 ring-blue-200',
  finalized: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function InvoiceList() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const params = { page, limit: 20 };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoices', 'list', params],
    queryFn: async () => (await api.get('/invoices', { params })).data,
    placeholderData: keepPreviousData,
  });
  const items = data?.items || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/invoices/${id}`),
    onError: (err) => alert(apiError(err)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['diamonds'] });
    },
  });

  function onCreated() {
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['diamonds'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-900">
          Invoices {data?.total ? <span className="text-base font-normal text-slate-400">({data.total})</span> : null}
        </h1>
        {can('invoices', 'create') && <button className="btn-primary" onClick={() => setOpen(true)}>+ Create Invoice</button>}
      </div>

      {isError && <Alert>{apiError(error)}</Alert>}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : items.length === 0 ? (
          <EmptyState>No invoices yet.</EmptyState>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Invoice #</th>
                <th className="th">Customer</th>
                <th className="th">Items</th>
                <th className="th">Total</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50">
                  <td className="td font-medium">{inv.invoiceNumber}</td>
                  <td className="td">{inv.customer?.name}</td>
                  <td className="td">{inv.items?.length}</td>
                  <td className="td">{money(inv.totalAmount)}</td>
                  <td className="td">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="td">{formatDate(inv.createdAt)}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <Link to={`/invoices/${inv._id}`} className="btn-ghost px-2 py-1 text-xs">View / Print</Link>
                      {can('invoices', 'delete') && inv.status !== 'finalized' && (
                        <ConfirmButton className="btn-danger px-2 py-1 text-xs" message={`Delete ${inv.invoiceNumber}?`} onConfirm={() => deleteMutation.mutate(inv._id)}>
                          Delete
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data && <Pagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} onPage={setPage} />}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Invoice" wide>
        <TransactionForm endpoint="/invoices" submitLabel="Create Invoice" onDone={onCreated} />
      </Modal>
    </div>
  );
}
