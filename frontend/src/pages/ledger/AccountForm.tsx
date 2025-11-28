import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { ChartOfAccount, ChartOfAccountCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ledgerApi } from '../../services/api';

interface AccountFormProps {
  account?: ChartOfAccount | null;
  onSubmit: (data: ChartOfAccountCreate) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'LIABILITY', label: 'Liability' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'EXPENSE', label: 'Expense' },
];

export function AccountForm({ account, onSubmit, onClose, isLoading }: AccountFormProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ChartOfAccountCreate>({
    defaultValues: account ? {
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      account_group: account.account_group,
      parent_id: account.parent_id || undefined,
      description: account.description || undefined,
      is_active: account.is_active,
    } : {
      is_active: true,
    },
  });

  // Fetch all accounts for parent dropdown
  const { data: accountsData } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await ledgerApi.getAccounts();
      return response.items || [];
    },
  });

  const accounts = accountsData as ChartOfAccount[] | undefined;
  const selectedAccountType = watch('account_type');

  // Filter parent accounts by same type
  const parentAccounts = accounts?.filter(acc =>
    acc.account_type === selectedAccountType &&
    acc.id !== account?.id // Exclude current account when editing
  );

  const handleFormSubmit = (data: ChartOfAccountCreate) => {
    // Clean up optional fields
    const submitData: ChartOfAccountCreate = {
      ...data,
      code: data.code.trim(),
      name: data.name.trim(),
      account_group: data.account_group.trim(),
      description: data.description?.trim() || undefined,
      parent_id: data.parent_id ? Number(data.parent_id) : undefined,
      is_active: data.is_active !== false,
    };
    console.log('Submitting account data:', submitData);
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {account ? 'Edit Account' : 'Add New Account'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Code *</label>
              <Input
                {...register('code', {
                  required: 'Account code is required',
                  maxLength: {
                    value: 20,
                    message: 'Code must be max 20 characters',
                  },
                })}
                placeholder="e.g., 1000, ACC-001"
              />
              {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
              <Select {...register('account_type', { required: 'Account type is required' })}>
                <option value="">Select Type</option>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              {errors.account_type && <p className="text-red-500 text-sm mt-1">{errors.account_type.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <Input
                {...register('name', {
                  required: 'Account name is required',
                  maxLength: {
                    value: 255,
                    message: 'Name must be max 255 characters',
                  },
                })}
                placeholder="Enter account name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Group *</label>
              <Input
                {...register('account_group', { required: 'Account group is required' })}
                placeholder="e.g., Current Assets, Fixed Assets"
              />
              {errors.account_group && <p className="text-red-500 text-sm mt-1">{errors.account_group.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
              <Select {...register('parent_id')}>
                <option value="">None (Top Level)</option>
                {parentAccounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedAccountType ? `Showing ${selectedAccountType} accounts` : 'Select account type first'}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                {...register('description')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Optional description for this account"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('is_active')}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Inactive accounts cannot be used in transactions</p>
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
