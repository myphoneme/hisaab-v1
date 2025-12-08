import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, FileText, DollarSign, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { FinancialYearSelector } from '../../components/ui/FinancialYearSelector';
import { reportsApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface ProfitLossData {
  period: string;
  revenue: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
  cost_of_goods_sold: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
  gross_profit: number;
  operating_expenses: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
  operating_profit: number;
  net_profit: number;
}

interface BalanceSheetData {
  as_on_date: string;
  assets: {
    current_assets: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
    fixed_assets: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
    other_assets: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
    total: number;
  };
  liabilities: {
    current_liabilities: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
    long_term_liabilities: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
    other_liabilities: { items: Array<{ account_code: string; account_name: string; amount: number }>; total: number };
    total: number;
  };
  equity: { items: Array<{ account_code: string; account_name: string; amount: number }>; retained_earnings: number; total: number };
  total_liabilities_and_equity: number;
  balanced: boolean;
}

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
  const [activeTab, setActiveTab] = useState<'overview' | 'pnl' | 'balancesheet'>('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [balanceSheetDate, setBalanceSheetDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Update dateRange when financialYear changes
  useEffect(() => {
    if (financialYear) {
      const [startYear] = financialYear.split('-');
      setDateRange({
        from: `${startYear}-04-01`,
        to: `${parseInt(startYear) + 1}-03-31`,
      });
      // Also update balance sheet date to end of financial year
      setBalanceSheetDate(`${parseInt(startYear) + 1}-03-31`);
    }
  }, [financialYear]);

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', branchId, financialYear],
    queryFn: () => {
      const params: Record<string, unknown> = {};
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
      const params: Record<string, unknown> = { from_date: dateRange.from, to_date: dateRange.to };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getGSTSummary(params);
    },
  });

  const { data: tdsSummary } = useQuery({
    queryKey: ['tds-summary', dateRange, branchId],
    queryFn: () => {
      const params: Record<string, unknown> = { from_date: dateRange.from, to_date: dateRange.to };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getTDSSummary(params);
    },
  });

  const { data: agingReport } = useQuery({
    queryKey: ['aging-report', branchId],
    queryFn: () => {
      const params: Record<string, unknown> = { report_type: 'receivables' };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getAgingReport(params);
    },
  });

  const { data: profitLoss, isLoading: pnlLoading } = useQuery<ProfitLossData>({
    queryKey: ['profit-loss', dateRange, branchId],
    queryFn: () => {
      const params: Record<string, unknown> = { from_date: dateRange.from, to_date: dateRange.to };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getProfitLoss(params) as Promise<ProfitLossData>;
    },
    enabled: activeTab === 'pnl',
  });

  const { data: balanceSheet, isLoading: bsLoading } = useQuery<BalanceSheetData>({
    queryKey: ['balance-sheet', balanceSheetDate, branchId],
    queryFn: () => {
      const params: Record<string, unknown> = { as_on_date: balanceSheetDate };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getBalanceSheet(params) as Promise<BalanceSheetData>;
    },
    enabled: activeTab === 'balancesheet',
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

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('pnl')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'pnl'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Profit & Loss
        </button>
        <button
          onClick={() => setActiveTab('balancesheet')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'balancesheet'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Balance Sheet
        </button>
      </div>

      {/* Profit & Loss Statement */}
      {activeTab === 'pnl' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Profit & Loss Statement</h3>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500">Period:</span>
                  <Input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                    className="w-40"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                    className="w-40"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {pnlLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : profitLoss ? (
                <div className="space-y-6">
                  {/* Revenue Section */}
                  <div>
                    <h4 className="font-semibold text-gray-900 bg-green-50 px-4 py-2 rounded">Revenue</h4>
                    <div className="mt-2 space-y-1">
                      {profitLoss.revenue.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                          <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 font-semibold border-t bg-gray-50">
                        <span>Total Revenue</span>
                        <span className="text-green-600">{formatCurrency(profitLoss.revenue.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost of Goods Sold */}
                  <div>
                    <h4 className="font-semibold text-gray-900 bg-orange-50 px-4 py-2 rounded">Cost of Goods Sold</h4>
                    <div className="mt-2 space-y-1">
                      {profitLoss.cost_of_goods_sold.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                          <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 font-semibold border-t bg-gray-50">
                        <span>Total COGS</span>
                        <span className="text-orange-600">{formatCurrency(profitLoss.cost_of_goods_sold.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gross Profit */}
                  <div className="flex justify-between px-4 py-3 font-bold text-lg border-2 border-blue-200 bg-blue-50 rounded">
                    <span>Gross Profit</span>
                    <span className={profitLoss.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(profitLoss.gross_profit)}
                    </span>
                  </div>

                  {/* Operating Expenses */}
                  <div>
                    <h4 className="font-semibold text-gray-900 bg-red-50 px-4 py-2 rounded">Operating Expenses</h4>
                    <div className="mt-2 space-y-1">
                      {profitLoss.operating_expenses.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                          <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                          <span>{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-4 py-2 font-semibold border-t bg-gray-50">
                        <span>Total Operating Expenses</span>
                        <span className="text-red-600">{formatCurrency(profitLoss.operating_expenses.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operating Profit */}
                  <div className="flex justify-between px-4 py-3 font-bold text-lg border-2 border-purple-200 bg-purple-50 rounded">
                    <span>Operating Profit (EBIT)</span>
                    <span className={profitLoss.operating_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(profitLoss.operating_profit)}
                    </span>
                  </div>

                  {/* Net Profit */}
                  <div className="flex justify-between px-4 py-4 font-bold text-xl border-2 border-green-400 bg-green-100 rounded">
                    <span>Net Profit</span>
                    <span className={profitLoss.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {formatCurrency(profitLoss.net_profit)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No data available for selected period</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance Sheet */}
      {activeTab === 'balancesheet' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Balance Sheet</h3>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500">As on:</span>
                  <Input
                    type="date"
                    value={balanceSheetDate}
                    onChange={(e) => setBalanceSheetDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {bsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : balanceSheet ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Assets */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-gray-900 bg-blue-100 px-4 py-2 rounded">ASSETS</h4>

                    {/* Current Assets */}
                    <div>
                      <h5 className="font-semibold text-gray-700 px-4 py-1 bg-gray-100">Current Assets</h5>
                      <div className="space-y-1 mt-1">
                        {balanceSheet.assets.current_assets.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                            <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-1 font-medium border-t">
                          <span>Total Current Assets</span>
                          <span>{formatCurrency(balanceSheet.assets.current_assets.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fixed Assets */}
                    <div>
                      <h5 className="font-semibold text-gray-700 px-4 py-1 bg-gray-100">Fixed Assets</h5>
                      <div className="space-y-1 mt-1">
                        {balanceSheet.assets.fixed_assets.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                            <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-1 font-medium border-t">
                          <span>Total Fixed Assets</span>
                          <span>{formatCurrency(balanceSheet.assets.fixed_assets.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Other Assets */}
                    {balanceSheet.assets.other_assets.items.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-700 px-4 py-1 bg-gray-100">Other Assets</h5>
                        <div className="space-y-1 mt-1">
                          {balanceSheet.assets.other_assets.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                              <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between px-4 py-1 font-medium border-t">
                            <span>Total Other Assets</span>
                            <span>{formatCurrency(balanceSheet.assets.other_assets.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Assets */}
                    <div className="flex justify-between px-4 py-3 font-bold text-lg bg-blue-200 rounded">
                      <span>TOTAL ASSETS</span>
                      <span>{formatCurrency(balanceSheet.assets.total)}</span>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-gray-900 bg-red-100 px-4 py-2 rounded">LIABILITIES & EQUITY</h4>

                    {/* Current Liabilities */}
                    <div>
                      <h5 className="font-semibold text-gray-700 px-4 py-1 bg-gray-100">Current Liabilities</h5>
                      <div className="space-y-1 mt-1">
                        {balanceSheet.liabilities.current_liabilities.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                            <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-1 font-medium border-t">
                          <span>Total Current Liabilities</span>
                          <span>{formatCurrency(balanceSheet.liabilities.current_liabilities.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Long-term Liabilities */}
                    {balanceSheet.liabilities.long_term_liabilities.items.length > 0 && (
                      <div>
                        <h5 className="font-semibold text-gray-700 px-4 py-1 bg-gray-100">Long-term Liabilities</h5>
                        <div className="space-y-1 mt-1">
                          {balanceSheet.liabilities.long_term_liabilities.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                              <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between px-4 py-1 font-medium border-t">
                            <span>Total Long-term Liabilities</span>
                            <span>{formatCurrency(balanceSheet.liabilities.long_term_liabilities.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Liabilities */}
                    <div className="flex justify-between px-4 py-2 font-semibold bg-red-50 rounded">
                      <span>Total Liabilities</span>
                      <span>{formatCurrency(balanceSheet.liabilities.total)}</span>
                    </div>

                    {/* Equity */}
                    <div>
                      <h5 className="font-semibold text-gray-700 px-4 py-1 bg-green-100">Equity</h5>
                      <div className="space-y-1 mt-1">
                        {balanceSheet.equity.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between px-4 py-1 text-sm">
                            <span className="text-gray-600">{item.account_code} - {item.account_name}</span>
                            <span>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between px-4 py-1 text-sm">
                          <span className="text-gray-600">Retained Earnings</span>
                          <span>{formatCurrency(balanceSheet.equity.retained_earnings)}</span>
                        </div>
                        <div className="flex justify-between px-4 py-1 font-medium border-t">
                          <span>Total Equity</span>
                          <span>{formatCurrency(balanceSheet.equity.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Liabilities & Equity */}
                    <div className="flex justify-between px-4 py-3 font-bold text-lg bg-red-200 rounded">
                      <span>TOTAL LIABILITIES & EQUITY</span>
                      <span>{formatCurrency(balanceSheet.total_liabilities_and_equity)}</span>
                    </div>

                    {/* Balance Check */}
                    <div className={`flex justify-between px-4 py-2 rounded ${balanceSheet.balanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <span className="font-medium">Balance Check</span>
                      <span className="font-bold">{balanceSheet.balanced ? 'Balanced' : 'NOT BALANCED'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-gray-500">No data available for selected date</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <>
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
                  {tdsSummary.summary.map((item: { section: string; deductee_count: number; total_payment: number; total_tds: number }, index: number) => (
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
        </>
      )}
    </div>
  );
}
