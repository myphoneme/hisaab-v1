import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, ChevronDown, ChevronRight, Eye, Edit,
  FileText, LayoutGrid, Table as TableIcon, Download, Search,
  Receipt, IndianRupee, Percent, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { reportsApi, invoiceByMonthApi, invoiceApi } from '../../services/api';
import type { InvoiceMonthlySummaryResponse, MonthSummary, InvoiceByMonth } from '../../services/api';
import type { Invoice } from '../../types';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { FinancialYearSelector, getCurrentFinancialYear } from '../../components/ui/FinancialYearSelector';
import { formatCurrency } from '../../lib/utils';
import { exportToCSV, invoiceExportColumns } from '../../lib/export';

// Base path for this module
const MODULE_BASE_PATH = '/invoices-dashboard';

interface PaginatedInvoiceResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// Summary Widget Component
interface SummaryWidgetProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  isCount?: boolean; // For showing count instead of currency
}

function SummaryWidget({ title, value, icon, color = 'blue', isCount = false }: SummaryWidgetProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const textClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`rounded-xl border-2 p-4 ${colorClasses[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${iconBgClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className={`text-sm font-medium ${textClasses[color]} opacity-80`}>{title}</p>
          <p className={`text-xl font-bold ${textClasses[color]}`}>
            {isCount ? value.toLocaleString('en-IN') : formatCurrency(value)}
          </p>
        </div>
      </div>
    </div>
  );
}

// Expanded Month Row Component
interface ExpandedMonthRowProps {
  year: number;
  month: number;
  branchId?: number;
}

function ExpandedMonthRow({ year, month, branchId }: ExpandedMonthRowProps) {
  const navigate = useNavigate();

  const { data: invoices, isLoading } = useQuery<InvoiceByMonth[]>({
    queryKey: ['invoices-by-month', year, month, branchId],
    queryFn: () => invoiceByMonthApi.getByMonth(year, month, branchId),
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-8 text-center text-gray-500 bg-amber-50">
          Loading invoices...
        </td>
      </tr>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-4 py-4 text-center text-gray-500 bg-amber-50">
          No invoices for this month
        </td>
      </tr>
    );
  }

  return (
    <>
      {/* Sub-header row */}
      <tr className="bg-amber-100 border-l-4 border-l-amber-400">
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase">SN</td>
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase">Date</td>
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase">Invoice #</td>
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase">Client</td>
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase text-right">Total</td>
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase text-right">Paid</td>
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase text-right">Due</td>
        <td className="px-4 py-2 text-xs font-semibold text-amber-800 uppercase text-center">Actions</td>
      </tr>
      {invoices.map((invoice, idx) => (
        <tr key={invoice.id} className="bg-amber-50 hover:bg-amber-100 border-b border-amber-200 border-l-4 border-l-amber-400">
          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{idx + 1}</td>
          <td className="px-4 py-3 text-sm text-gray-600">
            {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
          </td>
          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{invoice.invoice_number}</td>
          <td className="px-4 py-3 text-sm text-gray-900">{invoice.client_name}</td>
          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</td>
          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatCurrency(invoice.amount_paid)}</td>
          <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(invoice.amount_due)}</td>
          <td className="px-4 py-3 text-center">
            <div className="flex justify-center items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
              <button
                onClick={() => navigate(`${MODULE_BASE_PATH}/${invoice.id}`)}
                className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded"
                title="View"
              >
                <Eye className="h-4 w-4" />
              </button>
              {invoice.status === 'DRAFT' && (
                <button
                  onClick={() => navigate(`${MODULE_BASE_PATH}/${invoice.id}/edit`)}
                  className="p-1 text-green-600 hover:text-green-900 hover:bg-green-100 rounded"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function InvoiceDashboard() {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState<number | string>('');
  const [financialYear, setFinancialYear] = useState<string>(getCurrentFinancialYear());
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());
  const [isDatatableView, setIsDatatableView] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Convert FY format (2025-26) to API format (2025-2026)
  const getApiFinancialYear = (fy: string): string => {
    if (!fy) return '';
    const parts = fy.split('-');
    if (parts.length !== 2) return fy;
    const startYear = parseInt(parts[0]);
    return `${startYear}-${startYear + 1}`;
  };

  // Fetch monthly summary
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery<InvoiceMonthlySummaryResponse>({
    queryKey: ['invoice-monthly-summary', financialYear, branchId],
    queryFn: () => reportsApi.getInvoiceMonthlySummary(
      getApiFinancialYear(financialYear),
      branchId ? Number(branchId) : undefined
    ),
    enabled: !!financialYear,
  });

  // For datatable view - fetch paginated invoices
  const getDateRange = () => {
    if (!financialYear) return { from_date: undefined, to_date: undefined };
    const [startYear] = financialYear.split('-');
    return {
      from_date: `${startYear}-04-01`,
      to_date: `${parseInt(startYear) + 1}-03-31`,
    };
  };

  const { data: invoiceData, isLoading: isLoadingInvoices } = useQuery<PaginatedInvoiceResponse>({
    queryKey: ['invoices-datatable', branchId, statusFilter, financialYear],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: 1,
        page_size: 1000, // Get all for datatable
        invoice_type: 'SALES',
      };
      if (branchId) params.branch_id = branchId;
      if (statusFilter) params.status_filter = statusFilter;
      const dateRange = getDateRange();
      if (dateRange.from_date) params.from_date = dateRange.from_date;
      if (dateRange.to_date) params.to_date = dateRange.to_date;
      const response = await invoiceApi.getAll(params);
      return response as PaginatedInvoiceResponse;
    },
    enabled: isDatatableView,
  });

  const toggleMonth = (month: number) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  const handleExport = () => {
    if (!invoiceData?.items || invoiceData.items.length === 0) {
      toast.error('No data to export');
      return;
    }
    const exportData = invoiceData.items.map(inv => ({
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      client_name: inv.client?.name || '',
      po_number: inv.po_number || '',
      subtotal: inv.subtotal,
      cgst_amount: inv.cgst_amount,
      sgst_amount: inv.sgst_amount,
      igst_amount: inv.igst_amount,
      tds_amount: inv.tds_amount,
      total_amount: inv.total_amount,
      amount_due: inv.amount_due,
      status: inv.status,
    }));
    exportToCSV(exportData, invoiceExportColumns, `Invoices_${financialYear}_${new Date().toISOString().split('T')[0]}`);
    toast.success('Export completed');
  };

  const summary = summaryData?.summary;
  const months = summaryData?.months || [];

  // Filter invoices for datatable view
  const filteredInvoices = (invoiceData?.items || []).filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <nav className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <Link to="/" className="hover:text-gray-700">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-900">Sales Invoices</span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Financial Year Selector */}
          <div className="w-36">
            <FinancialYearSelector
              value={financialYear}
              onChange={setFinancialYear}
              label=""
              required={false}
            />
          </div>
          {/* Branch Selector */}
          <div className="w-44">
            <BranchSelector
              value={branchId}
              onChange={setBranchId}
              label=""
              required={false}
            />
          </div>
          {/* Datatable Toggle */}
          <Button
            variant={isDatatableView ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsDatatableView(!isDatatableView)}
            title={isDatatableView ? 'Switch to Month View' : 'Switch to Datatable View'}
          >
            {isDatatableView ? <LayoutGrid className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Widgets */}
      {!isLoadingSummary && summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <SummaryWidget
            title="Transactions"
            value={summary.total_transactions}
            icon={<Receipt className="h-6 w-6" />}
            color="blue"
            isCount={true}
          />
          <SummaryWidget
            title="Invoice Value"
            value={summary.total_invoice_value}
            icon={<IndianRupee className="h-6 w-6" />}
            color="purple"
          />
          <SummaryWidget
            title="Total GST"
            value={summary.total_cgst + summary.total_sgst + summary.total_igst}
            icon={<Percent className="h-6 w-6" />}
            color="orange"
          />
          <SummaryWidget
            title="Paid"
            value={summary.total_paid}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
          />
          <SummaryWidget
            title="Due"
            value={summary.total_due}
            icon={<AlertCircle className="h-6 w-6" />}
            color="red"
          />
        </div>
      )}

      {/* Table Section */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isDatatableView ? 'All Invoices' : 'Month-wise Summary'}
          </h2>
          <div className="flex items-center gap-2">
            {isDatatableView && (
              <>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </>
            )}
            <Button onClick={() => navigate(`${MODULE_BASE_PATH}/new`)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {isDatatableView ? (
            /* Datatable View */
            <div>
              {/* Search and Filter */}
              <div className="flex gap-4 p-4 border-b bg-gray-50">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>

              {isLoadingInvoices ? (
                <div className="text-center py-8 text-gray-500">Loading invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  No invoices found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Due</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{invoice.invoice_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{invoice.client?.name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(invoice.total_amount)}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">{formatCurrency(invoice.amount_paid)}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(invoice.amount_due)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => navigate(`${MODULE_BASE_PATH}/${invoice.id}`)}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {invoice.status === 'DRAFT' && (
                              <button
                                onClick={() => navigate(`${MODULE_BASE_PATH}/${invoice.id}/edit`)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Collapsible Month View */
            <div>
              {isLoadingSummary ? (
                <div className="text-center py-8 text-gray-500">Loading summary...</div>
              ) : months.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  No invoice data for this financial year
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-red-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Month</th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase">Trans</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Invoice Value</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">CGST</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">SGST</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">IGST</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Paid</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {months.map((monthData) => (
                        <>
                          {/* Month Summary Row */}
                          <tr
                            key={`month-${monthData.month}`}
                            className={`cursor-pointer transition-colors ${
                              monthData.transactions > 0
                                ? 'hover:bg-gray-100'
                                : 'bg-gray-50 text-gray-400'
                            }`}
                            onClick={() => monthData.transactions > 0 && toggleMonth(monthData.month)}
                          >
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                {monthData.transactions > 0 ? (
                                  expandedMonths.has(monthData.month) ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )
                                ) : (
                                  <span className="w-4" />
                                )}
                                <span className={monthData.transactions > 0 ? 'text-gray-900' : 'text-gray-400'}>
                                  {monthData.month_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {monthData.transactions > 0 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold text-sm">
                                  {monthData.transactions}
                                </span>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {monthData.invoice_value > 0 ? formatCurrency(monthData.invoice_value) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              {monthData.cgst > 0 ? formatCurrency(monthData.cgst) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              {monthData.sgst > 0 ? formatCurrency(monthData.sgst) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm">
                              {monthData.igst > 0 ? formatCurrency(monthData.igst) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600">
                              {monthData.paid > 0 ? formatCurrency(monthData.paid) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {monthData.due > 0 ? formatCurrency(monthData.due) : '-'}
                            </td>
                          </tr>

                          {/* Expanded Invoice Details */}
                          {expandedMonths.has(monthData.month) && monthData.transactions > 0 && (
                            <ExpandedMonthRow
                              year={monthData.year}
                              month={monthData.month}
                              branchId={branchId ? Number(branchId) : undefined}
                            />
                          )}
                        </>
                      ))}

                      {/* Total Row */}
                      {summary && (
                        <tr className="bg-gray-100 font-bold">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-center">{summary.total_transactions}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(summary.total_invoice_value)}</td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(summary.total_cgst)}</td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(summary.total_sgst)}</td>
                          <td className="px-4 py-3 text-right text-sm">{formatCurrency(summary.total_igst)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{formatCurrency(summary.total_paid)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(summary.total_due)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
