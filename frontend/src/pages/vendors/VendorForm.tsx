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

const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh(Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh(New)' },
];

export function VendorForm({ vendor, onSubmit, onClose, isLoading }: VendorFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<VendorCreate>({
    defaultValues: vendor ? {
      name: vendor.name,
      gstin: vendor.gstin || undefined,
      pan: vendor.pan,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      state_code: vendor.state_code,
      pincode: vendor.pincode,
      country: 'India',
      email: vendor.email,
      phone: vendor.phone,
      contact_person: vendor.contact_person || undefined,
      vendor_type: vendor.vendor_type,
      payment_terms: vendor.payment_terms,
      bank_name: vendor.bank_name || undefined,
      bank_account: vendor.bank_account || undefined,
      bank_ifsc: vendor.bank_ifsc || undefined,
    } : {
      vendor_type: 'BOTH' as const,
      payment_terms: 30,
      country: 'India',
    },
  });

  const handleFormSubmit = (data: VendorCreate) => {
    // Ensure country is set and handle optional fields
    const submitData: VendorCreate = {
      ...data,
      country: data.country || 'India',
      // Convert empty strings to undefined for optional fields
      gstin: data.gstin?.trim() || undefined,
      contact_person: data.contact_person?.trim() || undefined,
      bank_name: data.bank_name?.trim() || undefined,
      bank_account: data.bank_account?.trim() || undefined,
      bank_ifsc: data.bank_ifsc?.trim() || undefined,
      code: data.code?.trim() || undefined,
    };
    onSubmit(submitData);
  };

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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
              <Input {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-sm mt-1">Required</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <Input {...register('contact_person')} placeholder="Enter contact person name" />
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
              <Input
                {...register('pan', {
                  required: 'PAN is required',
                  pattern: {
                    value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                    message: 'Invalid PAN format',
                  },
                })}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              {errors.pan && <p className="text-red-500 text-sm mt-1">{errors.pan.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <Input
                {...register('gstin', {
                  pattern: {
                    value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                    message: 'Invalid GSTIN format',
                  },
                })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
              {errors.gstin && <p className="text-red-500 text-sm mt-1">{errors.gstin.message}</p>}
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
              <Select
                {...register('state', {
                  required: 'State is required',
                  onChange: (e) => {
                    const selectedState = INDIAN_STATES.find(s => s.name === e.target.value);
                    if (selectedState) {
                      setValue('state_code', selectedState.code, { shouldValidate: true });
                    }
                  },
                })}
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </Select>
              {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State Code *</label>
              <Input
                {...register('state_code', {
                  required: 'State code is required',
                  pattern: {
                    value: /^\d{2}$/,
                    message: 'State code must be exactly 2 digits',
                  },
                })}
                placeholder="Enter state code"
                maxLength={2}
              />
              {errors.state_code && <p className="text-red-500 text-sm mt-1">{errors.state_code.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
              <Input
                {...register('pincode', {
                  required: 'Pincode is required',
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: 'Invalid pincode',
                  },
                })}
                placeholder="Enter pincode"
                maxLength={6}
              />
              {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>}
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
