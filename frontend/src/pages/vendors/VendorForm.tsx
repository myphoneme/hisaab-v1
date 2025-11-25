import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Vendor, VendorCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface VendorFormProps {
  vendor?: Vendor | null;
  onSubmit: (data: VendorCreate) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const VENDOR_TYPES = [
  { value: 'GOODS', label: 'Goods' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'BOTH', label: 'Both' },
];

export function VendorForm({ vendor, onSubmit, onClose, isLoading }: VendorFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<VendorCreate>({
    defaultValues: vendor ? {
      name: vendor.name,
      gstin: vendor.gstin || '',
      pan: vendor.pan,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      state_code: vendor.state_code,
      pincode: vendor.pincode,
      email: vendor.email,
      phone: vendor.phone,
      contact_person: vendor.contact_person,
      vendor_type: vendor.vendor_type,
      payment_terms: vendor.payment_terms,
      bank_name: vendor.bank_name || '',
      bank_account: vendor.bank_account || '',
      bank_ifsc: vendor.bank_ifsc || '',
    } : {
      vendor_type: 'BOTH' as const,
      payment_terms: 30,
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
              <Input {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-sm mt-1">Required</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
              <Input {...register('contact_person', { required: true })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Type *</label>
              <Select {...register('vendor_type', { required: true })}>
                {VENDOR_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <Input type="email" {...register('email', { required: true })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <Input {...register('phone', { required: true })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN *</label>
              <Input {...register('pan', { required: true })} maxLength={10} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <Input {...register('gstin')} maxLength={15} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <Input {...register('address', { required: true })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <Input {...register('city', { required: true })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <Input {...register('state', { required: true })} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State Code *</label>
              <Input {...register('state_code', { required: true })} maxLength={2} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <Input {...register('pincode', { required: true })} maxLength={6} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <Input {...register('bank_name')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
              <Input {...register('bank_account')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
              <Input {...register('bank_ifsc')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
              <Input type="number" {...register('payment_terms', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" onClick={onClose} variant="secondary">Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
