import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Eye, Trash2, Search, DollarSign, Pencil, X, Download } from 'lucide-react';
import { paymentApi } from '../../services/api';
import type { Payment, PaymentCreate } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { formatCurrency } from '../../lib/utils';
import { PaymentForm } from './PaymentForm';
import { exportToCSV, paymentExportColumns } from '../../lib/export';

export function Payments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchId, setBranchId] = useState<number | string>('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [viewingPayment, setViewingPayment] = useState<Payment | null>(null);
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ['payments', branchId],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (branchId) params.branch_id = branchId;
      const response = await paymentApi.getAll(params);
      // Handle paginated response
      return response?.items || [];
    },
  });

  const handleExport = () => {
    if (!filteredPayments || filteredPayments.length === 0) {
      toast.error('No data to export');
      return;
    }
    // Transform data for export
    const exportData = filteredPayments.map(pmt => ({
      payment_number: pmt.payment_number,
      payment_date: pmt.payment_date,
      invoice_number: pmt.invoice?.invoice_number || '',
      party_name: pmt.client?.name || pmt.vendor?.name || '',
      payment_type: pmt.payment_type,
      payment_mode: pmt.payment_mode,
      amount: pmt.amount,
      tds_amount: pmt.tds_amount || 0,
      reference_number: pmt.reference_number || '',
      status: pmt.status,
    }));
    exportToCSV(exportData, paymentExportColumns, `Payments_${new Date().toISOString().split('T')[0]}`);
    toast.success('Export completed');
  };

  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentCreate) =>
      selectedPayment
        ? paymentApi.update(selectedPayment.id, data)
        : paymentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success(selectedPayment ? 'Payment updated successfully!' : 'Payment recorded successfully!');
      setShowPaymentForm(false);
      setSelectedPayment(null);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      const errorMessage = error.response?.data?.detail || 'Failed to record payment';
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => paymentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete payment');
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setSelectedPayment(null);
              setShowPaymentForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="w-64">
              <BranchSelector
                value={branchId}
                onChange={setBranchId}
                label=""
                required={false}
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
                        {formatCurrency(payment.gross_amount || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(payment.net_amount || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => setViewingPayment(payment)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowPaymentForm(true);
                          }}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Edit payment"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete payment"
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

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <PaymentForm
          payment={selectedPayment}
          onSubmit={(data) => createPaymentMutation.mutate(data)}
          onClose={() => {
            setShowPaymentForm(false);
            setSelectedPayment(null);
          }}
          isLoading={createPaymentMutation.isPending}
        />
      )}

      {/* Payment View Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Payment Details</h2>
              <button onClick={() => setViewingPayment(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Number</label>
                  <p className="text-lg font-semibold">{viewingPayment.payment_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Date</label>
                  <p className="text-lg">{new Date(viewingPayment.payment_date).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Type</label>
                  <Badge variant={viewingPayment.payment_type === 'RECEIPT' ? 'success' : 'default'}>
                    {viewingPayment.payment_type}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingPayment.status)}`}>
                    {viewingPayment.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Party</label>
                  <p className="text-lg">{viewingPayment.client?.name || viewingPayment.vendor?.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Mode</label>
                  <p className="text-lg">{viewingPayment.payment_mode.replace('_', ' ')}</p>
                </div>
                {viewingPayment.reference_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Reference Number</label>
                    <p className="text-lg">{viewingPayment.reference_number}</p>
                  </div>
                )}
                {viewingPayment.branch && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Branch</label>
                    <p className="text-lg">{viewingPayment.branch.branch_name}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Amount Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Gross Amount</label>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(viewingPayment.gross_amount || 0)}</p>
                  </div>
                  {viewingPayment.tds_amount > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">TDS Amount</label>
                      <p className="text-lg text-red-600">- {formatCurrency(viewingPayment.tds_amount)}</p>
                    </div>
                  )}
                  {viewingPayment.tcs_amount > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">TCS Amount</label>
                      <p className="text-lg text-green-600">+ {formatCurrency(viewingPayment.tcs_amount)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Net Amount</label>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(viewingPayment.net_amount || 0)}</p>
                  </div>
                </div>
              </div>

              {viewingPayment.notes && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                  <p className="text-gray-700">{viewingPayment.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setViewingPayment(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPayment(viewingPayment);
                    setViewingPayment(null);
                    setShowPaymentForm(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
