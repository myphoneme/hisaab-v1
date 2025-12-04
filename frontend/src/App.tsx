import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
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
import { Branches } from './pages/branches/Branches';
import { BankAccounts } from './pages/bank-accounts/BankAccounts';
import { Invoices } from './pages/invoices/Invoices';
import { InvoiceForm } from './pages/invoices/InvoiceForm';
import { InvoiceView } from './pages/invoices/InvoiceView';
import { Payments } from './pages/payments/Payments';
import { PurchaseOrders } from './pages/purchase-orders/PurchaseOrders';
import { Ledger } from './pages/ledger/Ledger';
import { GSTReports } from './pages/reports/GSTReports';
import { Reports } from './pages/reports/Reports';
import { Settings } from './pages/settings/Settings';
import { CashExpenses } from './pages/cash-expenses/CashExpenses';
import { ExpenseCategories } from './pages/expense-categories/ExpenseCategories';
import { Projects } from './pages/projects/Projects';

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
              <Route path="branches" element={<Branches />} />
              <Route path="bank-accounts" element={<BankAccounts />} />
              <Route path="purchase-orders" element={<PurchaseOrders />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/new" element={<InvoiceForm />} />
              <Route path="invoices/:id/edit" element={<InvoiceForm />} />
              <Route path="invoices/:id" element={<InvoiceView />} />
              <Route path="payments" element={<Payments />} />
              <Route path="cash-expenses" element={<CashExpenses />} />
              <Route path="expense-categories" element={<ExpenseCategories />} />
              <Route path="projects" element={<Projects />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="reports" element={<Reports />} />
              <Route path="reports/gst" element={<GSTReports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
