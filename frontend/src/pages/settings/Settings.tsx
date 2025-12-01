import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { settingsApi } from '../../services/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { CompanySettings, CompanySettingsUpdate } from '../../types';

// Helper function to format error messages from API responses
function formatErrorMessage(error: any): string {
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;

    // If detail is an array (FastAPI validation errors)
    if (Array.isArray(detail)) {
      return detail.map((err: any) => {
        const field = err.loc ? err.loc.join(' > ') : 'field';
        return `${field}: ${err.msg}`;
      }).join(', ');
    }

    // If detail is a string
    if (typeof detail === 'string') {
      return detail;
    }

    // If detail is an object, try to stringify it
    return JSON.stringify(detail);
  }

  return error.message || 'An error occurred';
}

export function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'company' | 'tax' | 'bank' | 'preferences'>('company');

  const { data: settings, isLoading, error, isError } = useQuery<CompanySettings>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get() as Promise<CompanySettings>,
    retry: false,
  });

  const [formData, setFormData] = useState<Partial<CompanySettings>>({});

  const updateMutation = useMutation({
    mutationFn: (data: CompanySettingsUpdate) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings updated successfully!');
    },
    onError: (error: any) => {
      console.error('Update settings error:', error);
      const errorMessage = formatErrorMessage(error);
      toast.error(errorMessage);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CompanySettings>) => settingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings created successfully!');
    },
    onError: (error: any) => {
      console.error('Create settings error:', error);
      const errorMessage = formatErrorMessage(error);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
      // Filter out null values to match CompanySettingsUpdate type
      const updateData: CompanySettingsUpdate = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== null)
      ) as CompanySettingsUpdate;
      updateMutation.mutate(updateData);
    } else {
      // When creating settings, ensure all required fields are present
      const createData = {
        company_name: formData.company_name || '',
        pan: formData.pan || '',
        address: formData.address || '',
        city: formData.city || '',
        state: formData.state || '',
        state_code: formData.state_code || '',
        pincode: formData.pincode || '',
        email: formData.email || '',
        phone: formData.phone || '',
        // Optional fields
        company_logo: formData.company_logo,
        gstin: formData.gstin,
        tan: formData.tan,
        cin: formData.cin,
        country: formData.country || 'India',
        website: formData.website,
        bank_name: formData.bank_name,
        bank_account_number: formData.bank_account_number,
        bank_ifsc: formData.bank_ifsc,
        bank_branch: formData.bank_branch,
        bank_account_type: formData.bank_account_type,
        financial_year_start_month: formData.financial_year_start_month || 4,
        default_currency: formData.default_currency || 'INR',
        default_gst_rate: formData.default_gst_rate || 18,
        enable_tds: formData.enable_tds !== undefined ? formData.enable_tds : true,
        enable_tcs: formData.enable_tcs || false,
        invoice_prefix: formData.invoice_prefix || 'INV',
        invoice_terms: formData.invoice_terms,
        invoice_notes: formData.invoice_notes,
        enable_multi_currency: formData.enable_multi_currency || false,
        enable_inventory: formData.enable_inventory || false,
      };
      createMutation.mutate(createData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  // Check if error is 404 (settings not found) - this is okay, user can create new settings
  const is404Error = (error as any)?.response?.status === 404;

  // Show error only if it's not a 404 (which means settings don't exist yet)
  if (isError && !is404Error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading settings</p>
          <p className="text-gray-500 text-sm">{formatErrorMessage(error)}</p>
        </div>
      </div>
    );
  }

  const currentData = { ...settings, ...formData };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-500 mt-1">
            {!settings && is404Error
              ? 'Create your company profile and preferences'
              : 'Manage your company profile and preferences'}
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'company', label: 'Company Info' },
            { id: 'tax', label: 'Tax Details' },
            { id: 'bank', label: 'Bank Details' },
            { id: 'preferences', label: 'Preferences' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-6">
            {activeTab === 'company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <Input
                    value={currentData.company_name || ''}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    value={currentData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <Input
                    value={currentData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <Input
                    value={currentData.state || ''}
                    onChange={(e) => handleChange('state', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State Code *
                  </label>
                  <Input
                    value={currentData.state_code || ''}
                    onChange={(e) => handleChange('state_code', e.target.value)}
                    maxLength={2}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                  <Input
                    value={currentData.pincode || ''}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <Input
                    type="email"
                    value={currentData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <Input
                    value={currentData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <Input
                    value={currentData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                  />
                </div>
              </div>
            )}

            {activeTab === 'tax' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <Input
                    value={currentData.gstin || ''}
                    onChange={(e) => handleChange('gstin', e.target.value)}
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN *</label>
                  <Input
                    value={currentData.pan || ''}
                    onChange={(e) => handleChange('pan', e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TAN</label>
                  <Input
                    value={currentData.tan || ''}
                    onChange={(e) => handleChange('tan', e.target.value)}
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                  <Input
                    value={currentData.cin || ''}
                    onChange={(e) => handleChange('cin', e.target.value)}
                    maxLength={21}
                  />
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <Input
                    value={currentData.bank_name || ''}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    value={currentData.bank_account_number || ''}
                    onChange={(e) => handleChange('bank_account_number', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <Input
                    value={currentData.bank_ifsc || ''}
                    onChange={(e) => handleChange('bank_ifsc', e.target.value)}
                    maxLength={11}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <Input
                    value={currentData.bank_branch || ''}
                    onChange={(e) => handleChange('bank_branch', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Type
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={currentData.bank_account_type || ''}
                    onChange={(e) => handleChange('bank_account_type', e.target.value)}
                  >
                    <option value="">Select Type</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="CURRENT">Current</option>
                    <option value="OD">Overdraft</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default GST Rate (%)
                  </label>
                  <Input
                    type="number"
                    value={currentData.default_gst_rate || 18}
                    onChange={(e) => handleChange('default_gst_rate', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Prefix
                  </label>
                  <Input
                    value={currentData.invoice_prefix || 'INV'}
                    onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_tds"
                    checked={currentData.enable_tds !== false}
                    onChange={(e) => handleChange('enable_tds', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="enable_tds" className="text-sm font-medium text-gray-700">
                    Enable TDS
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enable_tcs"
                    checked={currentData.enable_tcs === true}
                    onChange={(e) => handleChange('enable_tcs', e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="enable_tcs" className="text-sm font-medium text-gray-700">
                    Enable TCS
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Terms & Conditions
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={4}
                    value={currentData.invoice_terms || ''}
                    onChange={(e) => handleChange('invoice_terms', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Notes
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    value={currentData.invoice_notes || ''}
                    onChange={(e) => handleChange('invoice_notes', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending || createMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {settings ? 'Update Settings' : 'Create Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
