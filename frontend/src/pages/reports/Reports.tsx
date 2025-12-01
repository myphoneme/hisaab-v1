import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Users, FileText, DollarSign, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { FinancialYearSelector } from '../../components/ui/FinancialYearSelector';
import { reportsApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  total_receivables: number;
  total_payables: number;
  revenue_this_month: number;
  expenses_this_month: number;
  pending_invoices: number;
  overdue_invoices: number;
  gst_liability: number;
  tds_liability: number;
}

export function Reports() {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState<number | string>('');
  const [financialYear, setFinancialYear] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', branchId, financialYear],
    queryFn: () => {
      const params: any = {};
      if (branchId) params.branch_id = branchId;
      if (financialYear) {
        const [startYear] = financialYear.split('-');
        params.from_date = `${startYear}-04-01`;
        params.to_date = `${parseInt(startYear) + 1}-03-31`;
      }
      return reportsApi.getDashboard(params);
    },
  });

  const { data: gstSummary } = useQuery({
    queryKey: ['gst-summary', dateRange, branchId],
    queryFn: () => {
      const params: any = { from_date: dateRange.from, to_date: dateRange.to };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getGSTSummary(params);
    },
  });

  const { data: tdsSummary } = useQuery({
    queryKey: ['tds-summary', dateRange, branchId],
    queryFn: () => {
      const params: any = { from_date: dateRange.from, to_date: dateRange.to };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getTDSSummary(params);
    },
  });

  const { data: agingReport } = useQuery({
    queryKey: ['aging-report', branchId],
    queryFn: () => {
      const params: any = { report_type: 'receivables' };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getAgingReport(params);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Business performance and financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/reports/gst')}>
            GST Reports
          </Button>
        </div>
      </div>

      {/* Filters */}
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Receivables</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats?.total_receivables || 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Payables</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats?.total_payables || 0)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue (This Month)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats?.revenue_this_month || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expenses (This Month)</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(stats?.expenses_this_month || 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Invoice Status</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending Invoices</span>
                <span className="font-bold text-yellow-600">{stats?.pending_invoices || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Overdue Invoices</span>
                <span className="font-bold text-red-600">{stats?.overdue_invoices || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Tax Liabilities</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">GST Liability</span>
                <span className="font-bold text-purple-600">
                  {formatCurrency(stats?.gst_liability || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">TDS Liability</span>
                <span className="font-bold text-indigo-600">
                  {formatCurrency(stats?.tds_liability || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Period Reports</h3>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              />
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* GST Summary */}
      {gstSummary && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">GST Summary</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Output Tax (Sales)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Taxable:</span>
                    <span>{formatCurrency(gstSummary.output_tax?.taxable_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>{formatCurrency(gstSummary.output_tax?.cgst || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>{formatCurrency(gstSummary.output_tax?.sgst || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>{formatCurrency(gstSummary.output_tax?.igst || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(gstSummary.output_tax?.total || 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Input Tax (Purchase)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Taxable:</span>
                    <span>{formatCurrency(gstSummary.input_tax?.taxable_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>{formatCurrency(gstSummary.input_tax?.cgst || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>{formatCurrency(gstSummary.input_tax?.sgst || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>{formatCurrency(gstSummary.input_tax?.igst || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Total:</span>
                    <span>{formatCurrency(gstSummary.input_tax?.total || 0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-2">Net Liability</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>{formatCurrency(gstSummary.net_liability?.cgst || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>{formatCurrency(gstSummary.net_liability?.sgst || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IGST:</span>
                    <span>{formatCurrency(gstSummary.net_liability?.igst || 0)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1 text-purple-600">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(
                        (gstSummary.net_liability?.cgst || 0) +
                          (gstSummary.net_liability?.sgst || 0) +
                          (gstSummary.net_liability?.igst || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TDS Summary */}
      {tdsSummary && tdsSummary.summary && tdsSummary.summary.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">TDS Summary</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Section</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Deductees</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total Payment</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TDS Deducted</th>
                  </tr>
                </thead>
                <tbody>
                  {tdsSummary.summary.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2 text-sm">{item.section}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.deductee_count}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.total_payment)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">
                        {formatCurrency(item.total_tds)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="px-4 py-2" colSpan={3}>Total TDS</td>
                    <td className="px-4 py-2 text-right text-purple-600">
                      {formatCurrency(tdsSummary.total_tds || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aging Report Summary */}
      {agingReport && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Receivables Aging</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Current</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(agingReport.summary?.current || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">30-60 Days</p>
                <p className="text-lg font-bold text-yellow-600">
                  {formatCurrency(agingReport.summary?.['30_60_days'] || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">60-90 Days</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(agingReport.summary?.['60_90_days'] || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">90+ Days</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(agingReport.summary?.['90_plus_days'] || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(agingReport.summary?.total || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
