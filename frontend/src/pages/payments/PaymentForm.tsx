import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { Payment, PaymentCreate, Client, Vendor, Invoice } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { BankAccountSelector } from '../../components/ui/BankAccountSelector';
import { clientApi, vendorApi, invoiceApi } from '../../services/api';
import { useEffect } from 'react';

interface PaymentFormProps {
  payment?: Payment | null;
  onSubmit: (data: PaymentCreate) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
];

export function PaymentForm({ payment, onSubmit, onClose, isLoading }: PaymentFormProps) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<PaymentCreate>({
    defaultValues: payment ? {
      payment_date: payment.payment_date,
      payment_type: payment.payment_type,
      branch_id: payment.branch_id ?? undefined,
      bank_account_id: payment.bank_account_id ?? undefined,
      client_id: payment.client_id ?? undefined,
      vendor_id: payment.vendor_id ?? undefined,
      invoice_id: payment.invoice_id ?? undefined,
      gross_amount: payment.gross_amount,
      tds_amount: payment.tds_amount || 0,
      tcs_amount: payment.tcs_amount || 0,
      payment_mode: payment.payment_mode,
      reference_number: payment.reference_number ?? undefined,
      notes: payment.notes ?? undefined,
    } : {
      payment_date: new Date().toISOString().split('T')[0],
      payment_type: 'RECEIPT' as const,
      tds_amount: 0,
      tcs_amount: 0,
      payment_mode: 'CASH' as const,
    },
  });

  // Watch form fields for conditional rendering
  const paymentType = watch('payment_type');
  const paymentMode = watch('payment_mode');
  const branchId = watch('branch_id');
  const grossAmount = watch('gross_amount') || 0;
  const tdsAmount = watch('tds_amount') || 0;
  const tcsAmount = watch('tcs_amount') || 0;
  const selectedClientId = watch('client_id');
  const selectedVendorId = watch('vendor_id');

  // Calculate net amount
  const netAmount = grossAmount - tdsAmount + tcsAmount;

  // Fetch clients
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await clientApi.getAll();
      return response?.items || [];
    },
    enabled: paymentType === 'RECEIPT',
  });

  // Fetch vendors
  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await vendorApi.getAll();
      return response?.items || [];
    },
    enabled: paymentType === 'PAYMENT',
  });

  // Fetch invoices based on selected party
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices', paymentType, selectedClientId, selectedVendorId],
    queryFn: async () => {
      const params: any = {};
      if (paymentType === 'RECEIPT' && selectedClientId) {
        params.client_id = selectedClientId;
      } else if (paymentType === 'PAYMENT' && selectedVendorId) {
        params.vendor_id = selectedVendorId;
      }
      const response = await invoiceApi.getAll(params);
      return response?.items || [];
    },
    enabled: (paymentType === 'RECEIPT' && !!selectedClientId) || (paymentType === 'PAYMENT' && !!selectedVendorId),
  });

  const clients = clientsData as Client[] | undefined;
  const vendors = vendorsData as Vendor[] | undefined;
  const invoices = invoicesData as Invoice[] | undefined;

  // Clear client/vendor when payment type changes
  useEffect(() => {
    if (paymentType === 'RECEIPT') {
      setValue('vendor_id', undefined);
    } else if (paymentType === 'PAYMENT') {
      setValue('client_id', undefined);
    }
    setValue('invoice_id', undefined);
  }, [paymentType, setValue]);

  const handleFormSubmit = (data: PaymentCreate) => {
    // Clean up and prepare data
    const submitData: PaymentCreate = {
      payment_date: data.payment_date,
      payment_type: data.payment_type,
      branch_id: Number(data.branch_id),
      bank_account_id: Number(data.bank_account_id),
      gross_amount: Number(data.gross_amount),
      tds_amount: Number(data.tds_amount) || 0,
      tcs_amount: Number(data.tcs_amount) || 0,
      payment_mode: data.payment_mode,
      client_id: data.payment_type === 'RECEIPT' ? Number(data.client_id) : undefined,
      vendor_id: data.payment_type === 'PAYMENT' ? Number(data.vendor_id) : undefined,
      invoice_id: data.invoice_id ? Number(data.invoice_id) : undefined,
      reference_number: data.reference_number?.trim() || undefined,
      cheque_date: data.cheque_date || undefined,
      notes: data.notes?.trim() || undefined,
    };
    console.log('Submitting payment data:', submitData);
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {payment ? 'Edit Payment' : 'Record Payment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type *</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    {...register('payment_type', { required: true })}
                    value="RECEIPT"
                    className="mr-2"
                  />
                  <span>Receipt (from Client)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    {...register('payment_type', { required: true })}
                    value="PAYMENT"
                    className="mr-2"
                  />
                  <span>Payment (to Vendor)</span>
                </label>
              </div>
            </div>

            {/* Branch */}
            <div>
              <BranchSelector
                value={branchId || ''}
                onChange={(id) => setValue('branch_id', id, { shouldValidate: true })}
                required
                error={errors.branch_id?.message}
              />
            </div>

            {/* Bank Account */}
            <div>
              <BankAccountSelector
                branchId={branchId || null}
                value={watch('bank_account_id') || ''}
                onChange={(id) => setValue('bank_account_id', id, { shouldValidate: true })}
                required
                error={errors.bank_account_id?.message}
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
              <Input type="date" {...register('payment_date', { required: true })} />
              {errors.payment_date && <p className="text-red-500 text-sm mt-1">Required</p>}
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
              <Select {...register('payment_mode', { required: true })}>
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Client (for RECEIPT) */}
            {paymentType === 'RECEIPT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                <Select {...register('client_id', { required: paymentType === 'RECEIPT' })}>
                  <option value="">Select Client</option>
                  {clients?.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
                {errors.client_id && <p className="text-red-500 text-sm mt-1">Required</p>}
              </div>
            )}

            {/* Vendor (for PAYMENT) */}
            {paymentType === 'PAYMENT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                <Select {...register('vendor_id', { required: paymentType === 'PAYMENT' })}>
                  <option value="">Select Vendor</option>
                  {vendors?.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </Select>
                {errors.vendor_id && <p className="text-red-500 text-sm mt-1">Required</p>}
              </div>
            )}

            {/* Invoice */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice (Optional)</label>
              <Select {...register('invoice_id')}>
                <option value="">None</option>
                {invoices?.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number} - {Number(invoice.total_amount || 0).toFixed(2)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gross Amount *</label>
              <Input
                type="number"
                step="0.01"
                {...register('gross_amount', { required: true, min: 0 })}
                placeholder="0.00"
              />
              {errors.gross_amount && <p className="text-red-500 text-sm mt-1">Required</p>}
            </div>

            {/* TDS Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TDS Amount</label>
              <Input
                type="number"
                step="0.01"
                {...register('tds_amount', { min: 0 })}
                placeholder="0.00"
                defaultValue={0}
              />
            </div>

            {/* TCS Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TCS Amount</label>
              <Input
                type="number"
                step="0.01"
                {...register('tcs_amount', { min: 0 })}
                placeholder="0.00"
                defaultValue={0}
              />
            </div>

            {/* Net Amount (Calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Net Amount</label>
              <Input
                type="text"
                value={netAmount.toFixed(2)}
                readOnly
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Gross - TDS + TCS</p>
            </div>

            {/* Reference Number (conditional) */}
            {(paymentMode === 'BANK_TRANSFER' || paymentMode === 'CHEQUE' || paymentMode === 'UPI') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number {paymentMode !== 'CASH' && '*'}
                </label>
                <Input
                  {...register('reference_number', {
                    required: paymentMode === 'BANK_TRANSFER' || paymentMode === 'CHEQUE' || paymentMode === 'UPI',
                  })}
                  placeholder="Transaction/Cheque/UPI ID"
                />
                {errors.reference_number && <p className="text-red-500 text-sm mt-1">Required</p>}
              </div>
            )}

            {/* Cheque Date (conditional) */}
            {paymentMode === 'CHEQUE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cheque Date</label>
                <Input type="date" {...register('cheque_date')} />
              </div>
            )}

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...register('notes')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Additional notes about this payment"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : payment ? 'Update Payment' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
