import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { PurchaseOrder, PurchaseOrderCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { clientApi } from '../../services/api';

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null;
  onSubmit: (data: PurchaseOrderCreate) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const UNITS = ['NOS', 'KG', 'METER', 'LITER', 'BOX', 'PIECE', 'SET'];

export function PurchaseOrderForm({ purchaseOrder, onSubmit, onClose, isLoading }: PurchaseOrderFormProps) {
  const { register, handleSubmit, formState: { errors }, control, watch } = useForm<PurchaseOrderCreate>({
    defaultValues: purchaseOrder ? {
      po_date: purchaseOrder.po_date,
      client_id: purchaseOrder.client_id,
      reference_number: purchaseOrder.reference_number || '',
      subject: purchaseOrder.subject || '',
      discount_percent: purchaseOrder.discount_percent,
      notes: purchaseOrder.notes || '',
      terms_conditions: purchaseOrder.terms_conditions || '',
      valid_until: purchaseOrder.valid_until || '',
      items: purchaseOrder.items.map(item => ({
        serial_no: item.serial_no,
        description: item.description,
        hsn_sac: item.hsn_sac || '',
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        gst_rate: item.gst_rate,
        cess_rate: item.cess_rate,
      })),
    } : {
      po_date: new Date().toISOString().split('T')[0],
      discount_percent: 0,
      items: [
        {
          serial_no: 1,
          description: '',
          hsn_sac: '',
          quantity: 1,
          unit: 'NOS',
          rate: 0,
          gst_rate: 18,
          cess_rate: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Fetch clients for dropdown
  const { data: clientsResponse } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response: any = await clientApi.getAll();
      return response?.items || [];
    },
  });

  const clients = clientsResponse || [];

  const watchItems = watch('items');

  // Calculate totals
  const calculateItemAmount = (quantity: number, rate: number) => {
    return quantity * rate;
  };

  const calculateSubtotal = () => {
    return watchItems.reduce((sum, item) => {
      return sum + calculateItemAmount(item.quantity || 0, item.rate || 0);
    }, 0);
  };

  const calculateTaxAmount = () => {
    return watchItems.reduce((sum, item) => {
      const amount = calculateItemAmount(item.quantity || 0, item.rate || 0);
      const gstAmount = (amount * (item.gst_rate || 0)) / 100;
      const cessAmount = (amount * (item.cess_rate || 0)) / 100;
      return sum + gstAmount + cessAmount;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const taxAmount = calculateTaxAmount();
  const discount = watch('discount_percent') || 0;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + taxAmount - discountAmount;

  const handleFormSubmit = (data: PurchaseOrderCreate) => {
    console.log('Submitting PO data:', data);
    onSubmit(data);
  };

  const addItem = () => {
    append({
      serial_no: fields.length + 1,
      description: '',
      hsn_sac: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      gst_rate: 18,
      cess_rate: 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto my-4">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PO Date *</label>
              <Input
                type="date"
                {...register('po_date', { required: 'PO date is required' })}
              />
              {errors.po_date && <p className="text-red-500 text-sm mt-1">{errors.po_date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <Select {...register('client_id', { required: 'Client is required', valueAsNumber: true })}>
                <option value="">Select Client</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
              {errors.client_id && <p className="text-red-500 text-sm mt-1">{errors.client_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
              <Input {...register('reference_number')} placeholder="Enter reference number" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <Input {...register('subject')} placeholder="Enter subject" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <Input type="date" {...register('valid_until')} />
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
              <Button type="button" onClick={addItem} variant="secondary" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">#</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Description *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">HSN/SAC</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Qty *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Unit</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Rate *</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">GST%</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Cess%</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Amount</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fields.map((field, index) => {
                    const quantity = watchItems[index]?.quantity || 0;
                    const rate = watchItems[index]?.rate || 0;
                    const amount = calculateItemAmount(quantity, rate);

                    return (
                      <tr key={field.id}>
                        <td className="px-2 py-2 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-2 py-2">
                          <Input
                            {...register(`items.${index}.description`, { required: true })}
                            placeholder="Item description"
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            {...register(`items.${index}.hsn_sac`)}
                            placeholder="HSN/SAC"
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.quantity`, { required: true, valueAsNumber: true, min: 0.01 })}
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Select {...register(`items.${index}.unit`)} className="w-full">
                            {UNITS.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.rate`, { required: true, valueAsNumber: true, min: 0 })}
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.gst_rate`, { valueAsNumber: true, min: 0, max: 100 })}
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.cess_rate`, { valueAsNumber: true, min: 0, max: 100 })}
                            className="w-full"
                          />
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium text-gray-900">
                          ₹{amount.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any notes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                <textarea
                  {...register('terms_conditions')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter terms and conditions"
                />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Discount:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      {...register('discount_percent', { valueAsNumber: true, min: 0, max: 100 })}
                      className="w-20 text-right"
                      placeholder="0"
                    />
                    <span>%</span>
                    <span className="font-medium w-24 text-right">₹{discountAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax (GST + Cess):</span>
                  <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (purchaseOrder ? 'Updating...' : 'Creating...') : (purchaseOrder ? 'Update Purchase Order' : 'Create Purchase Order')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
