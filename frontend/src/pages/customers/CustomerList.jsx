import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api, { apiError } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useDebounce } from '../../lib/useDebounce.js';
import { useForm } from '../../lib/useForm.js';
import { customerSchema } from '../../lib/schemas.js';
import { Modal, SkeletonTable, EmptyState, Alert, ConfirmButton, Pagination, FieldError, inputCls } from '../../components/ui/Bits.jsx';

const FIELDS = [
  { name: 'name', label: 'Name *', required: true },
  { name: 'company', label: 'Company' },
  { name: 'phone', label: 'Contact Number' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address' },
  { name: 'notes', label: 'Business details / Notes', textarea: true },
];

export default function CustomerList() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => setPage(1), [debouncedSearch]);

  const params = { search: debouncedSearch, page, limit: 20 };
  const queryKey = ['customers', 'list', params];
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey,
    queryFn: async () => (await api.get('/customers', { params })).data,
    placeholderData: keepPreviousData,
  });
  const items = data?.items || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}`),
    onError: (err) => alert(apiError(err)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  function onSaved() {
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['customers'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-900">
          Customers {data?.total ? <span className="text-base font-normal text-slate-400">({data.total})</span> : null}
        </h1>
        {can('customers', 'create') && (
          <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>+ Add Customer</button>
        )}
      </div>

      <div className="relative w-72">
        <input className="input" placeholder="Search name, company, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {isFetching && <span className="absolute right-3 top-2.5 text-xs text-slate-400">…</span>}
      </div>

      {isError && <Alert>{apiError(error)}</Alert>}

      <div className="card overflow-x-auto">
        {isLoading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : items.length === 0 ? (
          <EmptyState>No customers found.</EmptyState>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Company</th>
                <th className="th">Phone</th>
                <th className="th">Email</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td">{c.company}</td>
                  <td className="td">{c.phone}</td>
                  <td className="td">{c.email}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {can('customers', 'update') && (
                        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setEditing(c); setOpen(true); }}>Edit</button>
                      )}
                      {can('customers', 'delete') && (
                        <ConfirmButton className="btn-danger px-2 py-1 text-xs" message={`Delete ${c.name}?`} onConfirm={() => deleteMutation.mutate(c._id)}>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <CustomerForm customer={editing} onDone={onSaved} />
      </Modal>
    </div>
  );
}

function CustomerForm({ customer, onDone }) {
  const init = {};
  FIELDS.forEach((f) => (init[f.name] = customer?.[f.name] ?? ''));

  const { values, errors, touched, serverError, submitting, setField, handleBlur, handleSubmit } = useForm({
    schema: customerSchema,
    initialValues: init,
    onSubmit: async (v) => {
      if (customer) await api.patch(`/customers/${customer._id}`, v);
      else await api.post('/customers', v);
      onDone();
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <Alert>{serverError}</Alert>
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label className="label">{f.label}</label>
          {f.textarea ? (
            <textarea
              className={inputCls(touched[f.name] && errors[f.name])}
              rows={3}
              value={values[f.name]}
              onChange={(e) => setField(f.name, e.target.value)}
              onBlur={() => handleBlur(f.name)}
            />
          ) : (
            <input
              className={inputCls(touched[f.name] && errors[f.name])}
              type={f.type || 'text'}
              value={values[f.name]}
              onChange={(e) => setField(f.name, e.target.value)}
              onBlur={() => handleBlur(f.name)}
            />
          )}
          <FieldError>{touched[f.name] && errors[f.name]}</FieldError>
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
