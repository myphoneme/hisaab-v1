import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { BankAccount, BankAccountCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { BranchSelector } from '../../components/ui/BranchSelector';

interface BankAccountFormProps {
  account?: BankAccount | null;
  onSubmit: (data: BankAccountCreate) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const ACCOUNT_TYPES = [
  { value: 'SAVINGS', label: 'Savings Account' },
  { value: 'CURRENT', label: 'Current Account' },
  { value: 'OVERDRAFT', label: 'Overdraft Account' },
  { value: 'CASH_CREDIT', label: 'Cash Credit Account' },
];

export function BankAccountForm({ account, onSubmit, onClose, isLoading }: BankAccountFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BankAccountCreate>({
    defaultValues: account ? {
      branch_id: account.branch_id,
      account_name: account.account_name,
      bank_name: account.bank_name,
      account_number: account.account_number,
      ifsc_code: account.ifsc_code,
      branch_name: account.branch_name || undefined,
      account_type: account.account_type,
      upi_id: account.upi_id || undefined,
      swift_code: account.swift_code || undefined,
      is_default: account.is_default,
    } : {
      account_type: 'CURRENT' as const,
      is_default: false,
    },
  });

  const branchIdValue = watch('branch_id');

  const handleFormSubmit = (data: BankAccountCreate) => {
    // Ensure optional fields are properly handled
    const submitData: BankAccountCreate = {
      ...data,
      branch_name: data.branch_name?.trim() || undefined,
      upi_id: data.upi_id?.trim() || undefined,
      swift_code: data.swift_code?.trim() || undefined,
    };
    console.log('Submitting bank account data:', submitData);
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {account ? 'Edit Bank Account' : 'Add New Bank Account'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <BranchSelector
                value={branchIdValue || ''}
                onChange={(branchId) => setValue('branch_id', branchId, { shouldValidate: true })}
                label="Branch *"
                required
                error={errors.branch_id?.message}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Name *
              </label>
              <Input
                {...register('account_name', { required: 'Account name is required' })}
                placeholder="Enter account name/title"
              />
              {errors.account_name && (
                <p className="text-red-500 text-sm mt-1">{errors.account_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name *
              </label>
              <Input
                {...register('bank_name', { required: 'Bank name is required' })}
                placeholder="Enter bank name"
              />
              {errors.bank_name && (
                <p className="text-red-500 text-sm mt-1">{errors.bank_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number *
              </label>
              <Input
                {...register('account_number', { required: 'Account number is required' })}
                placeholder="Enter account number"
              />
              {errors.account_number && (
                <p className="text-red-500 text-sm mt-1">{errors.account_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC Code *
              </label>
              <Input
                {...register('ifsc_code', {
                  required: 'IFSC code is required',
                  pattern: {
                    value: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                    message: 'Invalid IFSC code format (e.g., SBIN0001234)',
                  },
                })}
                placeholder="SBIN0001234"
                maxLength={11}
              />
              {errors.ifsc_code && (
                <p className="text-red-500 text-sm mt-1">{errors.ifsc_code.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Format: Bank Code (4) + 0 + Branch Code (6)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Branch
              </label>
              <Input
                {...register('branch_name')}
                placeholder="Enter bank branch name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type *
              </label>
              <Select {...register('account_type', { required: true })}>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UPI ID
              </label>
              <Input
                {...register('upi_id')}
                placeholder="your-upi@bank"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SWIFT Code
              </label>
              <Input
                {...register('swift_code', {
                  pattern: {
                    value: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
                    message: 'Invalid SWIFT code format',
                  },
                })}
                placeholder="SBININBBXXX"
                maxLength={11}
              />
              {errors.swift_code && (
                <p className="text-red-500 text-sm mt-1">{errors.swift_code.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                For international transactions
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('is_default')}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Set as default account for this branch
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
