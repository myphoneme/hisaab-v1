import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { FinancialYearSelector } from '../../components/ui/FinancialYearSelector';
import { formatCurrency } from '../../lib/utils';
import { reportsApi } from '../../services/api';
import type { DashboardStats } from '../../types';

interface RecentInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  client_name: string;
  total_amount: number;
  amount_due: number;
  due_date: string | null;
  status: string;
}

interface UpcomingPayment {
  id: number;
  invoice_number: string;
  invoice_date: string;
  vendor_name: string;
  total_amount: number;
  amount_due: number;
  due_date: string | null;
  days_until_due: number | null;
  status: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'bg-blue-50 text-blue-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-yellow-50 text-yellow-600',
    danger: 'bg-red-50 text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center mt-2">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trendValue}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last month</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${variantStyles[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [branchId, setBranchId] = useState<number | string>('');
  const [financialYear, setFinancialYear] = useState<string>('');

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', branchId, financialYear],
    queryFn: () => {
      const params: Record<string, unknown> = {};
      if (branchId) params.branch_id = branchId;
      if (financialYear) {
        const [startYear] = financialYear.split('-');
        params.from_date = `${startYear}-04-01`;
        params.to_date = `${parseInt(startYear) + 1}-03-31`;
      }
      return reportsApi.getDashboard(params) as Promise<DashboardStats>;
    },
  });

  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery<RecentInvoice[]>({
    queryKey: ['recent-invoices', branchId],
    queryFn: () => {
      const params: Record<string, unknown> = { limit: 5 };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getRecentInvoices(params) as Promise<RecentInvoice[]>;
    },
  });

  const { data: upcomingPayments, isLoading: paymentsLoading } = useQuery<UpcomingPayment[]>({
    queryKey: ['upcoming-payments', branchId],
    queryFn: () => {
      const params: Record<string, unknown> = { limit: 5, days_ahead: 30 };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getUpcomingPayments(params) as Promise<UpcomingPayment[]>;
    },
  });

  // Default stats when no data available
  const defaultStats: DashboardStats = {
    total_receivables: 0,
    total_payables: 0,
    revenue_this_month: 0,
    expenses_this_month: 0,
    pending_invoices: 0,
    overdue_invoices: 0,
    gst_liability: 0,
    tds_liability: 0,
  };

  const displayStats = stats || defaultStats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's an overview of your business.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-64">
              <BranchSelector
                value={branchId}
                onChange={setBranchId}
                label="Filter by Branch"
                required={false}
              />
            </div>
            <div className="w-64">
              <FinancialYearSelector
                value={financialYear}
                onChange={setFinancialYear}
                label="Financial Year"
                required={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Receivables"
          value={formatCurrency(displayStats.total_receivables)}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Total Payables"
          value={formatCurrency(displayStats.total_payables)}
          icon={TrendingDown}
          variant="warning"
        />
        <StatCard
          title="Revenue (This Month)"
          value={formatCurrency(displayStats.revenue_this_month)}
          icon={IndianRupee}
          variant="success"
        />
        <StatCard
          title="Expenses (This Month)"
          value={formatCurrency(displayStats.expenses_this_month)}
          icon={IndianRupee}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Invoices"
          value={displayStats.pending_invoices.toString()}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Overdue Invoices"
          value={displayStats.overdue_invoices.toString()}
          icon={AlertCircle}
          variant="danger"
        />
        <StatCard
          title="GST Liability"
          value={formatCurrency(displayStats.gst_liability)}
          icon={IndianRupee}
          variant="warning"
        />
        <StatCard
          title="TDS Liability"
          value={formatCurrency(displayStats.tds_liability)}
          icon={IndianRupee}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Link to="/invoices" className="text-sm text-blue-600 hover:text-blue-800">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : recentInvoices && recentInvoices.length > 0 ? (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-500">{invoice.client_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                      <p className="text-sm text-gray-500">
                        Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : 'N/A'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No recent invoices</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Payments</CardTitle>
            <Link to="/payments" className="text-sm text-blue-600 hover:text-blue-800">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : upcomingPayments && upcomingPayments.length > 0 ? (
              <div className="space-y-4">
                {upcomingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{payment.vendor_name}</p>
                      <p className="text-sm text-gray-500">{payment.invoice_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(payment.amount_due)}</p>
                      <p className={`text-sm ${payment.days_until_due !== null && payment.days_until_due < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {payment.days_until_due !== null
                          ? payment.days_until_due < 0
                            ? `${Math.abs(payment.days_until_due)} days overdue`
                            : payment.days_until_due === 0
                            ? 'Due today'
                            : `Due in ${payment.days_until_due} days`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">No upcoming payments</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
