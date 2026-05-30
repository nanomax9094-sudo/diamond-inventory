import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import Layout from './components/layout/Layout.jsx';
import { Spinner } from './components/ui/Bits.jsx';

// Route-level code splitting — each page is its own lazily-loaded chunk,
// so the initial bundle stays small and pages load on demand.
const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const DiamondList = lazy(() => import('./pages/diamonds/DiamondList.jsx'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList.jsx'));
const MemoList = lazy(() => import('./pages/memos/MemoList.jsx'));
const MemoView = lazy(() => import('./pages/memos/MemoView.jsx'));
const InvoiceList = lazy(() => import('./pages/invoices/InvoiceList.jsx'));
const InvoiceView = lazy(() => import('./pages/invoices/InvoiceView.jsx'));
const StaffList = lazy(() => import('./pages/staff/StaffList.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="grid h-screen place-items-center"><Spinner /></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/diamonds" element={<ProtectedRoute module="diamonds"><DiamondList /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute module="customers"><CustomerList /></ProtectedRoute>} />
          <Route path="/memos" element={<ProtectedRoute module="memos"><MemoList /></ProtectedRoute>} />
          <Route path="/memos/:id" element={<ProtectedRoute module="memos"><MemoView /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute module="invoices"><InvoiceList /></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute module="invoices"><InvoiceView /></ProtectedRoute>} />
          <Route path="/staff" element={<ProtectedRoute adminOnly><StaffList /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
