import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Item, ItemCreate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';

const UNITS = ['NOS', 'KG', 'METER', 'LITER', 'BOX', 'PIECE', 'SET', 'HOUR', 'DAY', 'MONTH', 'YEAR'];

interface ItemFormProps {
  item: Item | null;
  onSubmit: (data: ItemCreate) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function ItemForm({ item, onSubmit, onClose, isLoading }: ItemFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ItemCreate & { is_active?: boolean }>({
    defaultValues: item
      ? {
          code: item.code,
          name: item.name,
          description: item.description || '',
          item_type: item.item_type,
          hsn_sac: item.hsn_sac || '',
          default_gst_rate: item.default_gst_rate,
          default_unit: item.default_unit,
          default_rate: item.default_rate || undefined,
          is_active: item.is_active,
        }
      : {
          code: '',
          name: '',
          description: '',
          item_type: 'SERVICES',
          hsn_sac: '',
          default_gst_rate: 18,
          default_unit: 'NOS',
          default_rate: undefined,
          is_active: true,
        },
  });

  const itemType = watch('item_type');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{item ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Item Code *</Label>
              <Input
                id="code"
                {...register('code', { required: 'Code is required' })}
                placeholder="e.g., ITEM-001"
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
            </div>

            <div>
              <Label htmlFor="item_type">Type *</Label>
              <select
                id="item_type"
                {...register('item_type', { required: 'Type is required' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="GOODS">Goods</option>
                <option value="SERVICES">Services</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g., Web Development Service"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              {...register('description')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Enter item description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hsn_sac">{itemType === 'GOODS' ? 'HSN Code' : 'SAC Code'}</Label>
              <Input
                id="hsn_sac"
                {...register('hsn_sac')}
                placeholder={itemType === 'GOODS' ? 'e.g., 8471' : 'e.g., 998311'}
                maxLength={8}
              />
            </div>

            <div>
              <Label htmlFor="default_gst_rate">GST Rate (%) *</Label>
              <select
                id="default_gst_rate"
                {...register('default_gst_rate', {
                  required: 'GST rate is required',
                  valueAsNumber: true,
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default_unit">Default Unit *</Label>
              <select
                id="default_unit"
                {...register('default_unit', { required: 'Unit is required' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="default_rate">Default Rate</Label>
              <Input
                id="default_rate"
                type="number"
                step="0.01"
                min="0"
                {...register('default_rate', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>

          {item && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                {...register('is_active')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="is_active" className="mb-0">
                Active
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : item ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
