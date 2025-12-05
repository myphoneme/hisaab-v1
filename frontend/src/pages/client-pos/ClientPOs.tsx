import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Search, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { clientPOApi, clientApi } from '../../services/api';
import type { ClientPO, Client, ClientPOStatus } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency, formatDate } from '../../lib/utils';

const STATUS_COLORS: Record<ClientPOStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
};

const FREQUENCY_LABELS: Record<string, string> = {
  ONE_TIME: 'One Time',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half Yearly',
  YEARLY: 'Yearly',
  MILESTONE: 'Milestone',
};

export function ClientPOs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientPOStatus | ''>('');
  const [clientFilter, setClientFilter] = useState<number | ''>('');
  const queryClient = useQueryClient();

  const { data: clientPOsData, isLoading } = useQuery({
    queryKey: ['client-pos', { search: searchTerm, status: statusFilter, client_id: clientFilter }],
    queryFn: async () => {
      const params: Record<string, unknown> = { page_size: 100 };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status_filter = statusFilter;
      if (clientFilter) params.client_id = clientFilter;
      const response: any = await clientPOApi.getAll(params);
      return response?.items || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response: any = await clientApi.getAll({ page_size: 100 });
      return response?.items || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientPOApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-pos'] });
      toast.success('Client PO deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to delete Client PO';
      toast.error(errorMessage);
    },
  });

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this Client PO? This action cannot be undone.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const clientPOs = clientPOsData || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client POs (Sales Orders)</h1>
          <p className="text-gray-500 mt-1">Manage purchase orders received from clients</p>
        </div>
        <Link to="/client-pos/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Client PO
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by PO number, subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ClientPOStatus | '')}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="PARTIAL">Partial</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value ? Number(e.target.value) : '')}
              className="border border-gray-300 rounded-md px-3 py-2 min-w-[150px]"
            >
              <option value="">All Clients</option>
              {(clients || []).map((client: Client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading Client POs...</div>
          ) : clientPOs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter || clientFilter
                ? 'No Client POs found matching your filters'
                : 'No Client POs yet. Create your first one!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PO Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Validity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientPOs.map((po: ClientPO) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium text-gray-900">{po.internal_number}</div>
                            {po.client_po_number && (
                              <div className="text-sm text-gray-500">Client PO: {po.client_po_number}</div>
                            )}
                            {po.subject && (
                              <div className="text-sm text-gray-500 max-w-xs truncate">{po.subject}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{po.client_name}</div>
                        {po.branch_name && (
                          <div className="text-sm text-gray-500">{po.branch_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(po.valid_from)}
                        </div>
                        {po.valid_until && (
                          <div className="text-sm text-gray-400">to {formatDate(po.valid_until)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          {FREQUENCY_LABELS[po.billing_frequency]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <span className={po.remaining_amount > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                          {formatCurrency(po.remaining_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[po.status]}`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/client-pos/${po.id}`} className="text-gray-600 hover:text-gray-900 mr-2">
                          <Eye className="h-4 w-4 inline" />
                        </Link>
                        {po.status === 'DRAFT' && (
                          <>
                            <Link to={`/client-pos/${po.id}/edit`} className="text-blue-600 hover:text-blue-900 mr-2">
                              <Edit className="h-4 w-4 inline" />
                            </Link>
                            <button
                              onClick={() => handleDelete(po.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
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
