import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api, { apiError } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useDebounce } from '../../lib/useDebounce.js';
import { money, DIAMOND_STATUSES } from '../../lib/format.js';
import {
  StatusBadge, Modal, SkeletonTable, EmptyState, Alert, ConfirmButton, Pagination, SortHeader,
} from '../../components/ui/Bits.jsx';
import DiamondForm from './DiamondForm.jsx';
import BulkUpload from './BulkUpload.jsx';

export default function DiamondList() {
  const { can } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); // live search
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Reset to page 1 whenever the query inputs change
  useEffect(() => setPage(1), [debouncedSearch, statusFilter, sort]);

  const params = { search: debouncedSearch, status: statusFilter, sort, page, limit: 20 };
  const queryKey = ['diamonds', 'list', params];

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/diamonds', { params })).data,
    placeholderData: keepPreviousData, // smooth paging — keep old rows visible while fetching
  });

  const items = data?.items || [];

  const holdMutation = useMutation({
    mutationFn: ({ id, hold }) => api.patch(`/diamonds/${id}/hold`, { hold }),
    // Optimistic: flip the badge instantly, roll back if the server rejects
    onMutate: async ({ id, hold }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old) =>
        old && {
          ...old,
          items: old.items.map((d) =>
            d._id === id ? { ...d, status: hold ? 'On Hold' : 'Available' } : d
          ),
        }
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      alert(apiError(err));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['diamonds'] });
      qc.invalidateQueries({ queryKey: ['diamondStats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/diamonds/${id}`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, (old) =>
        old && { ...old, items: old.items.filter((d) => d._id !== id), total: old.total - 1 }
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      alert(apiError(err));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['diamonds'] });
      qc.invalidateQueries({ queryKey: ['diamondStats'] });
    },
  });

  async function openEdit(d) {
    try {
      const full = (await api.get(`/diamonds/${d._id}`)).data;
      setEditing(full);
      setFormOpen(true);
    } catch (err) {
      alert(apiError(err));
    }
  }

  function onSaved() {
    setFormOpen(false);
    setBulkOpen(false);
    qc.invalidateQueries({ queryKey: ['diamonds'] });
    qc.invalidateQueries({ queryKey: ['diamondStats'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy-900">
          Diamonds {data?.total ? <span className="text-base font-normal text-slate-400">({data.total})</span> : null}
        </h1>
        <div className="flex gap-2">
          {can('diamonds', 'create') && (
            <>
              <button className="btn-ghost" onClick={() => setBulkOpen(true)}>Bulk Upload (Excel)</button>
              <button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>+ Add Diamond</button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <input
            className="input w-72"
            placeholder="Search SKU, cert, shape, color…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isFetching && <span className="absolute right-3 top-2.5 text-xs text-slate-400">…</span>}
        </div>
        <select className="input w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {DIAMOND_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isError && <Alert>{apiError(error)}</Alert>}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <SkeletonTable rows={8} cols={9} />
        ) : items.length === 0 ? (
          <EmptyState>No diamonds found.</EmptyState>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <SortHeader label="SKU" field="sku" sort={sort} onSort={setSort} />
                <th className="th">Shape</th>
                <SortHeader label="Carat" field="carat" sort={sort} onSort={setSort} />
                <th className="th">Color</th>
                <th className="th">Clarity</th>
                <th className="th">Cert</th>
                <SortHeader label="Price" field="price" sort={sort} onSort={setSort} />
                <SortHeader label="Status" field="status" sort={sort} onSort={setSort} />
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50">
                  <td className="td font-medium">{d.sku}</td>
                  <td className="td">{d.shape}</td>
                  <td className="td">{d.carat}</td>
                  <td className="td">{d.color}</td>
                  <td className="td">{d.clarity}</td>
                  <td className="td">{d.certificateType} {d.certificateNumber}</td>
                  <td className="td">{money(d.price)}</td>
                  <td className="td"><StatusBadge status={d.status} /></td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {can('diamonds', 'update') && ['Added', 'Available', 'On Hold'].includes(d.status) && (
                        <button
                          className="btn-ghost px-2 py-1 text-xs"
                          onClick={() => holdMutation.mutate({ id: d._id, hold: d.status !== 'On Hold' })}
                        >
                          {d.status === 'On Hold' ? 'Release' : 'Hold'}
                        </button>
                      )}
                      {can('diamonds', 'update') && (
                        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => openEdit(d)}>Edit</button>
                      )}
                      {can('diamonds', 'delete') && (
                        <ConfirmButton
                          className="btn-danger px-2 py-1 text-xs"
                          message={`Delete diamond ${d.sku}?`}
                          onConfirm={() => deleteMutation.mutate(d._id)}
                        >
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Edit Diamond' : 'Add Diamond'} wide>
        <DiamondForm diamond={editing} onDone={onSaved} />
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Upload Diamonds" wide>
        <BulkUpload onDone={onSaved} />
      </Modal>
    </div>
  );
}
