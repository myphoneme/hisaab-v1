import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2, Search, FileText } from 'lucide-react';
import { invoiceApi } from '../../services/api';
import type { Invoice } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';

export function Invoices() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const response = await invoiceApi.getAll();
      return Array.isArray(response) ? response : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => invoiceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      invoiceApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const filteredInvoices = (invoices || []).filter((invoice) =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
