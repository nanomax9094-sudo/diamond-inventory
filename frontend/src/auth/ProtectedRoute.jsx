import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * Guards a route. Optionally require admin or a specific module permission.
 *  <ProtectedRoute module="diamonds" action="read">...</ProtectedRoute>
 *  <ProtectedRoute adminOnly>...</ProtectedRoute>
 */
export default function ProtectedRoute({ children, adminOnly = false, module, action = 'read' }) {
  const { user, loading, isAdmin, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid h-screen place-items-center text-slate-500">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (adminOnly && !isAdmin) {
    return <NoAccess />;
  }
  if (module && !can(module, action)) {
    return <NoAccess />;
  }
  return children;
}

function NoAccess() {
  return (
    <div className="grid h-[60vh] place-items-center text-center">
      <div>
        <h2 className="text-xl font-semibold text-slate-700">Access denied</h2>
        <p className="mt-2 text-slate-500">You don't have permission to view this page.</p>
      </div>
    </div>
  );
}
