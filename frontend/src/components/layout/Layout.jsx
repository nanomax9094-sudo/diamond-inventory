import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/diamonds', label: 'Diamonds', module: 'diamonds' },
  { to: '/customers', label: 'Customers', module: 'customers' },
  { to: '/memos', label: 'Memos', module: 'memos' },
  { to: '/invoices', label: 'Invoices', module: 'invoices' },
  { to: '/staff', label: 'Staff', adminOnly: true },
];

export default function Layout() {
  const { user, logout, isAdmin, can } = useAuth();
  const navigate = useNavigate();

  const visible = NAV.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.module) return can(item.module, 'read');
    return true;
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-navy-900 text-slate-200 no-print">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="text-lg font-bold tracking-widest text-white">STIENHARDT</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gold-500">Diamond Inventory</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visible.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-gold-500 text-navy-900' : 'text-slate-300 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-slate-400">
          <div className="font-medium text-slate-200">{user?.name}</div>
          <div className="capitalize">{user?.role}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 no-print">
          <div className="text-sm text-slate-500">Welcome, <span className="font-medium text-slate-700">{user?.name}</span></div>
          <button
            className="btn-ghost"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Log out
          </button>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
