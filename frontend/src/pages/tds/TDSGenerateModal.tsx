import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Upload } from 'lucide-react';
import { tdsApi } from '../../services/api';
import type { TDSType, PendingTDSTransaction, TDSChallanCreate, TDSChallanEntryCreate } from '../../types';

interface TDSGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  financialYear: string;
  month: number;
  tdsType: TDSType;
  branchId?: number;
  onSuccess: () => void;
}

const MONTH_NAMES: Record<number, string> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
};

function getQuarterForMonth(month: number): number {
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function TDSGenerateModal({
  isOpen,
  onClose,
  financialYear,
  month,
  tdsType,
  branchId,
  onSuccess,
}: TDSGenerateModalProps) {
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [challanNumber, setChallanNumber] = useState('');
  const [bsrCode, setBsrCode] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionId, setTransactionId] = useState('');
  const [penalty, setPenalty] = useState<string>('0');
  const [interest, setInterest] = useState<string>('0');
  const [challanFile, setChallanFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch pending transactions
  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['tds-pending', financialYear, month, tdsType, branchId],
    queryFn: () => tdsApi.getPending({ financial_year: financialYear, month, tds_type: tdsType, branch_id: branchId }),
    enabled: isOpen,
  });

  // Select all by default
  useEffect(() => {
    if (pendingData?.transactions) {
      setSelectedTransactions(new Set(pendingData.transactions.map((t) => t.invoice_id)));
    }
  }, [pendingData]);

  // Create challan mutation
  const createChallanMutation = useMutation({
    mutationFn: async (data: TDSChallanCreate) => {
      const challan = await tdsApi.createChallan(data);
      // Upload file if provided
      if (challanFile) {
        await tdsApi.uploadChallanFile(challan.id, challanFile);
      }
      return challan;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && pendingData?.transactions) {
      setSelectedTransactions(new Set(pendingData.transactions.map((t) => t.invoice_id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleSelectTransaction = (invoiceId: number, checked: boolean) => {
    const newSet = new Set(selectedTransactions);
    if (checked) {
      newSet.add(invoiceId);
    } else {
      newSet.delete(invoiceId);
    }
    setSelectedTransactions(newSet);
  };

  const getSelectedTotals = () => {
    if (!pendingData?.transactions) return { tds: 0, base: 0 };
    return pendingData.transactions
      .filter((t) => selectedTransactions.has(t.invoice_id))
      .reduce((acc, t) => ({ tds: acc.tds + t.tds_amount, base: acc.base + t.base_amount }), { tds: 0, base: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedTransactions.size === 0) {
      setError('Please select at least one transaction');
      return;
    }

    if (!challanNumber.trim()) {
      setError('Challan number is required');
      return;
    }

    if (!bsrCode.trim()) {
      setError('BSR code is required');
      return;
    }

    const selectedTxns = pendingData!.transactions.filter((t) =>
      selectedTransactions.has(t.invoice_id)
    );

    const entries: TDSChallanEntryCreate[] = selectedTxns.map((t) => ({
      invoice_id: t.invoice_id,
      party_name: t.party_name,
      party_pan: t.party_pan || undefined,
      invoice_number: t.invoice_number,
      invoice_date: t.invoice_date,
      base_amount: t.base_amount,
      tds_rate: t.tds_rate,
      tds_section: t.tds_section,
      tds_amount: t.tds_amount,
      penalty: 0,
      interest: 0,
    }));

    const challanData: TDSChallanCreate = {
      challan_number: challanNumber,
      bsr_code: bsrCode,
      financial_year: financialYear,
      month,
      quarter: getQuarterForMonth(month),
      tds_type: tdsType,
      payment_date: paymentDate,
      transaction_id: transactionId || undefined,
      branch_id: branchId,
      penalty: parseFloat(penalty) || 0,
      interest: parseFloat(interest) || 0,
      entries,
    };

    createChallanMutation.mutate(challanData);
  };

  if (!isOpen) return null;

  const totals = getSelectedTotals();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-lg font-semibold text-gray-900">
              Generate TDS Challan - {MONTH_NAMES[month]} {financialYear}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Content */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Transactions Table */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Pending TDS Transactions ({pendingData?.count || 0})
                </h3>
                <div className="border rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                  {isLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                  ) : pendingData?.transactions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">No pending transactions</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.size === pendingData?.transactions.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Party Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Invoice Date
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Invoice #
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Base Amt
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            TDS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Section
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingData?.transactions.map((txn) => (
                          <tr key={txn.invoice_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedTransactions.has(txn.invoice_id)}
                                onChange={(e) => handleSelectTransaction(txn.invoice_id, e.target.checked)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">{txn.party_name}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{txn.invoice_date}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{txn.invoice_number}</td>
                            <td className="px-3 py-2 text-sm text-gray-700 text-right">
                              {formatCurrency(txn.base_amount)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(txn.tds_amount)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700">{txn.tds_section}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-sm font-medium text-gray-900">
                            Selected Total
                          </td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(totals.base)}
                          </td>
                          <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                            {formatCurrency(totals.tds)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Challan Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter challan number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      BSR Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bsrCode}
                      onChange={(e) => setBsrCode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="7 digit BSR code"
                      maxLength={7}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Transaction ID</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Bank transaction reference"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Penalty</label>
                    <input
                      type="number"
                      value={penalty}
                      onChange={(e) => setPenalty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Interest</label>
                    <input
                      type="number"
                      value={interest}
                      onChange={(e) => setInterest(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Upload Challan (PDF)</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">{challanFile ? challanFile.name : 'Choose File'}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setChallanFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {challanFile && (
                    <button
                      type="button"
                      onClick={() => setChallanFile(null)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">TDS Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(totals.tds)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Penalty:</span>
                    <span className="ml-2 font-medium">{formatCurrency(parseFloat(penalty) || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Interest:</span>
                    <span className="ml-2 font-medium">{formatCurrency(parseFloat(interest) || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Payable:</span>
                    <span className="ml-2 font-bold text-lg">
                      {formatCurrency(totals.tds + (parseFloat(penalty) || 0) + (parseFloat(interest) || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createChallanMutation.isPending || selectedTransactions.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createChallanMutation.isPending ? 'Creating...' : 'Create Challan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
