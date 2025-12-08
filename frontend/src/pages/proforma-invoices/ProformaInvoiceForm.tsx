import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { proformaInvoiceApi, clientApi, stateApi, bankAccountApi, itemApi, settingsApi } from '../../services/api';
import type { Client, ProformaInvoice, State, BankAccount, Item, CompanySettings } from '../../types';

interface PIItem {
  serial_no: number;
  item_id?: number;
  item_name?: string;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  gst_rate: number;
  cess_rate: number;
}

interface PIFormData {
  pi_date: string;
  branch_id?: number;
  bank_account_id?: number;
  client_id?: number;
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
  valid_until: string;
  notes: string;
  terms_conditions: string;
  items: PIItem[];
}

export function ProformaInvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<PIFormData>({
    pi_date: new Date().toISOString().split('T')[0],
    branch_id: undefined,
    bank_account_id: undefined,
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
    valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

  // Fetch existing PI for edit mode
  const { data: existingPI, isLoading: isLoadingPI } = useQuery<ProformaInvoice>({
    queryKey: ['proforma-invoice', id],
    queryFn: () => proformaInvoiceApi.getById(Number(id)),
    enabled: isEdit,
  });

  // Fetch items from Item Master (moved here so it's available for useEffect below)
  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ['items-active'],
    queryFn: async () => {
      const response = await itemApi.getActive();
      return response || [];
    },
  });

  // Fetch company settings for default terms
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Set default terms from settings for new PI or if terms is empty (generated from schedule)
  useEffect(() => {
    if (!isEdit && settings?.pi_terms && !formData.terms_conditions) {
      setFormData(prev => ({
        ...prev,
        terms_conditions: settings.pi_terms || '',
      }));
    }
  }, [isEdit, settings]);

  // Populate form with existing PI data
  useEffect(() => {
    if (existingPI && items.length > 0) {
      const mappedItems = existingPI.items?.map((item, index) => {
        // Try to find item_id by matching item_name, description, or HSN/SAC if item_id is not set
        let itemId = item.item_id;
        let itemName = item.item_name;

        if (!itemId && items.length > 0) {
          // First try to match by item_name
          if (item.item_name) {
            const matchedItem = items.find(i => i.name === item.item_name);
            if (matchedItem) {
              itemId = matchedItem.id;
              itemName = matchedItem.name;
            }
          }
          // If still not found, try to match by HSN/SAC code
          if (!itemId && item.hsn_sac) {
            const matchedItem = items.find(i => i.hsn_sac === item.hsn_sac);
            if (matchedItem) {
              itemId = matchedItem.id;
              itemName = matchedItem.name;
            }
          }
          // If still not found, try to match by description
          if (!itemId && item.description) {
            const matchedItem = items.find(i =>
              i.name === item.description ||
              i.description === item.description
            );
            if (matchedItem) {
              itemId = matchedItem.id;
              itemName = matchedItem.name;
            }
          }
        }

        return {
          serial_no: item.serial_no || index + 1,
          item_id: itemId,
          item_name: itemName,
          description: item.description,
          hsn_sac: item.hsn_sac || '',
          quantity: Number(item.quantity),
          unit: item.unit || 'NOS',
          rate: Number(item.rate),
          discount_percent: Number(item.discount_percent) || 0,
          gst_rate: Number(item.gst_rate) || 18,
          cess_rate: Number(item.cess_rate) || 0,
        };
      }) || [];

      setFormData({
        pi_date: existingPI.pi_date.split('T')[0],
        branch_id: existingPI.branch_id ?? undefined,
        bank_account_id: existingPI.bank_account_id ?? undefined,
        client_id: existingPI.client_id ?? undefined,
        place_of_supply: existingPI.place_of_supply || '',
        place_of_supply_code: existingPI.place_of_supply_code || '',
        is_igst: existingPI.is_igst,
        reverse_charge: existingPI.reverse_charge || false,
        discount_percent: existingPI.discount_percent || 0,
        tds_applicable: existingPI.tds_applicable || false,
        tds_section: existingPI.tds_section || '',
        tds_rate: existingPI.tds_rate || 0,
        tcs_applicable: existingPI.tcs_applicable || false,
        tcs_rate: existingPI.tcs_rate || 0,
        due_date: existingPI.due_date.split('T')[0],
        valid_until: existingPI.valid_until?.split('T')[0] || '',
        notes: existingPI.notes || '',
        // Use settings.pi_terms if terms_conditions is empty (e.g., generated from schedule)
        terms_conditions: existingPI.terms_conditions || settings?.pi_terms || '',
        items: mappedItems,
      });
    }
  }, [existingPI, items, settings]);

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await clientApi.getAll();
      return response.items || [];
    },
  });

  // Fetch states
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ['states'],
    queryFn: () => stateApi.getAll(),
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const response = await bankAccountApi.getAll({ is_active: true, page_size: 100 });
      return response.items || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PIFormData) => proformaInvoiceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      toast.success('Proforma Invoice created successfully!');
      navigate('/proforma-invoices');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to create proforma invoice');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PIFormData) => proformaInvoiceApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      toast.success('Proforma Invoice updated successfully!');
      navigate('/proforma-invoices');
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to update proforma invoice');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Debug: Log the data being sent
    console.log('PI Form Submit - Data:', {
      bank_account_id: formData.bank_account_id,
      tds_section: formData.tds_section,
      notes: formData.notes,
      tds_applicable: formData.tds_applicable,
    });
    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: keyof PIFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof PIItem, value: unknown) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: updatedItems }));
  };

  // Handle item selection from master - auto-populate fields
  const handleItemSelect = (index: number, itemId: number | undefined) => {
    const updatedItems = [...formData.items];

    if (itemId) {
      const selectedItem = items.find(item => item.id === itemId);
      if (selectedItem) {
        updatedItems[index] = {
          ...updatedItems[index],
          item_id: selectedItem.id,
          item_name: selectedItem.name,
          description: selectedItem.description || selectedItem.name,
          hsn_sac: selectedItem.hsn_sac || '',
          unit: selectedItem.default_unit || 'NOS',
          rate: Number(selectedItem.default_rate) || 0,
          gst_rate: Number(selectedItem.default_gst_rate) || 18,
        };
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        item_id: undefined,
        item_name: undefined,
      };
    }

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

  const calculateItemAmount = (item: PIItem) => {
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

  // Show loading state when fetching existing PI
  if (isEdit && isLoadingPI) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading proforma invoice data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Proforma Invoice' : 'Create Proforma Invoice'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit ? 'Update proforma invoice details' : 'Create a new proforma invoice'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/proforma-invoices')}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">PI Details</h3>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <BranchSelector
                  value={formData.branch_id}
                  onChange={(branchId) => handleChange('branch_id', branchId)}
                  required={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PI Date *
                </label>
                <Input
                  type="date"
                  value={formData.pi_date}
                  onChange={(e) => handleChange('pi_date', e.target.value)}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until
                </label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => handleChange('valid_until', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.client_id || ''}
                  onChange={(e) => handleChange('client_id', Number(e.target.value))}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place of Supply *
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.place_of_supply_code}
                  onChange={(e) => {
                    const selectedState = states.find(s => s.code === e.target.value);
                    if (selectedState) {
                      handleChange('place_of_supply_code', selectedState.code);
                      handleChange('place_of_supply', selectedState.name);
                    }
                  }}
                  required
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.code}>
                      {state.code} - {state.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.bank_account_id || ''}
                  onChange={(e) =>
                    handleChange('bank_account_id', e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name} ({account.account_number.slice(-4)})
                    </option>
                  ))}
                </select>
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
                <label htmlFor="reverse_charge" className="text-sm font-medium text-gray-700">
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
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Item Name (Optional)</label>
                    <select
                      className="w-full border border-gray-300 rounded-md px-2 py-2 text-sm"
                      value={item.item_id ? String(item.item_id) : ''}
                      onChange={(e) => handleItemSelect(index, e.target.value ? Number(e.target.value) : undefined)}
                    >
                      <option value="">-- Select from Master --</option>
                      {items.map((masterItem) => (
                        <option key={masterItem.id} value={String(masterItem.id)}>
                          {masterItem.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Description *</label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">HSN/SAC</label>
                    <Input
                      value={item.hsn_sac}
                      onChange={(e) => handleItemChange(index, 'hsn_sac', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Qty *</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
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
                      onChange={(e) => handleItemChange(index, 'rate', Number(e.target.value))}
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
                      onChange={(e) => handleItemChange(index, 'discount_percent', Number(e.target.value))}
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
                      onChange={(e) => handleItemChange(index, 'gst_rate', Number(e.target.value))}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Amount</label>
                    <div className="font-medium text-gray-900 py-2 text-right text-sm">
                      ₹{calculateItemAmount(item).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end justify-center">
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
                    onChange={(e) => handleChange('tds_applicable', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="tds_applicable" className="text-sm font-medium text-gray-700">
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
                        onChange={(e) => handleChange('tds_rate', Number(e.target.value))}
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
                    onChange={(e) => handleChange('tcs_applicable', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="tcs_applicable" className="text-sm font-medium text-gray-700">
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
                      onChange={(e) => handleChange('tcs_rate', Number(e.target.value))}
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
            onClick={() => navigate('/proforma-invoices')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update' : 'Create'} Proforma Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}
