import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { FinancialYearSelector } from '../../components/ui/FinancialYearSelector';
import { formatCurrency } from '../../lib/utils';
import { reportsApi } from '../../services/api';
import type { DashboardStats } from '../../types';

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

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', branchId, financialYear],
    queryFn: () => {
      const params: any = {};
      if (branchId) params.branch_id = branchId;
      if (financialYear) {
        const [startYear] = financialYear.split('-');
        params.from_date = `${startYear}-04-01`;
        params.to_date = `${parseInt(startYear) + 1}-03-31`;
      }
      return reportsApi.getDashboard(params) as Promise<DashboardStats>;
    },
  });

  // Default stats for demo
  const defaultStats: DashboardStats = {
    total_receivables: 1250000,
    total_payables: 450000,
    revenue_this_month: 850000,
    expenses_this_month: 320000,
    pending_invoices: 12,
    overdue_invoices: 3,
    gst_liability: 125000,
    tds_liability: 45000,
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
          trend="up"
          trendValue="12%"
          variant="success"
        />
        <StatCard
          title="Total Payables"
          value={formatCurrency(displayStats.total_payables)}
          icon={TrendingDown}
          trend="down"
          trendValue="8%"
          variant="warning"
        />
        <StatCard
          title="Revenue (This Month)"
          value={formatCurrency(displayStats.revenue_this_month)}
          icon={IndianRupee}
          trend="up"
          trendValue="15%"
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
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">INV/2024-25/{String(i).padStart(4, '0')}</p>
                    <p className="text-sm text-gray-500">Client {i}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(50000 * i)}</p>
                    <p className="text-sm text-gray-500">Due: {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Vendor {i}</p>
                    <p className="text-sm text-gray-500">Bill #{String(i).padStart(4, '0')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(25000 * i)}</p>
                    <p className="text-sm text-gray-500">Due: {new Date().toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
