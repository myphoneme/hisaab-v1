import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

import { Clients } from './pages/clients/Clients';
import { Vendors } from './pages/vendors/Vendors';
import { Invoices } from './pages/invoices/Invoices';
import { Payments } from './pages/payments/Payments';
import { PurchaseOrders } from './pages/purchase-orders/PurchaseOrders';

function LedgerPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Ledger</h1>
      <p className="text-gray-500 mt-1">View accounting ledger entries.</p>
    </div>
  );
}

function GSTReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">GST Reports</h1>
      <p className="text-gray-500 mt-1">Generate GST reports and returns data.</p>
    </div>
  );
}

function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      <p className="text-gray-500 mt-1">View business reports and analytics.</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="text-gray-500 mt-1">Configure application settings.</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="payments" element={<Payments />} />
              <Route path="ledger" element={<LedgerPage />} />
              <Route path="reports/gst" element={<GSTReportsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
