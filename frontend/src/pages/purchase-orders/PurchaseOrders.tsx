import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, ShoppingCart, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { purchaseOrderApi, settingsApi } from '../../services/api';
import type { PurchaseOrder, PurchaseOrderCreate, CompanySettings } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { formatCurrency } from '../../lib/utils';
import { PurchaseOrderForm } from './PurchaseOrderForm';

export function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [branchId, setBranchId] = useState<number | string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders', branchId],
    queryFn: async () => {
      const params: any = {};
      if (branchId) params.branch_id = branchId;
      const response: any = await purchaseOrderApi.getAll(params);
      // Backend returns PaginatedResponse with items array
      return response?.items || [];
    },
  });

  // Fetch company settings for print
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => purchaseOrderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to delete purchase order';
      toast.error(errorMessage);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      purchaseOrderApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order status updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to update purchase order status';
      toast.error(errorMessage);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PurchaseOrderCreate) => purchaseOrderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowForm(false);
      toast.success('Purchase order created successfully!');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to create purchase order';

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => {
            const field = err.loc?.join('.') || 'Unknown field';
            return `${field}: ${err.msg}`;
          }).join('\n');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }

      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PurchaseOrderCreate }) =>
      purchaseOrderApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowForm(false);
      setEditingPO(null);
      toast.success('Purchase order updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to update purchase order';
      toast.error(errorMessage);
    },
  });

  const filteredOrders = (orders || []).filter((order) =>
    order.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (order: PurchaseOrder) => {
    setEditingPO(order);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handlePrint = (order: PurchaseOrder) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const companyLogo = settings?.company_logo || '';
    const companyName = settings?.company_name || 'Company Name';
    const companyAddress = settings?.address || '';
    const companyCity = settings?.city || '';
    const companyState = settings?.state || '';
    const companyPincode = settings?.pincode || '';
    const companyGstin = settings?.gstin || '';
    const companyPhone = settings?.phone || '';
    const companyEmail = settings?.email || '';

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${order.po_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .company-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
            .company-info { flex: 1; }
            .company-logo { max-height: 70px; margin-bottom: 10px; }
            .company-name { font-size: 20px; font-weight: bold; color: #333; margin: 0 0 5px 0; }
            .company-details { font-size: 12px; color: #666; line-height: 1.4; }
            .po-header { text-align: right; }
            .po-header h1 { margin: 0; color: #333; font-size: 24px; }
            .po-header p { margin: 3px 0; font-size: 12px; }
            .details { margin-bottom: 20px; }
            .details table { width: 100%; }
            .details td { padding: 5px; font-size: 13px; }
            .items { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items th, .items td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            .items th { background-color: #f2f2f2; }
            .items td.right { text-align: right; }
            .summary { margin-top: 20px; float: right; width: 300px; }
            .summary table { width: 100%; }
            .summary td { padding: 5px; font-size: 13px; }
            .summary .total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; }
            .notes { margin-top: 40px; clear: both; font-size: 12px; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="margin-bottom: 20px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>

          <div class="company-header">
            <div class="company-info">
              ${companyLogo ? `<img src="${companyLogo}" alt="Company Logo" class="company-logo" />` : ''}
              <p class="company-name">${companyName}</p>
              <div class="company-details">
                ${companyAddress ? `<p style="margin: 0;">${companyAddress}</p>` : ''}
                <p style="margin: 0;">${companyCity}${companyState ? `, ${companyState}` : ''} ${companyPincode}</p>
                ${companyGstin ? `<p style="margin: 0;"><strong>GSTIN:</strong> ${companyGstin}</p>` : ''}
                ${companyPhone ? `<p style="margin: 0;">Phone: ${companyPhone}</p>` : ''}
                ${companyEmail ? `<p style="margin: 0;">Email: ${companyEmail}</p>` : ''}
              </div>
            </div>
            <div class="po-header">
              <h1>PURCHASE ORDER</h1>
              <p><strong>PO Number:</strong> ${order.po_number}</p>
              <p><strong>Date:</strong> ${new Date(order.po_date).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div class="details">
            <table>
              <tr>
                <td><strong>Client:</strong> ${order.client?.name || 'N/A'}</td>
                <td><strong>Reference:</strong> ${order.reference_number || 'N/A'}</td>
              </tr>
              <tr>
                <td colspan="2"><strong>Subject:</strong> ${order.subject || 'N/A'}</td>
              </tr>
              ${order.valid_until ? `<tr><td colspan="2"><strong>Valid Until:</strong> ${new Date(order.valid_until).toLocaleDateString('en-IN')}</td></tr>` : ''}
            </table>
          </div>

          <table class="items">
            <thead>
              <tr>
                <th>#</th>
                <th>Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>GST%</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.description}</td>
                  <td>${item.hsn_sac || '-'}</td>
                  <td>${Number(item.quantity)}</td>
                  <td>${item.unit}</td>
                  <td class="right">₹${Number(item.rate).toFixed(2)}</td>
                  <td>${Number(item.gst_rate)}%</td>
                  <td class="right">₹${Number(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td class="right">₹${Number(order.subtotal).toFixed(2)}</td>
              </tr>
              ${Number(order.discount_amount) > 0 ? `
                <tr>
                  <td>Discount (${Number(order.discount_percent)}%):</td>
                  <td class="right">- ₹${Number(order.discount_amount).toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr>
                <td>CGST:</td>
                <td class="right">₹${Number(order.cgst_amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td>SGST:</td>
                <td class="right">₹${Number(order.sgst_amount).toFixed(2)}</td>
              </tr>
              <tr>
                <td>IGST:</td>
                <td class="right">₹${Number(order.igst_amount).toFixed(2)}</td>
              </tr>
              ${Number(order.cess_amount) > 0 ? `
                <tr>
                  <td>Cess:</td>
                  <td class="right">₹${Number(order.cess_amount).toFixed(2)}</td>
                </tr>
              ` : ''}
              <tr class="total">
                <td>Total:</td>
                <td class="right">₹${Number(order.total_amount).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${order.notes ? `
            <div class="notes">
              <h3>Notes:</h3>
              <p>${order.notes}</p>
            </div>
          ` : ''}

          ${order.terms_conditions ? `
            <div class="notes">
              <h3>Terms & Conditions:</h3>
              <p>${order.terms_conditions}</p>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPO(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 mt-1">Manage purchase orders from clients</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
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
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
                        <Select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="text-xs"
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="PARTIAL">Partially Fulfilled</option>
                          <option value="FULFILLED">Fulfilled</option>
                          <option value="CANCELLED">Cancelled</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleEdit(order)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(order)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
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

      {showForm && (
        <PurchaseOrderForm
          purchaseOrder={editingPO}
          onSubmit={(data) => {
            if (editingPO) {
              updateMutation.mutate({ id: editingPO.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onClose={handleCloseForm}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
