import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2, Search, FileText, Edit, Send, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { invoiceApi } from '../../services/api';
import type { Invoice } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { FinancialYearSelector } from '../../components/ui/FinancialYearSelector';
import { formatCurrency } from '../../lib/utils';
import { exportToCSV, invoiceExportColumns } from '../../lib/export';

interface PaginatedInvoiceResponse {
  items: Invoice[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export function Invoices() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [branchId, setBranchId] = useState<number | string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const queryClient = useQueryClient();

  // Calculate date range from financial year
  const getDateRange = () => {
    if (!financialYear) return { from_date: undefined, to_date: undefined };
    const [startYear] = financialYear.split('-');
    return {
      from_date: `${startYear}-04-01`,
      to_date: `${parseInt(startYear) + 1}-03-31`,
    };
  };

  const { data: invoiceData, isLoading } = useQuery<PaginatedInvoiceResponse>({
    queryKey: ['invoices', branchId, statusFilter, financialYear, page, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        page_size: pageSize,
      };
      if (branchId) params.branch_id = branchId;
      if (statusFilter) params.status_filter = statusFilter;
      const dateRange = getDateRange();
      if (dateRange.from_date) params.from_date = dateRange.from_date;
      if (dateRange.to_date) params.to_date = dateRange.to_date;
      const response = await invoiceApi.getAll(params);
      return response as PaginatedInvoiceResponse;
    },
  });

  const invoices = invoiceData?.items || [];
  const totalRecords = invoiceData?.total || 0;
  const totalPages = invoiceData?.pages || 1;

  const handleExport = () => {
    if (!filteredInvoices || filteredInvoices.length === 0) {
      toast.error('No data to export');
      return;
    }
    // Transform data for export
    const exportData = filteredInvoices.map(inv => ({
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      client_name: inv.client?.name || inv.vendor?.name || '',
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
    exportToCSV(exportData, invoiceExportColumns, `Invoices_${new Date().toISOString().split('T')[0]}`);
    toast.success('Export completed');
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => invoiceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  // Send invoice mutation
  const sendMutation = useMutation({
    mutationFn: (id: number) => invoiceApi.updateStatus(id, 'SENT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent and posted to ledger');
    },
    onError: (error: Error & { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }) => {
      const detail = error.response?.data?.detail;
      let msg = 'Failed to send invoice';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0]?.msg || msg;
      }
      toast.error(msg);
    },
  });

  const filteredInvoices = invoices.filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset page when filters change
  const handleBranchChange = (value: number | string) => {
    setBranchId(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleFinancialYearChange = (value: string) => {
    setFinancialYear(value);
    setPage(1);
  };

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

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">Manage sales and purchase invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4 flex-wrap">
            <div className="w-48">
              <BranchSelector
                value={branchId}
                onChange={handleBranchChange}
                label=""
                required={false}
              />
            </div>
            <div className="w-40">
              <FinancialYearSelector
                value={financialYear}
                onChange={handleFinancialYearChange}
                label=""
                required={false}
              />
            </div>
            <div className="w-40">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {searchTerm ? 'No invoices found' : 'No invoices yet. Create your first invoice!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {invoice.client?.name || invoice.vendor?.name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={invoice.invoice_type === 'SALES' ? 'success' : 'default'}>
                          {invoice.invoice_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(invoice.amount_due)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {/* Send button - only for DRAFT */}
                        {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Send this invoice? This will create ledger entries.')) {
                                sendMutation.mutate(invoice.id);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Send Invoice"
                            disabled={sendMutation.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {/* Edit button - only for DRAFT */}
                        {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {/* Delete button - only for DRAFT */}
                        {invoice.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && totalRecords > 0 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 mt-4 rounded-b-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(page - 1) * pageSize + 1}</span>
                  {' '}-{' '}
                  <span className="font-medium">
                    {Math.min(page * pageSize, totalRecords)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{totalRecords}</span> invoices
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-700 px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
