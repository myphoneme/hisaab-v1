import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, BookOpen, Database, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ledgerApi } from '../../services/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { ChartOfAccount, TrialBalance, ChartOfAccountCreate, LedgerStatement } from '../../types';
import { AccountForm } from './AccountForm';

export function Ledger() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ledger' | 'accounts' | 'trial-balance'>('ledger');
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

  // Ledger view state
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [fromDate, setFromDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0]);

  // Fetch all accounts for dropdown
  const { data: allAccountsData } = useQuery({
    queryKey: ['all-accounts'],
    queryFn: async () => {
      const response = await ledgerApi.getAccounts({ page_size: 100 });
      return response.items || [];
    },
  });
  const allAccounts = allAccountsData as ChartOfAccount[] | undefined;

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const response = await ledgerApi.getAccounts();
      return response.items || [];
    },
    enabled: activeTab === 'accounts',
  });

  // Ledger statement query
  const { data: ledgerStatement, isLoading: ledgerLoading } = useQuery<LedgerStatement>({
    queryKey: ['ledger-statement', selectedAccountId, fromDate, toDate],
    queryFn: () => ledgerApi.getStatement(selectedAccountId!, { from_date: fromDate, to_date: toDate }),
    enabled: activeTab === 'ledger' && selectedAccountId !== null,
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

  // Post all unposted transactions mutation
  const postAllMutation = useMutation({
    mutationFn: () => ledgerApi.postAllUnposted(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ledger-statement'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      const message = `Posted ${data.invoices_posted} invoices and ${data.payments_posted} payments to ledger`;
      toast.success(message);
      if (data.errors && data.errors.length > 0) {
        toast.warning(`${data.errors.length} errors occurred`);
        console.error('Posting errors:', data.errors);
      }
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || 'Failed to post transactions';
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
            onClick={() => postAllMutation.mutate()}
            disabled={postAllMutation.isPending}
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
          >
            <Upload className="h-4 w-4 mr-2" />
            {postAllMutation.isPending ? 'Posting...' : 'Post All Unposted'}
          </Button>
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
            onClick={() => setActiveTab('ledger')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ledger'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ledger
          </button>
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

      {/* Ledger View */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Account</option>
                    {allAccounts?.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!selectedAccountId ? (
                <p className="text-center text-gray-500 py-8">Select an account to view ledger</p>
              ) : ledgerLoading ? (
                <p className="text-center text-gray-500 py-8">Loading ledger...</p>
              ) : ledgerStatement ? (
                <div className="overflow-x-auto">
                  {/* Account Info */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg">{ledgerStatement.account_code} - {ledgerStatement.account_name}</h3>
                    <p className="text-sm text-gray-600">Type: {ledgerStatement.account_type}</p>
                  </div>

                  {/* Ledger Table */}
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Voucher</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Narration</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Debit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Credit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance Row */}
                      {(() => {
                        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(ledgerStatement.account_type);
                        const openingBal = Number(ledgerStatement.opening_balance) || 0;
                        return (
                          <tr className="bg-blue-50 font-medium">
                            <td className="px-4 py-2 text-sm">{formatDate(fromDate)}</td>
                            <td className="px-4 py-2 text-sm" colSpan={2}>Opening Balance</td>
                            <td className="px-4 py-2 text-sm text-right">-</td>
                            <td className="px-4 py-2 text-sm text-right">-</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold">
                              {formatCurrency(Math.abs(openingBal))}
                              {isDebitNormal
                                ? (openingBal >= 0 ? ' Dr' : ' Cr')
                                : (openingBal >= 0 ? ' Cr' : ' Dr')
                              }
                            </td>
                          </tr>
                        );
                      })()}

                      {/* Transaction Rows */}
                      {(() => {
                        let runningBalance = Number(ledgerStatement.opening_balance) || 0;
                        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(ledgerStatement.account_type);

                        return ledgerStatement.entries.map((entry, index) => {
                          const debit = Number(entry.debit) || 0;
                          const credit = Number(entry.credit) || 0;

                          // For ASSET/EXPENSE: debit increases, credit decreases
                          // For LIABILITY/REVENUE/EQUITY: credit increases, debit decreases
                          if (isDebitNormal) {
                            runningBalance = runningBalance + debit - credit;
                          } else {
                            runningBalance = runningBalance + credit - debit;
                          }

                          return (
                            <tr key={entry.id || index} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm">{formatDate(entry.entry_date)}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className="font-medium">{entry.voucher_number}</span>
                                <span className="text-xs text-gray-500 ml-2">({entry.reference_type})</span>
                              </td>
                              <td className="px-4 py-2 text-sm">{entry.narration || '-'}</td>
                              <td className="px-4 py-2 text-sm text-right">
                                {debit > 0 ? formatCurrency(debit) : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-right">
                                {credit > 0 ? formatCurrency(credit) : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-medium">
                                {formatCurrency(Math.abs(runningBalance))}
                                {isDebitNormal
                                  ? (runningBalance >= 0 ? ' Dr' : ' Cr')
                                  : (runningBalance >= 0 ? ' Cr' : ' Dr')
                                }
                              </td>
                            </tr>
                          );
                        });
                      })()}

                      {/* Closing Balance Row */}
                      {(() => {
                        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(ledgerStatement.account_type);
                        const closingBal = Number(ledgerStatement.closing_balance) || 0;
                        const totalDebit = Number(ledgerStatement.total_debit) || 0;
                        const totalCredit = Number(ledgerStatement.total_credit) || 0;
                        return (
                          <tr className="bg-green-50 font-bold">
                            <td className="px-4 py-3 text-sm">{formatDate(toDate)}</td>
                            <td className="px-4 py-3 text-sm" colSpan={2}>Closing Balance</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalDebit)}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalCredit)}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              {formatCurrency(Math.abs(closingBal))}
                              {isDebitNormal
                                ? (closingBal >= 0 ? ' Dr' : ' Cr')
                                : (closingBal >= 0 ? ' Cr' : ' Dr')
                              }
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>

                  {ledgerStatement.entries.length === 0 && (
                    <p className="text-center text-gray-500 py-4 mt-4">No transactions found for this period</p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
