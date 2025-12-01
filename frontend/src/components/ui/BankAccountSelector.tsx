import { useQuery } from '@tanstack/react-query';
import { bankAccountApi } from '../../services/api';
import { Select } from './Select';
import type { BankAccount, PaginatedResponse } from '../../types';

interface BankAccountSelectorProps {
  branchId: number | null;
  value: number | string | undefined | null;
  onChange: (accountId: number) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function BankAccountSelector({
  branchId,
  value,
  onChange,
  label = 'Bank Account',
  required = true,
  disabled = false,
  error,
  className,
}: BankAccountSelectorProps) {
  const { data: accountsData, isLoading, isError } = useQuery<PaginatedResponse<BankAccount>>({
    queryKey: ['bank-accounts', branchId],
    queryFn: () => bankAccountApi.getAll({ branch_id: branchId, is_active: true, page_size: 100 }),
    enabled: branchId !== null && branchId !== undefined,
  });

  const accounts = accountsData?.items || [];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const accountId = parseInt(e.target.value);
    if (!isNaN(accountId)) {
      onChange(accountId);
    }
  };

  if (!branchId) {
    return (
      <Select
        label={label}
        value=""
        onChange={() => {}}
        disabled
        error="Please select a branch first"
        className={className}
      >
        <option value="">Select branch first</option>
      </Select>
    );
  }

  if (isError) {
    return (
      <Select
        label={label}
        value=""
        onChange={() => {}}
        disabled
        error="Failed to load bank accounts"
        className={className}
      >
        <option value="">Error loading accounts</option>
      </Select>
    );
  }

  // Convert value to string for comparison, handle null/undefined/0 as empty
  const selectValue = value && value !== 0 ? value.toString() : '';

  return (
    <Select
      label={label}
      value={selectValue}
      onChange={handleChange}
      required={required}
      disabled={disabled || isLoading}
      error={error}
      className={className}
    >
      <option value="">
        {isLoading ? 'Loading accounts...' : 'Select Bank Account'}
      </option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id.toString()}>
          {account.account_name} - {account.bank_name} (****
          {account.account_number.slice(-4)})
          {account.is_default && ' (Default)'}
        </option>
      ))}
    </Select>
  );
}
