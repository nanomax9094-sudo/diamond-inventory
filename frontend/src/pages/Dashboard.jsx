import { useQuery } from '@tanstack/react-query';
import api from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { money } from '../lib/format.js';
import { StatusBadge, Spinner } from '../components/ui/Bits.jsx';

// Fetch just the total count for a module (limit=1 → 1 doc + total), or 0 if no access.
async function fetchTotal(path) {
  try {
    return (await api.get(path, { params: { limit: 1 } })).data.total ?? 0;
  } catch {
    return 0;
  }
}

export default function Dashboard() {
  const { can, isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const canDiamonds = isAdmin || can('diamonds', 'read');
      const [stats, customers, memos, invoices] = await Promise.all([
        canDiamonds ? api.get('/diamonds/stats').then((r) => r.data).catch(() => null) : null,
        isAdmin || can('customers', 'read') ? fetchTotal('/customers') : 0,
        isAdmin || can('memos', 'read') ? fetchTotal('/memos') : 0,
        isAdmin || can('invoices', 'read') ? fetchTotal('/invoices') : 0,
      ]);
      return { stats, customers, memos, invoices };
    },
  });

  if (isLoading || !data) return <Spinner />;

  const stats = data.stats || { total: 0, inventoryValue: 0, statusCounts: {} };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-navy-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Diamonds" value={stats.total} />
        <Stat label="Customers" value={data.customers} />
        <Stat label="Memos" value={data.memos} />
        <Stat label="Invoices" value={data.invoices} />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Inventory by status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.keys(stats.statusCounts).length === 0 && <span className="text-slate-400">No diamonds yet.</span>}
          {Object.entries(stats.statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
              <StatusBadge status={status} />
              <span className="text-lg font-semibold text-navy-900">{count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-slate-500">
          Total inventory value: <span className="font-semibold text-navy-900">{money(stats.inventoryValue)}</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-navy-900">{value}</div>
    </div>
  );
}
