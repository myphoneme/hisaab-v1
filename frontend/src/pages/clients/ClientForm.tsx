import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Client, ClientCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (data: ClientCreate) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const CLIENT_TYPES = [
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
  { value: 'B2G', label: 'B2G (Government)' },
  { value: 'SEZ', label: 'SEZ' },
  { value: 'EXPORT', label: 'Export' },
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

export function ClientForm({ client, onSubmit, onClose, isLoading }: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ClientCreate>({
    defaultValues: client ? {
      name: client.name,
      gstin: client.gstin || undefined,
      pan: client.pan,
      address: client.address,
      city: client.city,
      state: client.state,
      state_code: client.state_code,
      pincode: client.pincode,
      country: 'India',
      email: client.email,
      phone: client.phone,
      contact_person: client.contact_person || undefined,
      client_type: client.client_type,
      credit_limit: client.credit_limit,
      payment_terms: client.payment_terms,
    } : {
      client_type: 'B2B' as const,
      credit_limit: 0,
      payment_terms: 30,
      country: 'India',
    },
  });

  const handleFormSubmit = (data: ClientCreate) => {
    // Ensure country is set and handle optional fields
    const submitData: ClientCreate = {
      ...data,
      country: data.country || 'India',
      // Convert empty strings to undefined for optional fields
      gstin: data.gstin?.trim() || undefined,
      contact_person: data.contact_person?.trim() || undefined,
      code: data.code?.trim() || undefined,
    };
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {client ? 'Edit Client' : 'Add New Client'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <Input
                {...register('name', { required: 'Client name is required' })}
                placeholder="Enter client name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <Input
                {...register('contact_person')}
                placeholder="Enter contact person name"
              />
              {errors.contact_person && (
                <p className="text-red-500 text-sm mt-1">{errors.contact_person.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Type *
              </label>
              <Select {...register('client_type', { required: true })}>
                {CLIENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <Input
                {...register('phone', { required: 'Phone is required' })}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN *
              </label>
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
              {errors.pan && (
                <p className="text-red-500 text-sm mt-1">{errors.pan.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GSTIN
              </label>
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
              {errors.gstin && (
                <p className="text-red-500 text-sm mt-1">{errors.gstin.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <Input
                {...register('address', { required: 'Address is required' })}
                placeholder="Enter complete address"
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <Input
                {...register('city', { required: 'City is required' })}
                placeholder="Enter city"
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <Select
                {...register('state', {
                  required: 'State is required',
                  onChange: (e) => {
                    const selectedState = INDIAN_STATES.find(s => s.name === e.target.value);
                    if (selectedState) {
                      // Use setValue to properly update react-hook-form state
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
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State Code *
              </label>
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
              {errors.state_code && (
                <p className="text-red-500 text-sm mt-1">{errors.state_code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode *
              </label>
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
              {errors.pincode && (
                <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Limit
              </label>
              <Input
                type="number"
                {...register('credit_limit', { valueAsNumber: true })}
                placeholder="Enter credit limit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms (days)
              </label>
              <Input
                type="number"
                {...register('payment_terms', { valueAsNumber: true })}
                placeholder="Enter payment terms in days"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
