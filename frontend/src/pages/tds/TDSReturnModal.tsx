import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { X, Upload, Download, FileSpreadsheet, Check } from 'lucide-react';
import { tdsApi } from '../../services/api';
import type { TDSType, TDSReturn, ReturnStatus } from '../../types';
import { exportToCSV } from '../../lib/export';

interface TDSReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  financialYear: string;
  quarter: number;
  tdsType: TDSType;
  branchId?: number;
  onSuccess: () => void;
}

const QUARTER_NAMES: Record<number, string> = {
  1: 'Q1 (Apr-Jun)',
  2: 'Q2 (Jul-Sep)',
  3: 'Q3 (Oct-Dec)',
  4: 'Q4 (Jan-Mar)',
};

const STATUS_LABELS: Record<ReturnStatus, string> = {
  DRAFT: 'Draft',
  FILED: 'Filed',
  REVISED: 'Revised',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function TDSReturnModal({
  isOpen,
  onClose,
  financialYear,
  quarter,
  tdsType,
  branchId,
  onSuccess,
}: TDSReturnModalProps) {
  const [returnFile, setReturnFile] = useState<File | null>(null);
  const [filedDate, setFiledDate] = useState(new Date().toISOString().split('T')[0]);
  const [ackNumber, setAckNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch return data
  const { data: returnData, isLoading: returnLoading, refetch: refetchReturn } = useQuery({
    queryKey: ['tds-return', financialYear, quarter, tdsType, branchId],
    queryFn: () => tdsApi.getReturn({ financial_year: financialYear, quarter, tds_type: tdsType, branch_id: branchId }),
    enabled: isOpen,
  });

  // Fetch export data
  const { data: exportData, isLoading: exportLoading } = useQuery({
    queryKey: ['tds-return-export', financialYear, quarter, tdsType, branchId],
    queryFn: () => tdsApi.exportReturn({ financial_year: financialYear, quarter, tds_type: tdsType, branch_id: branchId }),
    enabled: isOpen,
  });

  // Update return mutation
  const updateReturnMutation = useMutation({
    mutationFn: async (status: ReturnStatus) => {
      if (!returnData) throw new Error('Return data not loaded');
      const updated = await tdsApi.updateReturn(returnData.id, {
        status,
        filed_date: filedDate,
        acknowledgment_number: ackNumber || undefined,
      });
      // Upload file if provided
      if (returnFile) {
        await tdsApi.uploadReturnFile(returnData.id, returnFile);
      }
      return updated;
    },
    onSuccess: () => {
      refetchReturn();
      onSuccess();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleExportExcel = () => {
    if (!exportData?.entries) return;

    const columns = [
      { header: 'Vendor/Client Name', key: 'vendor_name' },
      { header: 'PAN', key: 'pan' },
      { header: 'Base Amount', key: 'base_amount' },
      { header: 'TDS', key: 'tds' },
      { header: 'Penalty', key: 'penalty' },
      { header: 'Interest', key: 'interest' },
      { header: 'TDS Payable', key: 'tds_payable' },
      { header: 'Payment Date', key: 'payment_date' },
      { header: 'Challan No', key: 'challan_no' },
      { header: 'BSR Code', key: 'bsr_code' },
      { header: 'Payment', key: 'payment' },
      { header: 'Invoice Date', key: 'invoice_date' },
      { header: 'Invoice Number', key: 'invoice_number' },
      { header: 'Section', key: 'section_name' },
      { header: 'TDS %', key: 'tds_percent' },
    ];

    const filename = `TDS_Return_${tdsType}_${financialYear}_Q${quarter}.csv`;
    exportToCSV(exportData.entries, columns, filename);
  };

  const handleDownloadReturn = async () => {
    if (!returnData?.return_filename) return;
    try {
      await tdsApi.downloadReturnFile(returnData.id, returnData.return_filename);
    } catch (error) {
      setError('Failed to download return file');
    }
  };

  const handleMarkAsFiled = () => {
    updateReturnMutation.mutate('FILED');
  };

  if (!isOpen) return null;

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
              TDS Return - {QUARTER_NAMES[quarter]} {financialYear}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Return Status */}
            {returnLoading ? (
              <div className="text-center text-gray-500 py-4">Loading...</div>
            ) : returnData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        returnData.status === 'FILED'
                          ? 'bg-green-100 text-green-800'
                          : returnData.status === 'REVISED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {STATUS_LABELS[returnData.status]}
                    </span>
                    {returnData.filed_date && (
                      <span className="text-sm text-gray-500">
                        Filed on: {returnData.filed_date}
                      </span>
                    )}
                    {returnData.acknowledgment_number && (
                      <span className="text-sm text-gray-500">
                        Ack #: {returnData.acknowledgment_number}
                      </span>
                    )}
                  </div>
                  {returnData.return_filename && (
                    <button
                      onClick={handleDownloadReturn}
                      className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:text-blue-800"
                    >
                      <Download className="h-4 w-4" />
                      Download Return
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Export Data Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Return Data ({exportData?.entries.length || 0} entries)
                </h3>
                <button
                  onClick={handleExportExcel}
                  disabled={!exportData?.entries.length}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export to Excel
                </button>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                {exportLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : exportData?.entries.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No data for this quarter</div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Vendor/Client
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          PAN
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Base Amt
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          TDS
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Penalty
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Interest
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Challan #
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Section
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {exportData?.entries.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">{entry.vendor_name}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{entry.pan || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-700 text-right">
                            {formatCurrency(entry.base_amount)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(entry.tds)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 text-right">
                            {formatCurrency(entry.penalty)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700 text-right">
                            {formatCurrency(entry.interest)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-700">{entry.challan_no || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-700">{entry.section_name}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-sm font-medium text-gray-900">
                          Total
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                          -
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(exportData?.total_tds || 0)}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(exportData?.total_penalty || 0)}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(exportData?.total_interest || 0)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </div>

            {/* File Return Section */}
            {returnData?.status !== 'FILED' && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Mark Return as Filed</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Filed Date</label>
                    <input
                      type="date"
                      value={filedDate}
                      onChange={(e) => setFiledDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Acknowledgment Number</label>
                    <input
                      type="text"
                      value={ackNumber}
                      onChange={(e) => setAckNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter ack number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Upload Return File</label>
                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm truncate">
                        {returnFile ? returnFile.name : 'Choose File'}
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.pdf"
                        onChange={(e) => setReturnFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            {returnData?.status !== 'FILED' && (
              <button
                type="button"
                onClick={handleMarkAsFiled}
                disabled={updateReturnMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {updateReturnMutation.isPending ? 'Saving...' : 'Mark as Filed'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
