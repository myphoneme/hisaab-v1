import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Branch, BranchCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

interface BranchFormProps {
  branch?: Branch | null;
  onSubmit: (data: BranchCreate) => void;
  onClose: () => void;
  isLoading?: boolean;
}

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

export function BranchForm({ branch, onSubmit, onClose, isLoading }: BranchFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BranchCreate>({
    defaultValues: branch ? {
      branch_name: branch.branch_name,
      branch_code: branch.branch_code,
      gstin: branch.gstin,
      state: branch.state,
      state_code: branch.state_code,
      address: branch.address,
      city: branch.city,
      pincode: branch.pincode,
      email: branch.email || undefined,
      phone: branch.phone || undefined,
      is_head_office: branch.is_head_office,
    } : {
      is_head_office: false,
    },
  });

  const gstinValue = watch('gstin');
  const stateCodeValue = watch('state_code');

  const handleFormSubmit = (data: BranchCreate) => {
    // Ensure optional fields are properly handled
    const submitData: BranchCreate = {
      ...data,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
    };
    console.log('Submitting branch data:', submitData);
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {branch ? 'Edit Branch' : 'Add New Branch'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch Name *
              </label>
              <Input
                {...register('branch_name', { required: 'Branch name is required' })}
                placeholder="Enter branch name"
              />
              {errors.branch_name && (
                <p className="text-red-500 text-sm mt-1">{errors.branch_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch Code *
              </label>
              <Input
                {...register('branch_code', { required: 'Branch code is required' })}
                placeholder="Enter unique branch code"
              />
              {errors.branch_code && (
                <p className="text-red-500 text-sm mt-1">{errors.branch_code.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GSTIN *
              </label>
              <Input
                {...register('gstin', {
                  required: 'GSTIN is required',
                  pattern: {
                    value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                    message: 'Invalid GSTIN format (Format: 22AAAAA0000A1Z5)',
                  },
                  validate: (value) => {
                    if (stateCodeValue && value) {
                      const gstinStateCode = value.substring(0, 2);
                      if (gstinStateCode !== stateCodeValue) {
                        return `GSTIN state code (${gstinStateCode}) must match selected state code (${stateCodeValue})`;
                      }
                    }
                    return true;
                  },
                })}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
              {errors.gstin && (
                <p className="text-red-500 text-sm mt-1">{errors.gstin.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Format: State Code (2) + PAN (10) + Entity Number (1) + Z + Check Digit (1)
              </p>
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
                placeholder="Auto-filled from state"
                maxLength={2}
                readOnly
              />
              {errors.state_code && (
                <p className="text-red-500 text-sm mt-1">{errors.state_code.message}</p>
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
                Pincode *
              </label>
              <Input
                {...register('pincode', {
                  required: 'Pincode is required',
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: 'Invalid pincode (must be 6 digits)',
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
                Email
              </label>
              <Input
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder="branch@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <Input
                {...register('phone')}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('is_head_office')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  This is the head office
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : branch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
