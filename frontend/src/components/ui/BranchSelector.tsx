import { useQuery } from '@tanstack/react-query';
import { branchApi } from '../../services/api';
import { Select } from './Select';
import type { Branch } from '../../types';

interface BranchSelectorProps {
  value: number | string;
  onChange: (branchId: number) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function BranchSelector({
  value,
  onChange,
  label = 'Branch',
  required = true,
  disabled = false,
  error,
  className,
}: BranchSelectorProps) {
  const { data: branches, isLoading, isError } = useQuery<Branch[]>({
    queryKey: ['branches', 'active'],
    queryFn: branchApi.getActive,
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = parseInt(e.target.value);
    if (!isNaN(branchId)) {
      onChange(branchId);
    }
  };

  if (isError) {
    return (
      <Select
        label={label}
        value=""
        onChange={() => {}}
        disabled
        error="Failed to load branches"
        className={className}
      >
        <option value="">Error loading branches</option>
      </Select>
    );
  }

  return (
    <Select
      label={label}
      value={value?.toString() || ''}
      onChange={handleChange}
      required={required}
      disabled={disabled || isLoading}
      error={error}
      className={className}
    >
      <option value="">
        {isLoading ? 'Loading branches...' : 'Select Branch'}
      </option>
      {branches?.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.branch_name} ({branch.branch_code}) - {branch.gstin}
        </option>
      ))}
    </Select>
  );
}
