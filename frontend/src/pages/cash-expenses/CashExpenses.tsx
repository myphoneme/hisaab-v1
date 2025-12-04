import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, Receipt, ArrowUpCircle, ArrowDownCircle, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { cashExpenseApi } from '../../services/api';
import type { CashExpense, CashExpenseCreate } from '../../types';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CashExpenseForm } from './CashExpenseForm';

export function CashExpenses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CashExpense | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery<CashExpense[]>({
    queryKey: ['cash-expenses', filterType],
    queryFn: async () => {
      const params: Record<string, unknown> = { page_size: 100 };
      if (filterType) params.transaction_type = filterType;
      const response: any = await cashExpenseApi.getAll(params);
      return response?.items || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CashExpenseCreate) => cashExpenseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-expenses'] });
      setShowForm(false);
      toast.success('Expense created successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to create expense';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashExpenseCreate> }) =>
      cashExpenseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-expenses'] });
      setShowForm(false);
      setEditingExpense(null);
      toast.success('Expense updated successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to update expense';
      toast.error(errorMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cashExpenseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-expenses'] });
      toast.success('Expense deleted successfully!');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to delete expense';
      toast.error(errorMessage);
    },
  });

  const filteredExpenses = (expenses || []).filter((exp) =>
    exp.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (exp.expense_category?.name && exp.expense_category.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (exp.project?.name && exp.project.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEdit = (expense: CashExpense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate totals
  const totalDebit = filteredExpenses.filter(e => e.transaction_type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = filteredExpenses.filter(e => e.transaction_type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Expenses</h1>
          <p className="text-gray-500 mt-1">Non-GST expenses without vendor/client</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Debit</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Credit</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net</p>
                <p className={`text-xl font-bold ${totalDebit - totalCredit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(totalDebit - totalCredit))} {totalDebit > totalCredit ? 'Dr' : 'Cr'}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="DEBIT">Debit Only</option>
                <option value="CREDIT">Credit Only</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading expenses...</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || filterType ? 'No expenses found matching your criteria' : 'No expenses yet. Add your first expense!'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction Ref
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.transaction_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-medium text-blue-600">
                          {expense.expense_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.expense_category?.name || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {expense.bank_account ? `${expense.bank_account.bank_name} - ${expense.bank_account.account_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {expense.transaction_ref || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {expense.project?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {expense.description || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          expense.transaction_type === 'DEBIT'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {expense.transaction_type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-right ${
                        expense.transaction_type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <CashExpenseForm
          expense={editingExpense}
          onSubmit={(data) => {
            if (editingExpense) {
              updateMutation.mutate({ id: editingExpense.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onClose={handleCloseForm}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}
