import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2, Search, DollarSign } from 'lucide-react';
import { paymentApi } from '../../services/api';
import type { Payment } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';

export function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await paymentApi.getAll();
      return Array.isArray(response) ? response : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const filteredPayments = (payments || []).filter((payment) =>
    payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">Track receipts and payments</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading payments...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {searchTerm ? 'No payments found' : 'No payments yet. Record your first payment!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {payment.payment_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {payment.client?.name || payment.vendor?.name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={payment.payment_type === 'RECEIPT' ? 'success' : 'default'}>
                          {payment.payment_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_mode.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(payment.net_amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
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
