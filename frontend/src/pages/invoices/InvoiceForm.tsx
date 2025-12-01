import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { invoiceApi, clientApi, vendorApi } from '../../services/api';
import type { Client, Vendor } from '../../types';

interface InvoiceItem {
  serial_no: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  gst_rate: number;
  cess_rate: number;
}

interface InvoiceFormData {
  invoice_date: string;
  invoice_type: 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  branch_id: number;
  client_id?: number;
  vendor_id?: number;
  place_of_supply: string;
  place_of_supply_code: string;
  is_igst: boolean;
  reverse_charge: boolean;
  discount_percent: number;
  tds_applicable: boolean;
  tds_section: string;
  tds_rate: number;
  tcs_applicable: boolean;
  tcs_rate: number;
  due_date: string;
  notes: string;
  terms_conditions: string;
  items: InvoiceItem[];
}

export function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_date: new Date().toISOString().split('T')[0],
    invoice_type: 'SALES',
    branch_id: 0,
    place_of_supply: '',
    place_of_supply_code: '',
    is_igst: false,
    reverse_charge: false,
    discount_percent: 0,
    tds_applicable: false,
    tds_section: '',
    tds_rate: 0,
    tcs_applicable: false,
    tcs_rate: 0,
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms_conditions: '',
    items: [
      {
        serial_no: 1,
        description: '',
        hsn_sac: '',
        quantity: 1,
        unit: 'NOS',
        rate: 0,
        discount_percent: 0,
        gst_rate: 18,
        cess_rate: 0,
      },
    ],
  });

  // Fetch clients and vendors
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await clientApi.getAll();
      return response.items || [];
    },
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await vendorApi.getAll();
      return response.items || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => invoiceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert('Invoice created successfully!');
      navigate('/invoices');
    },
    onError: (error: any) => {
      alert(`Failed to create invoice: ${error.response?.data?.detail || error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InvoiceFormData) => invoiceApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert('Invoice updated successfully!');
      navigate('/invoices');
    },
    onError: (error: any) => {
      alert(`Failed to update invoice: ${error.response?.data?.detail || error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof InvoiceFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serial_no: prev.items.length + 1,
          description: '',
          hsn_sac: '',
          quantity: 1,
          unit: 'NOS',
          rate: 0,
          discount_percent: 0,
          gst_rate: 18,
          cess_rate: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const calculateItemAmount = (item: InvoiceItem) => {
    const amount = item.quantity * item.rate;
    const discountAmount = (amount * item.discount_percent) / 100;
    const taxableAmount = amount - discountAmount;
    const gstAmount = (taxableAmount * item.gst_rate) / 100;
    const cessAmount = (taxableAmount * item.cess_rate) / 100;
    return taxableAmount + gstAmount + cessAmount;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce(
      (sum, item) => sum + item.quantity * item.rate,
      0
    );
    const discountAmount = (subtotal * formData.discount_percent) / 100;
    const taxableAmount = subtotal - discountAmount;

    const totalGST = formData.items.reduce((sum, item) => {
      const itemTaxable = item.quantity * item.rate * (1 - item.discount_percent / 100);
      return sum + (itemTaxable * item.gst_rate) / 100;
    }, 0);

    const totalCess = formData.items.reduce((sum, item) => {
      const itemTaxable = item.quantity * item.rate * (1 - item.discount_percent / 100);
      return sum + (itemTaxable * item.cess_rate) / 100;
    }, 0);

    const total = taxableAmount + totalGST + totalCess;
    const tdsAmount = formData.tds_applicable ? (taxableAmount * formData.tds_rate) / 100 : 0;
    const tcsAmount = formData.tcs_applicable ? (total * formData.tcs_rate) / 100 : 0;
    const netAmount = total - tdsAmount + tcsAmount;

    return { subtotal, taxableAmount, totalGST, totalCess, total, tdsAmount, tcsAmount, netAmount };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update invoice details' : 'Create a new sales or purchase invoice'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/invoices')}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Invoice Details</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Type *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.invoice_type}
                  onChange={(e) =>
                    handleChange('invoice_type', e.target.value as any)
                  }
                  required
                >
                  <option value="SALES">Sales Invoice</option>
                  <option value="PURCHASE">Purchase Invoice</option>
                  <option value="CREDIT_NOTE">Credit Note</option>
                  <option value="DEBIT_NOTE">Debit Note</option>
                </select>
              </div>

              <div>
                <BranchSelector
                  value={formData.branch_id}
                  onChange={(branchId) => handleChange('branch_id', branchId)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date *
                </label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => handleChange('invoice_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  required
                />
              </div>

              {['SALES', 'CREDIT_NOTE'].includes(formData.invoice_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.client_id || ''}
                    onChange={(e) =>
                      handleChange('client_id', Number(e.target.value))
                    }
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {['PURCHASE', 'DEBIT_NOTE'].includes(formData.invoice_type) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.vendor_id || ''}
                    onChange={(e) =>
                      handleChange('vendor_id', Number(e.target.value))
                    }
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place of Supply *
                </label>
                <Input
                  value={formData.place_of_supply}
                  onChange={(e) => handleChange('place_of_supply', e.target.value)}
                  placeholder="e.g., Maharashtra"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State Code *
                </label>
                <Input
                  value={formData.place_of_supply_code}
                  onChange={(e) =>
                    handleChange('place_of_supply_code', e.target.value)
                  }
                  placeholder="e.g., 27"
                  maxLength={2}
                  required
                />
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="is_igst"
                  checked={formData.is_igst}
                  onChange={(e) => handleChange('is_igst', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="is_igst" className="text-sm font-medium text-gray-700">
                  IGST (Inter-state)
                </label>
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="reverse_charge"
                  checked={formData.reverse_charge}
                  onChange={(e) => handleChange('reverse_charge', e.target.checked)}
                  className="mr-2"
                />
                <label
                  htmlFor="reverse_charge"
                  className="text-sm font-medium text-gray-700"
                >
                  Reverse Charge
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-start border-b pb-4"
                >
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500">Description *</label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">HSN/SAC</label>
                    <Input
                      value={item.hsn_sac}
                      onChange={(e) =>
                        handleItemChange(index, 'hsn_sac', e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Qty *</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', Number(e.target.value))
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Unit</label>
                    <Input
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Rate *</label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        handleItemChange(index, 'rate', Number(e.target.value))
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Disc %</label>
                    <Input
                      type="number"
                      value={item.discount_percent}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          'discount_percent',
                          Number(e.target.value)
                        )
                      }
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">GST %</label>
                    <Input
                      type="number"
                      value={item.gst_rate}
                      onChange={(e) =>
                        handleItemChange(index, 'gst_rate', Number(e.target.value))
                      }
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Amount</label>
                    <div className="font-medium text-gray-900 py-2">
                      ₹{calculateItemAmount(item).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount ({formData.discount_percent}%):</span>
                    <span className="font-medium">
                      -₹{(totals.subtotal - totals.taxableAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxable Amount:</span>
                    <span className="font-medium">₹{totals.taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{formData.is_igst ? 'IGST' : 'CGST + SGST'}:</span>
                    <span className="font-medium">₹{totals.totalGST.toFixed(2)}</span>
                  </div>
                  {totals.totalCess > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Cess:</span>
                      <span className="font-medium">₹{totals.totalCess.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>₹{totals.total.toFixed(2)}</span>
                  </div>
                  {formData.tds_applicable && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>TDS ({formData.tds_rate}%):</span>
                      <span>-₹{totals.tdsAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {formData.tcs_applicable && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>TCS ({formData.tcs_rate}%):</span>
                      <span>+₹{totals.tcsAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {(formData.tds_applicable || formData.tcs_applicable) && (
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Net Amount:</span>
                      <span>₹{totals.netAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TDS/TCS */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Tax Deductions</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="tds_applicable"
                    checked={formData.tds_applicable}
                    onChange={(e) =>
                      handleChange('tds_applicable', e.target.checked)
                    }
                    className="mr-2"
                  />
                  <label
                    htmlFor="tds_applicable"
                    className="text-sm font-medium text-gray-700"
                  >
                    TDS Applicable
                  </label>
                </div>
                {formData.tds_applicable && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TDS Section
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.tds_section}
                        onChange={(e) => handleChange('tds_section', e.target.value)}
                      >
                        <option value="">Select Section</option>
                        <option value="194C">194C - Contractor</option>
                        <option value="194J">194J - Professional</option>
                        <option value="194H">194H - Commission</option>
                        <option value="194I">194I - Rent</option>
                        <option value="194Q">194Q - Purchase of Goods</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        TDS Rate (%)
                      </label>
                      <Input
                        type="number"
                        value={formData.tds_rate}
                        onChange={(e) =>
                          handleChange('tds_rate', Number(e.target.value))
                        }
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="tcs_applicable"
                    checked={formData.tcs_applicable}
                    onChange={(e) =>
                      handleChange('tcs_applicable', e.target.checked)
                    }
                    className="mr-2"
                  />
                  <label
                    htmlFor="tcs_applicable"
                    className="text-sm font-medium text-gray-700"
                  >
                    TCS Applicable
                  </label>
                </div>
                {formData.tcs_applicable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TCS Rate (%)
                    </label>
                    <Input
                      type="number"
                      value={formData.tcs_rate}
                      onChange={(e) =>
                        handleChange('tcs_rate', Number(e.target.value))
                      }
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Additional Information</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Internal notes"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={4}
                  value={formData.terms_conditions}
                  onChange={(e) => handleChange('terms_conditions', e.target.value)}
                  placeholder="Payment terms and conditions"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/invoices')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update' : 'Create'} Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
