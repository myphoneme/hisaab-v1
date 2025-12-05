import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { clientPOApi, clientApi, branchApi, itemApi, stateApi } from '../../services/api';
import type { ClientPO, ClientPOCreate, Client, Branch, Item, State, BillingFrequency } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { formatCurrency } from '../../lib/utils';

interface FormData extends Omit<ClientPOCreate, 'items'> {
  items: {
    item_id?: number;
    serial_no: number;
    description: string;
    hsn_sac?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gst_rate: number;
  }[];
}

const UNITS = ['NOS', 'KG', 'METER', 'LITER', 'BOX', 'PIECE', 'SET', 'HOUR', 'DAY', 'MONTH', 'YEAR'];
const GST_RATES = [0, 5, 12, 18, 28];

export function ClientPOForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [isIgst, setIsIgst] = useState(false);
  const [totals, setTotals] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxableAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalAmount: 0,
  });

  const { data: clientPO, isLoading: isLoadingPO } = useQuery({
    queryKey: ['client-po', id],
    queryFn: () => clientPOApi.getById(Number(id)),
    enabled: isEdit,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-dropdown'],
    queryFn: async () => {
      const response: any = await clientApi.getAll({ page_size: 100 });
      return response?.items || [];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['branches-dropdown'],
    queryFn: async () => {
      const response: any = await branchApi.getAll({ page_size: 100 });
      return response?.items || [];
    },
  });

  const { data: items } = useQuery({
    queryKey: ['items-active'],
    queryFn: async () => {
      return await itemApi.getActive();
    },
  });

  const { data: states } = useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      return await stateApi.getAll();
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      received_date: new Date().toISOString().split('T')[0],
      valid_from: new Date().toISOString().split('T')[0],
      billing_frequency: 'ONE_TIME' as BillingFrequency,
      is_igst: false,
      discount_percent: 0,
      discount_amount: 0,
      items: [{ serial_no: 1, description: '', quantity: 1, unit: 'NOS', rate: 0, amount: 0, gst_rate: 18 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Use useWatch for proper reactivity when form values change
  const watchItems = useWatch({ control, name: 'items' });
  const watchDiscountPercent = useWatch({ control, name: 'discount_percent' }) || 0;
  const watchIsIgst = useWatch({ control, name: 'is_igst' });
  const watchClientId = useWatch({ control, name: 'client_id' });

  // Auto-set IGST based on client state vs branch state
  useEffect(() => {
    if (watchClientId && clients && branches) {
      const selectedClient = clients.find((c: Client) => c.id === Number(watchClientId));
      const defaultBranch = branches.find((b: Branch) => b.is_head_office);

      if (selectedClient && defaultBranch) {
        const isInterState = selectedClient.state_code !== defaultBranch.state_code;
        setValue('is_igst', isInterState);
        setIsIgst(isInterState);

        // Set place of supply from client
        setValue('place_of_supply', selectedClient.state);
        setValue('place_of_supply_code', selectedClient.state_code);
      }
    }
  }, [watchClientId, clients, branches, setValue]);

  // Calculate totals when items or discount change
  useEffect(() => {
    if (!watchItems) return;

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    watchItems.forEach((item) => {
      const amount = Number(item.quantity || 0) * Number(item.rate || 0);
      subtotal += amount;
    });

    const discountAmount = watchDiscountPercent > 0 ? (subtotal * watchDiscountPercent) / 100 : 0;
    const taxableAmount = subtotal - discountAmount;

    watchItems.forEach((item) => {
      const amount = Number(item.quantity || 0) * Number(item.rate || 0);
      const itemTaxable = amount * (1 - watchDiscountPercent / 100);
      const gstAmount = (itemTaxable * Number(item.gst_rate || 18)) / 100;

      if (watchIsIgst) {
        totalIgst += gstAmount;
      } else {
        totalCgst += gstAmount / 2;
        totalSgst += gstAmount / 2;
      }
    });

    setTotals({
      subtotal,
      discountAmount,
      taxableAmount,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      totalAmount: taxableAmount + totalCgst + totalSgst + totalIgst,
    });
  }, [watchItems, watchDiscountPercent, watchIsIgst]);

  // Load existing PO data
  useEffect(() => {
    if (clientPO && isEdit) {
      reset({
        client_po_number: clientPO.client_po_number || '',
        client_po_date: clientPO.client_po_date || '',
        received_date: clientPO.received_date,
        client_id: clientPO.client_id,
        branch_id: clientPO.branch_id || undefined,
        subject: clientPO.subject || '',
        notes: clientPO.notes || '',
        valid_from: clientPO.valid_from,
        valid_until: clientPO.valid_until || '',
        billing_frequency: clientPO.billing_frequency,
        place_of_supply: clientPO.place_of_supply || '',
        place_of_supply_code: clientPO.place_of_supply_code || '',
        is_igst: clientPO.is_igst,
        discount_percent: Number(clientPO.discount_percent),
        items: (clientPO.items || []).map((item) => ({
          item_id: item.item_id || undefined,
          serial_no: item.serial_no,
          description: item.description,
          hsn_sac: item.hsn_sac || '',
          quantity: Number(item.quantity),
          unit: item.unit,
          rate: Number(item.rate),
          amount: Number(item.amount),
          gst_rate: Number(item.gst_rate),
        })),
      });
      setIsIgst(clientPO.is_igst);
    }
  }, [clientPO, isEdit, reset]);

  const createMutation = useMutation({
    mutationFn: (data: ClientPOCreate) => clientPOApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-pos'] });
      toast.success('Client PO created successfully!');
      navigate('/client-pos');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create Client PO');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ClientPOCreate) => clientPOApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-pos'] });
      queryClient.invalidateQueries({ queryKey: ['client-po', id] });
      toast.success('Client PO updated successfully!');
      navigate('/client-pos');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update Client PO');
    },
  });

  const onSubmit = (data: FormData) => {
    // Calculate item amounts
    const itemsWithAmounts = data.items.map((item, index) => ({
      ...item,
      serial_no: index + 1,
      amount: Number(item.quantity) * Number(item.rate),
    }));

    const submitData: ClientPOCreate = {
      ...data,
      items: itemsWithAmounts,
    };

    if (isEdit) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleItemSelect = (index: number, itemId: number) => {
    const selectedItem = items?.find((item: Item) => item.id === itemId);
    if (selectedItem) {
      // Use item description if available, otherwise fall back to item name
      setValue(`items.${index}.description`, selectedItem.description || selectedItem.name);
      setValue(`items.${index}.hsn_sac`, selectedItem.hsn_sac || '');
      setValue(`items.${index}.gst_rate`, Number(selectedItem.default_gst_rate));
      setValue(`items.${index}.unit`, selectedItem.default_unit);
      if (selectedItem.default_rate) {
        setValue(`items.${index}.rate`, Number(selectedItem.default_rate));
      }
    }
  };

  const addItem = () => {
    append({
      serial_no: fields.length + 1,
      description: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      amount: 0,
      gst_rate: 18,
    });
  };

  if (isEdit && isLoadingPO) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/client-pos')} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Client PO' : 'New Client PO'}
          </h1>
          <p className="text-gray-500">Record a purchase order received from a client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">PO Details</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="client_id">Client *</Label>
              <select
                id="client_id"
                {...register('client_id', { required: 'Client is required', valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Client</option>
                {(clients || []).map((client: Client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {errors.client_id && <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>}
            </div>

            <div>
              <Label htmlFor="branch_id">Branch</Label>
              <select
                id="branch_id"
                {...register('branch_id', { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Branch</option>
                {(branches || []).map((branch: Branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_name} ({branch.branch_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="client_po_number">Client's PO Number</Label>
              <Input id="client_po_number" {...register('client_po_number')} placeholder="Client's PO reference" />
            </div>

            <div>
              <Label htmlFor="client_po_date">Client's PO Date</Label>
              <Input id="client_po_date" type="date" {...register('client_po_date')} />
            </div>

            <div>
              <Label htmlFor="received_date">Received Date *</Label>
              <Input
                id="received_date"
                type="date"
                {...register('received_date', { required: 'Received date is required' })}
              />
              {errors.received_date && <p className="mt-1 text-sm text-red-600">{errors.received_date.message}</p>}
            </div>

            <div>
              <Label htmlFor="billing_frequency">Billing Frequency</Label>
              <select
                id="billing_frequency"
                {...register('billing_frequency')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ONE_TIME">One Time</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="HALF_YEARLY">Half Yearly</option>
                <option value="YEARLY">Yearly</option>
                <option value="MILESTONE">Milestone</option>
              </select>
            </div>

            <div>
              <Label htmlFor="valid_from">Valid From *</Label>
              <Input
                id="valid_from"
                type="date"
                {...register('valid_from', { required: 'Valid from is required' })}
              />
              {errors.valid_from && <p className="mt-1 text-sm text-red-600">{errors.valid_from.message}</p>}
            </div>

            <div>
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input id="valid_until" type="date" {...register('valid_until')} />
            </div>

            <div>
              <Label htmlFor="place_of_supply">Place of Supply</Label>
              <select
                id="place_of_supply"
                {...register('place_of_supply')}
                onChange={(e) => {
                  const state = states?.find((s: State) => s.name === e.target.value);
                  if (state) {
                    setValue('place_of_supply_code', state.code);
                  }
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select State</option>
                {(states || []).map((state: State) => (
                  <option key={state.id} value={state.name}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...register('subject')} placeholder="Brief description of the PO" />
            </div>

            <div className="md:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...register('notes')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">HSN/SAC</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Qty</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Rate</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">GST%</th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const qty = watchItems?.[index]?.quantity || 0;
                    const rate = watchItems?.[index]?.rate || 0;
                    const amount = Number(qty) * Number(rate);

                    return (
                      <tr key={field.id} className="border-b">
                        <td className="px-2 py-2 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-2 py-2">
                          <select
                            {...register(`items.${index}.item_id`, { valueAsNumber: true })}
                            onChange={(e) => handleItemSelect(index, Number(e.target.value))}
                            className="w-32 border border-gray-300 rounded-md px-2 py-1 text-sm"
                          >
                            <option value="">Select</option>
                            {(items || []).map((item: Item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            {...register(`items.${index}.description`, { required: true })}
                            placeholder="Description"
                            className="min-w-[200px]"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input {...register(`items.${index}.hsn_sac`)} placeholder="HSN/SAC" className="w-20" />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.001"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 0 })}
                            className="w-20"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            {...register(`items.${index}.unit`)}
                            className="w-20 border border-gray-300 rounded-md px-2 py-1 text-sm"
                          >
                            {UNITS.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.rate`, { valueAsNumber: true, min: 0 })}
                            className="w-24"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            {...register(`items.${index}.gst_rate`, { valueAsNumber: true })}
                            className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm"
                          >
                            {GST_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium">{formatCurrency(amount)}</td>
                        <td className="px-2 py-2">
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

            {/* Totals Section */}
            <div className="mt-6 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Discount (%):</span>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('discount_percent', { valueAsNumber: true, min: 0, max: 100 })}
                    className="w-20 text-right"
                  />
                </div>
                {totals.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount Amount:</span>
                    <span>- {formatCurrency(totals.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Taxable Amount:</span>
                  <span className="font-medium">{formatCurrency(totals.taxableAmount)}</span>
                </div>
                {watchIsIgst ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IGST:</span>
                    <span>{formatCurrency(totals.igstAmount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST:</span>
                      <span>{formatCurrency(totals.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST:</span>
                      <span>{formatCurrency(totals.sgstAmount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.totalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/client-pos')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEdit
              ? 'Update Client PO'
              : 'Create Client PO'}
          </Button>
        </div>
      </form>
    </div>
  );
}
