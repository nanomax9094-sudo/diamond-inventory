import { useEffect, useState } from 'react';
import api, { apiError } from '../../api/client.js';
import { useForm } from '../../lib/useForm.js';
import { staffCreateSchema, staffUpdateSchema } from '../../lib/schemas.js';
import { Modal, Spinner, EmptyState, Alert, ConfirmButton, FieldError, inputCls } from '../../components/ui/Bits.jsx';

const MODULES = ['diamonds', 'customers', 'memos', 'invoices'];
const ACTIONS = ['read', 'create', 'update', 'delete'];

function emptyPerms() {
  const p = {};
  MODULES.forEach((m) => (p[m] = { read: false, create: false, update: false, delete: false }));
  return p;
}

export default function StaffList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try {
      // Paginated envelope now: { items, total, ... }
      setUsers((await api.get('/users', { params: { limit: 100 } })).data.items);
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(u) {
    try {
      await api.delete(`/users/${u._id}`);
      load();
    } catch (err) {
      alert(apiError(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-900">Staff Accounts</h1>
        <button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>+ Add Staff</button>
      </div>

      <Alert>{error}</Alert>

      <div className="card overflow-x-auto">
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState>No accounts.</EmptyState>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Name</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Active</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="td font-medium">{u.name}</td>
                  <td className="td">{u.email}</td>
                  <td className="td capitalize">{u.role}</td>
                  <td className="td">{u.isActive ? 'Yes' : 'No'}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {u.role !== 'admin' && (
                        <>
                          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setEditing(u); setOpen(true); }}>
                            Edit
                          </button>
                          <ConfirmButton className="btn-danger px-2 py-1 text-xs" message={`Delete ${u.name}?`} onConfirm={() => remove(u)}>
                            Delete
                          </ConfirmButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Staff' : 'Add Staff'} wide>
        <StaffForm user={editing} onDone={() => { setOpen(false); load(); }} />
      </Modal>
    </div>
  );
}

function StaffForm({ user, onDone }) {
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [perms, setPerms] = useState(() => {
    const base = emptyPerms();
    if (user?.permissions) {
      MODULES.forEach((m) => {
        ACTIONS.forEach((a) => (base[m][a] = !!user.permissions[m]?.[a]));
      });
    }
    return base;
  });

  const { values, errors, touched, serverError, submitting, setField, handleBlur, handleSubmit } = useForm({
    schema: user ? staffUpdateSchema : staffCreateSchema,
    initialValues: { name: user?.name || '', email: user?.email || '', password: '' },
    onSubmit: async (v) => {
      const payload = { name: v.name, email: v.email, permissions: perms, isActive };
      if (v.password) payload.password = v.password;
      if (user) await api.patch(`/users/${user._id}`, payload);
      else await api.post('/users', { ...payload, password: v.password });
      onDone();
    },
  });

  function toggle(m, a) {
    setPerms((p) => ({ ...p, [m]: { ...p[m], [a]: !p[m][a] } }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Alert>{serverError}</Alert>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Name *</label>
          <input className={inputCls(touched.name && errors.name)} value={values.name} onChange={(e) => setField('name', e.target.value)} onBlur={() => handleBlur('name')} />
          <FieldError>{touched.name && errors.name}</FieldError>
        </div>
        <div>
          <label className="label">Email *</label>
          <input className={inputCls(touched.email && errors.email)} type="email" value={values.email} onChange={(e) => setField('email', e.target.value)} onBlur={() => handleBlur('email')} />
          <FieldError>{touched.email && errors.email}</FieldError>
        </div>
        <div>
          <label className="label">{user ? 'New Password (optional)' : 'Password *'}</label>
          <input className={inputCls(touched.password && errors.password)} type="password" value={values.password} onChange={(e) => setField('password', e.target.value)} onBlur={() => handleBlur('password')} />
          <FieldError>{touched.password && errors.password}</FieldError>
        </div>
        <div className="flex items-end pb-6">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>
      </div>

      <div>
        <label className="label">Permissions</label>
        <table className="min-w-full overflow-hidden rounded-md border border-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Module</th>
              {ACTIONS.map((a) => (
                <th key={a} className="th text-center capitalize">{a}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MODULES.map((m) => (
              <tr key={m}>
                <td className="td font-medium capitalize">{m}</td>
                {ACTIONS.map((a) => (
                  <td key={a} className="td text-center">
                    <input type="checkbox" checked={perms[m][a]} onChange={() => toggle(m, a)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}
