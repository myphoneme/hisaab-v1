import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { ExpenseCategory, ExpenseCategoryCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';

interface ExpenseCategoryFormProps {
  category: ExpenseCategory | null;
  onSubmit: (data: ExpenseCategoryCreate) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function ExpenseCategoryForm({
  category,
  onSubmit,
  onClose,
  isLoading,
}: ExpenseCategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseCategoryCreate>({
    defaultValues: category ? {
      name: category.name,
      code: category.code || '',
      description: category.description || '',
      is_active: category.is_active,
    } : {
      name: '',
      code: '',
      description: '',
      is_active: true,
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {category ? 'Edit Expense Category' : 'Add Expense Category'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div>
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g., Office Supplies"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="code">Category Code</Label>
            <Input
              id="code"
              {...register('code')}
              placeholder="e.g., OFF-SUP"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register('description')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter category description..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="is_active" className="mb-0">Active</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
