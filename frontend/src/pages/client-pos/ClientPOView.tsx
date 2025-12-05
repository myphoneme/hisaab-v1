import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { clientPOApi } from '../../services/api';
import type { ClientPO, BillingSchedule, ClientPOStatus, ScheduleStatus } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { formatCurrency, formatDate } from '../../lib/utils';

const STATUS_COLORS: Record<ClientPOStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
};

const SCHEDULE_STATUS_COLORS: Record<ScheduleStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PI_RAISED: 'bg-blue-100 text-blue-800',
  INVOICED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const FREQUENCY_LABELS: Record<string, string> = {
  ONE_TIME: 'One Time',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  HALF_YEARLY: 'Half Yearly',
  YEARLY: 'Yearly',
  MILESTONE: 'Milestone',
};

export function ClientPOView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateStartDate, setGenerateStartDate] = useState('');
  const [generateEndDate, setGenerateEndDate] = useState('');

  const { data: clientPO, isLoading } = useQuery<ClientPO>({
    queryKey: ['client-po', id],
    queryFn: () => clientPOApi.getById(Number(id)),
  });

  const { data: schedules, isLoading: isLoadingSchedules } = useQuery<BillingSchedule[]>({
    queryKey: ['client-po-schedules', id],
    queryFn: () => clientPOApi.getSchedules(Number(id)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: ClientPOStatus) => clientPOApi.updateStatus(Number(id), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-po', id] });
      queryClient.invalidateQueries({ queryKey: ['client-pos'] });
      toast.success('Status updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    },
  });

  const generateSchedulesMutation = useMutation({
    mutationFn: (data: { start_date: string; end_date?: string }) =>
      clientPOApi.generateSchedules(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-po-schedules', id] });
      setShowGenerateModal(false);
      toast.success('Billing schedules generated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to generate schedules');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => clientPOApi.deleteSchedule(Number(id), scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-po-schedules', id] });
      toast.success('Schedule deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete schedule');
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (scheduleId: number) => clientPOApi.createInvoiceFromSchedule(Number(id), scheduleId),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['client-po-schedules', id] });
      queryClient.invalidateQueries({ queryKey: ['client-po', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Invoice ${invoice.invoice_number} created successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    },
  });

  const handleGenerateSchedules = () => {
    if (!generateStartDate) {
      toast.error('Please select a start date');
      return;
    }
    generateSchedulesMutation.mutate({
      start_date: generateStartDate,
      end_date: generateEndDate || undefined,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!clientPO) {
    return <div className="text-center py-8">Client PO not found</div>;
  }

  const canGenerateSchedules =
    clientPO.billing_frequency !== 'ONE_TIME' &&
    clientPO.billing_frequency !== 'MILESTONE' &&
    (clientPO.status === 'DRAFT' || clientPO.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/client-pos')} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{clientPO.internal_number}</h1>
            <p className="text-gray-500">
              {clientPO.client_name} {clientPO.branch_name && `• ${clientPO.branch_name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[clientPO.status]}`}>
            {clientPO.status}
          </span>
          {clientPO.status === 'DRAFT' && (
            <>
              <Link to={`/client-pos/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <Button onClick={() => updateStatusMutation.mutate('ACTIVE')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Activate
              </Button>
            </>
          )}
          {clientPO.status === 'ACTIVE' && (
            <Button variant="outline" onClick={() => updateStatusMutation.mutate('CANCELLED')}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* PO Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold">PO Details</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Client's PO Number</p>
                <p className="font-medium">{clientPO.client_po_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Client's PO Date</p>
                <p className="font-medium">{clientPO.client_po_date ? formatDate(clientPO.client_po_date) : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Received Date</p>
                <p className="font-medium">{formatDate(clientPO.received_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Billing Frequency</p>
                <p className="font-medium">{FREQUENCY_LABELS[clientPO.billing_frequency]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valid From</p>
                <p className="font-medium">{formatDate(clientPO.valid_from)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Valid Until</p>
                <p className="font-medium">{clientPO.valid_until ? formatDate(clientPO.valid_until) : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Place of Supply</p>
                <p className="font-medium">{clientPO.place_of_supply || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">GST Type</p>
                <p className="font-medium">{clientPO.is_igst ? 'IGST' : 'CGST + SGST'}</p>
              </div>
            </div>
            {clientPO.subject && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Subject</p>
                <p className="font-medium">{clientPO.subject}</p>
              </div>
            )}
            {clientPO.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Notes</p>
                <p className="text-gray-700">{clientPO.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Amount Summary</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(clientPO.subtotal)}</span>
            </div>
            {clientPO.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount ({clientPO.discount_percent}%)</span>
                <span>- {formatCurrency(clientPO.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Taxable Amount</span>
              <span className="font-medium">{formatCurrency(clientPO.taxable_amount)}</span>
            </div>
            {clientPO.is_igst ? (
              <div className="flex justify-between">
                <span className="text-gray-600">IGST</span>
                <span>{formatCurrency(clientPO.igst_amount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST</span>
                  <span>{formatCurrency(clientPO.cgst_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST</span>
                  <span>{formatCurrency(clientPO.sgst_amount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t pt-3 text-lg font-bold">
              <span>Total</span>
              <span>{formatCurrency(clientPO.total_amount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Invoiced</span>
              <span>{formatCurrency(clientPO.invoiced_amount)}</span>
            </div>
            <div className="flex justify-between text-orange-600 font-medium">
              <span>Remaining</span>
              <span>{formatCurrency(clientPO.remaining_amount)}</span>
            </div>
            {/* Fulfillment Progress Bar */}
            {Number(clientPO.total_amount) > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Fulfillment Progress</span>
                  <span>{Math.round((Number(clientPO.invoiced_amount) / Number(clientPO.total_amount)) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (Number(clientPO.invoiced_amount) / Number(clientPO.total_amount)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Line Items</h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">HSN/SAC</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">GST%</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody>
                {(clientPO.items || []).map((item, index) => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-2 text-sm">{index + 1}</td>
                    <td className="px-4 py-2 text-sm">{item.description}</td>
                    <td className="px-4 py-2 text-sm">{item.hsn_sac || '-'}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm">{item.unit}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.amount)}</td>
                    <td className="px-4 py-2 text-sm text-right">{item.gst_rate}%</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(item.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Billing Schedules */}
      {clientPO.billing_frequency !== 'ONE_TIME' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold">Billing Schedules</h2>
            {canGenerateSchedules && (
              <Button variant="outline" onClick={() => setShowGenerateModal(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Schedules
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingSchedules ? (
              <div className="text-center py-4">Loading schedules...</div>
            ) : (schedules || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No billing schedules yet.
                {canGenerateSchedules && ' Click "Generate Schedules" to create them.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Due Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">GST</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules?.map((schedule) => (
                      <tr key={schedule.id} className="border-b">
                        <td className="px-4 py-2 text-sm">{schedule.installment_number}</td>
                        <td className="px-4 py-2 text-sm">{schedule.description || '-'}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {formatDate(schedule.due_date)}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(schedule.amount)}</td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(schedule.gst_amount)}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">
                          {formatCurrency(schedule.total_amount)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              SCHEDULE_STATUS_COLORS[schedule.status]
                            }`}
                          >
                            {schedule.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {schedule.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => createInvoiceMutation.mutate(schedule.id)}
                                  disabled={createInvoiceMutation.isPending}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                  title="Create Invoice"
                                >
                                  <Receipt className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Schedule"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {schedule.status === 'INVOICED' && schedule.invoice_id && (
                              <Link
                                to={`/invoices/${schedule.invoice_id}`}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Invoice"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generate Schedules Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Generate Billing Schedules</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={generateStartDate}
                  onChange={(e) => setGenerateStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={generateEndDate}
                  onChange={(e) => setGenerateEndDate(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to use PO valid until date
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateSchedules} disabled={generateSchedulesMutation.isPending}>
                {generateSchedulesMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
