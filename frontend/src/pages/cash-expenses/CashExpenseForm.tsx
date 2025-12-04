import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import type { CashExpense, CashExpenseCreate, ExpenseCategory, Project, Branch, BankAccount } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { expenseCategoryApi, projectApi, branchApi, bankAccountApi } from '../../services/api';

interface CashExpenseFormProps {
  expense: CashExpense | null;
  onSubmit: (data: CashExpenseCreate) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function CashExpenseForm({
  expense,
  onSubmit,
  onClose,
  isLoading,
}: CashExpenseFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CashExpenseCreate>({
    defaultValues: expense ? {
      transaction_date: expense.transaction_date,
      expense_category_id: expense.expense_category_id || undefined,
      bank_account_id: expense.bank_account_id,
      project_id: expense.project_id || undefined,
      branch_id: expense.branch_id || undefined,
      amount: expense.amount,
      transaction_type: expense.transaction_type,
      transaction_ref: expense.transaction_ref || '',
      description: expense.description || '',
    } : {
      transaction_date: today,
      transaction_type: 'DEBIT',
      amount: 0,
      transaction_ref: '',
    },
  });

  // Fetch expense categories
  const { data: categories } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories-active'],
    queryFn: () => expenseCategoryApi.getActive(),
  });

  // Fetch projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects-active'],
    queryFn: () => projectApi.getActive(),
  });

  // Fetch branches
  const { data: branches } = useQuery<Branch[]>({
    queryKey: ['branches-active'],
    queryFn: () => branchApi.getActive(),
  });

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery<BankAccount[]>({
    queryKey: ['bank-accounts-active'],
    queryFn: async () => {
      const response: any = await bankAccountApi.getAll({ is_active: true, page_size: 100 });
      return response?.items || [];
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {expense ? 'Edit Cash Expense' : 'Add Cash Expense'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Transaction Date */}
            <div>
              <Label htmlFor="transaction_date">Transaction Date *</Label>
              <Input
                id="transaction_date"
                type="date"
                {...register('transaction_date', { required: 'Date is required' })}
              />
              {errors.transaction_date && (
                <p className="mt-1 text-sm text-red-600">{errors.transaction_date.message}</p>
              )}
            </div>

            {/* Transaction Type */}
            <div>
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <select
                id="transaction_type"
                {...register('transaction_type', { required: 'Type is required' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DEBIT">Debit (Expense/Payment)</option>
                <option value="CREDIT">Credit (Income/Receipt)</option>
              </select>
              {errors.transaction_type && (
                <p className="mt-1 text-sm text-red-600">{errors.transaction_type.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', {
                  required: 'Amount is required',
                  valueAsNumber: true,
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Bank Account */}
            <div>
              <Label htmlFor="bank_account_id">Bank Account *</Label>
              <select
                id="bank_account_id"
                {...register('bank_account_id', {
                  required: 'Bank Account is required',
                  valueAsNumber: true
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Bank Account</option>
                {(bankAccounts || []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bank_name} - {account.account_name} ({account.account_number.slice(-4)})
                  </option>
                ))}
              </select>
              {errors.bank_account_id && (
                <p className="mt-1 text-sm text-red-600">{errors.bank_account_id.message}</p>
              )}
            </div>

            {/* Transaction Ref */}
            <div>
              <Label htmlFor="transaction_ref">Transaction Ref</Label>
              <Input
                id="transaction_ref"
                type="text"
                {...register('transaction_ref')}
                placeholder="UPI UTR, Bank Ref, Cheque No..."
                maxLength={100}
              />
            </div>

            {/* Expense Category */}
            <div>
              <Label htmlFor="expense_category_id">Expense Category</Label>
              <select
                id="expense_category_id"
                {...register('expense_category_id', { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {(categories || []).map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project */}
            <div>
              <Label htmlFor="project_id">Project</Label>
              <select
                id="project_id"
                {...register('project_id', { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Project</option>
                {(projects || []).map((prj) => (
                  <option key={prj.id} value={prj.id}>
                    {prj.code ? `${prj.code} - ` : ''}{prj.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div className="col-span-2">
              <Label htmlFor="branch_id">Branch</Label>
              <select
                id="branch_id"
                {...register('branch_id', { valueAsNumber: true })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Branch</option>
                {(branches || []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.branch_code} - {branch.branch_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                {...register('description')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter expense description..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : expense ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
