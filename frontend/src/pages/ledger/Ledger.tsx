import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, BookOpen, Database } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ledgerApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';
import type { ChartOfAccount, TrialBalance, ChartOfAccountCreate } from '../../types';
import { AccountForm } from './AccountForm';

export function Ledger() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'accounts' | 'trial-balance'>('accounts');
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await ledgerApi.getAccounts();
      return response.items || [];
    },
    enabled: activeTab === 'accounts',
  });

  const { data: trialBalance, isLoading: trialBalanceLoading } = useQuery<TrialBalance>({
    queryKey: ['trial-balance', asOnDate],
    queryFn: () => ledgerApi.getTrialBalance({ as_on_date: asOnDate }),
    enabled: activeTab === 'trial-balance',
  });

  const accounts = accountsData as ChartOfAccount[] | undefined;

  // Create/Update mutation
  const createAccountMutation = useMutation({
    mutationFn: (data: ChartOfAccountCreate) =>
      selectedAccount
        ? ledgerApi.updateAccount(selectedAccount.id, data)
        : ledgerApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success(selectedAccount ? 'Account updated successfully!' : 'Account created successfully!');
      setShowAccountForm(false);
      setSelectedAccount(null);
    },
    onError: (error: any) => {
      console.error('Account mutation error:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save account';
      toast.error(errorMessage);
    },
  });

  // Seed accounts mutation
  const seedAccountsMutation = useMutation({
    mutationFn: () => ledgerApi.seedAccounts(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to seed accounts';
      toast.error(errorMessage);
    },
  });

  // Group accounts by type
  const groupedAccounts = accounts?.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {} as Record<string, ChartOfAccount[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ledger & Accounts</h1>
          <p className="text-gray-500 mt-1">Chart of accounts and trial balance</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => seedAccountsMutation.mutate()}
            disabled={seedAccountsMutation.isPending}
          >
            <Database className="h-4 w-4 mr-2" />
            {seedAccountsMutation.isPending ? 'Seeding...' : 'Seed Default Accounts'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedAccount(null);
              setShowAccountForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'accounts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Chart of Accounts
          </button>
          <button
            onClick={() => setActiveTab('trial-balance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trial-balance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Trial Balance
          </button>
        </nav>
      </div>

      {/* Chart of Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {groupedAccounts && Object.entries(groupedAccounts).map(([type, accts]) => (
            <Card key={type}>
              <CardHeader>
                <h3 className="text-lg font-semibold">{type}</h3>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Group</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accts.map((account) => (
                        <tr key={account.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium">{account.code}</td>
                          <td className="px-4 py-2 text-sm">{account.name}</td>
                          <td className="px-4 py-2 text-sm">{account.account_group}</td>
                          <td className="px-4 py-2 text-sm text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!groupedAccounts || Object.keys(groupedAccounts).length === 0) && !accountsLoading && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No accounts found. Create your chart of accounts to get started.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Trial Balance */}
      {activeTab === 'trial-balance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Trial Balance</h3>
                <input
                  type="date"
                  value={asOnDate}
                  onChange={(e) => setAsOnDate(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {trialBalance ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Account Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Debit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialBalance.accounts?.map((account, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2 text-sm">{account.account_code}</td>
                          <td className="px-4 py-2 text-sm">{account.account_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{account.account_type}</td>
                          <td className="px-4 py-2 text-sm text-right">
                            {account.debit > 0 ? formatCurrency(account.debit) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            {account.credit > 0 ? formatCurrency(account.credit) : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-3" colSpan={3}>Total</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(trialBalance.total_debit)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(trialBalance.total_credit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : trialBalanceLoading ? (
                <p className="text-center text-gray-500 py-8">Loading trial balance...</p>
              ) : (
                <p className="text-center text-gray-500 py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Account Form Modal */}
      {showAccountForm && (
        <AccountForm
          account={selectedAccount}
          onSubmit={(data) => createAccountMutation.mutate(data)}
          onClose={() => {
            setShowAccountForm(false);
            setSelectedAccount(null);
          }}
          isLoading={createAccountMutation.isPending}
        />
      )}
    </div>
  );
}
