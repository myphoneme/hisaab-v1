import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2, Search, FileText, Edit, Send, FileCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { proformaInvoiceApi } from '../../services/api';
import type { ProformaInvoice } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { FinancialYearSelector } from '../../components/ui/FinancialYearSelector';
import { formatCurrency } from '../../lib/utils';

interface PaginatedPIResponse {
  items: ProformaInvoice[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export function ProformaInvoices() {
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

  const { data: piData, isLoading } = useQuery<PaginatedPIResponse>({
    queryKey: ['proforma-invoices', branchId, statusFilter, financialYear, page, pageSize],
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
      const response = await proformaInvoiceApi.getAll(params);
      return response as PaginatedPIResponse;
    },
  });

  const proformaInvoices = piData?.items || [];
  const totalRecords = piData?.total || 0;
  const totalPages = piData?.pages || 1;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => proformaInvoiceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      toast.success('Proforma Invoice deleted');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    },
  });

  // Send PI mutation
  const sendMutation = useMutation({
    mutationFn: (id: number) => proformaInvoiceApi.updateStatus(id, 'SENT'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      toast.success('Proforma Invoice sent');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to send');
    },
  });

  // Generate Invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: (id: number) => proformaInvoiceApi.generateInvoice(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Invoice ${data.invoice_number} generated successfully`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to generate invoice');
    },
  });

  const filteredPIs = proformaInvoices.filter((pi) =>
    pi.pi_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pi.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      GENERATED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this proforma invoice?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proforma Invoices</h1>
          <p className="text-gray-500 mt-1">Manage proforma invoices before final invoicing</p>
        </div>
        <Button onClick={() => navigate('/proforma-invoices/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Proforma Invoice
        </Button>
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
                <option value="GENERATED">Generated</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search proforma invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading proforma invoices...</div>
          ) : filteredPIs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {searchTerm ? 'No proforma invoices found' : 'No proforma invoices yet. Create your first one!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PI #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPIs.map((pi) => (
                    <tr key={pi.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {pi.pi_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(pi.pi_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {pi.client?.name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(pi.total_amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pi.status)}`}>
                          {pi.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => navigate(`/proforma-invoices/${pi.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {/* Send button - only for DRAFT */}
                        {pi.status === 'DRAFT' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Send this proforma invoice?')) {
                                sendMutation.mutate(pi.id);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Send PI"
                            disabled={sendMutation.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {/* Generate Invoice button - for DRAFT and SENT */}
                        {(pi.status === 'DRAFT' || pi.status === 'SENT') && (
                          <button
                            onClick={() => {
                              if (window.confirm('Generate invoice from this PI? This action cannot be undone.')) {
                                generateInvoiceMutation.mutate(pi.id);
                              }
                            }}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Generate Invoice"
                            disabled={generateInvoiceMutation.isPending}
                          >
                            <FileCheck className="h-4 w-4" />
                          </button>
                        )}
                        {/* Edit button - only for DRAFT */}
                        {pi.status === 'DRAFT' && (
                          <button
                            onClick={() => navigate(`/proforma-invoices/${pi.id}/edit`)}
                            className="text-yellow-600 hover:text-yellow-900 mr-3"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {/* Delete button - only for DRAFT */}
                        {pi.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDelete(pi.id)}
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
                  <span className="font-medium">{totalRecords}</span> proforma invoices
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
