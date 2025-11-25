import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2, Search, ShoppingCart } from 'lucide-react';
import { purchaseOrderApi } from '../../services/api';
import type { PurchaseOrder } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../lib/utils';

export function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const response = await purchaseOrderApi.getAll();
      return Array.isArray(response) ? response : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      purchaseOrderApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const filteredOrders = (orders || []).filter((order) =>
    order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      CONFIRMED: 'bg-blue-100 text-blue-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      FULFILLED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 mt-1">Manage purchase orders from clients</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading purchase orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {searchTerm ? 'No purchase orders found' : 'No purchase orders yet. Create your first PO!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                        {order.po_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.po_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {order.client?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {order.subject}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
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
