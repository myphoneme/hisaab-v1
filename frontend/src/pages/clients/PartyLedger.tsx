import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Download, FileSpreadsheet, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { reportsApi, type PartyLedgerResponse } from '../../services/api';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { exportToCSV, partyLedgerExportColumns } from '../../lib/export';

interface PartyLedgerProps {
  partyType: 'client' | 'vendor';
  partyId: number;
  partyName: string;
  onClose: () => void;
}

// Get current financial year dates
function getFinancialYearDates() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Financial year starts in April
  const fyStartYear = currentMonth >= 4 ? currentYear : currentYear - 1;
  const fyEndYear = fyStartYear + 1;

  return {
    from: `${fyStartYear}-04-01`,
    to: `${fyEndYear}-03-31`,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Math.abs(value));
}

function formatBalance(value: number): string {
  const formatted = formatCurrency(value);
  return value >= 0 ? `${formatted} Dr` : `${formatted.replace('-', '')} Cr`;
}

export function PartyLedger({ partyType, partyId, partyName, onClose }: PartyLedgerProps) {
  const fyDates = getFinancialYearDates();
  const [dateRange, setDateRange] = useState({
    from: fyDates.from,
    to: fyDates.to,
  });
  const [appliedDateRange, setAppliedDateRange] = useState(dateRange);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const { data: ledgerData, isLoading, error } = useQuery<PartyLedgerResponse>({
    queryKey: ['partyLedger', partyType, partyId, appliedDateRange],
    queryFn: () =>
      reportsApi.getPartyLedger(partyType, partyId, {
        from_date: appliedDateRange.from,
        to_date: appliedDateRange.to,
      }),
  });

  const handleFilter = () => {
    setAppliedDateRange(dateRange);
  };

  const handleExportExcel = () => {
    if (!ledgerData || ledgerData.transactions.length === 0) {
      toast.error('No data to export');
      return;
    }

    const partyNameSafe = partyName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = `Ledger_${partyNameSafe}_${appliedDateRange.from}_${appliedDateRange.to}`;
    exportToCSV(ledgerData.transactions, partyLedgerExportColumns, filename);
    toast.success('Excel file downloaded');
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const blob = await reportsApi.downloadPartyLedgerPDF(partyType, partyId, {
        from_date: appliedDateRange.from,
        to_date: appliedDateRange.to,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const partyNameSafe = partyName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      link.href = url;
      link.download = `Ledger_${partyNameSafe}_${appliedDateRange.from}_${appliedDateRange.to}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const partyLabel = partyType === 'client' ? 'Customer' : 'Vendor';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        <CardHeader className="border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {partyLabel} Ledger: {partyName}
              </h2>
              {ledgerData?.party && (
                <p className="text-sm text-gray-500 mt-1">
                  {ledgerData.party.gstin && `GSTIN: ${ledgerData.party.gstin} | `}
                  {ledgerData.party.address}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4 print:hidden">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                className="w-40"
              />
            </div>
            <Button onClick={handleFilter} variant="secondary">
              Apply Filter
            </Button>
            <div className="flex-1" />
            <Button
              onClick={handleDownloadPDF}
              variant="secondary"
              disabled={isDownloadingPDF || !ledgerData}
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloadingPDF ? 'Downloading...' : 'PDF'}
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="secondary"
              disabled={!ledgerData}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading ledger...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Failed to load ledger. Please try again.
            </div>
          ) : ledgerData ? (
            <div className="space-y-4">
              {/* Opening Balance */}
              <div className="bg-gray-100 px-4 py-2 rounded-md">
                <span className="font-medium">
                  Opening Balance (as on {new Date(appliedDateRange.from).toLocaleDateString('en-IN')}):
                </span>
                <span className="ml-2 font-bold">
                  {formatBalance(ledgerData.opening_balance)}
                </span>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Voucher No.</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase">Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase">Debit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase">Credit</th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ledgerData.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                          No transactions found for the selected period
                        </td>
                      </tr>
                    ) : (
                      ledgerData.transactions.map((txn, index) => (
                        <tr
                          key={`${txn.voucher_number}-${index}`}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {new Date(txn.date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                            {txn.voucher_number}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                txn.type === 'INVOICE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : txn.type === 'PAYMENT'
                                  ? 'bg-green-100 text-green-800'
                                  : txn.type === 'CREDIT_NOTE'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {txn.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate">
                            {txn.description}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {txn.debit > 0 ? formatCurrency(txn.debit) : ''}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-900">
                            {txn.credit > 0 ? formatCurrency(txn.credit) : ''}
                          </td>
                          <td className="px-3 py-2 text-sm text-right font-medium">
                            {formatBalance(txn.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-blue-50 font-bold">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-sm text-right">
                        Total:
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        {formatCurrency(ledgerData.total_debit)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        {formatCurrency(ledgerData.total_credit)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        {formatBalance(ledgerData.closing_balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Closing Balance */}
              <div className="bg-blue-100 px-4 py-2 rounded-md">
                <span className="font-medium">
                  Closing Balance (as on {new Date(appliedDateRange.to).toLocaleDateString('en-IN')}):
                </span>
                <span className="ml-2 font-bold text-blue-800">
                  {formatBalance(ledgerData.closing_balance)}
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
