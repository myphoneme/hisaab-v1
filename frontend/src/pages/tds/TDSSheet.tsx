import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Upload, ChevronRight } from 'lucide-react';
import { tdsApi, branchApi } from '../../services/api';
import type { TDSSheetData, TDSType, Branch } from '../../types';
import TDSGenerateModal from './TDSGenerateModal';
import TDSReturnModal from './TDSReturnModal';

const MONTHS = [
  { num: 4, name: 'April' },
  { num: 5, name: 'May' },
  { num: 6, name: 'June' },
  { num: 7, name: 'July' },
  { num: 8, name: 'August' },
  { num: 9, name: 'September' },
  { num: 10, name: 'October' },
  { num: 11, name: 'November' },
  { num: 12, name: 'December' },
  { num: 1, name: 'January' },
  { num: 2, name: 'February' },
  { num: 3, name: 'March' },
];

const QUARTER_END_MONTHS = [6, 9, 12, 3]; // June, Sep, Dec, March

function getQuarterForMonth(month: number): number {
  if (month >= 4 && month <= 6) return 1;
  if (month >= 7 && month <= 9) return 2;
  if (month >= 10 && month <= 12) return 3;
  return 4; // Jan, Feb, Mar
}

function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function getFinancialYearOptions(): string[] {
  const currentFY = getCurrentFinancialYear();
  const [startYear] = currentFY.split('-').map(Number);
  const options: string[] = [];
  for (let i = -2; i <= 1; i++) {
    const y = startYear + i;
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TDSSheet() {
  const [financialYear, setFinancialYear] = useState(getCurrentFinancialYear());
  const [tdsType, setTdsType] = useState<TDSType>('PAYABLE');
  const [branchId, setBranchId] = useState<number | undefined>();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateMonth, setGenerateMonth] = useState<number | null>(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnQuarter, setReturnQuarter] = useState<number | null>(null);

  const fyOptions = useMemo(() => getFinancialYearOptions(), []);

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const response = await branchApi.getActive();
      return response as Branch[];
    },
  });

  // Fetch TDS sheet data
  const { data: sheetData, isLoading, refetch } = useQuery({
    queryKey: ['tds-sheet', financialYear, tdsType, branchId],
    queryFn: () => tdsApi.getSheet({ financial_year: financialYear, tds_type: tdsType, branch_id: branchId }),
  });

  const handleGenerateClick = (month: number) => {
    setGenerateMonth(month);
    setGenerateModalOpen(true);
  };

  const handleReturnClick = (quarter: number) => {
    setReturnQuarter(quarter);
    setReturnModalOpen(true);
  };

  const handleChallanDownload = async (month: number) => {
    // Get challans for the month and download all files
    try {
      const challans = await tdsApi.listChallans({
        financial_year: financialYear,
        tds_type: tdsType,
        month,
        branch_id: branchId,
      });
      for (const challan of challans) {
        if (challan.challan_filename) {
          await tdsApi.downloadChallanFile(challan.id, challan.challan_filename);
        }
      }
    } catch (error) {
      console.error('Error downloading challans:', error);
    }
  };

  const ROW_TYPES = [
    { key: 'tds_payable', label: 'TDS Payable', isClickable: true },
    { key: 'tds_paid', label: 'TDS Paid', isClickable: false },
    { key: 'penalty', label: 'Penalty', isClickable: false },
    { key: 'interest', label: 'Interest', isClickable: false },
    { key: 'challan', label: 'Challan', isClickable: false, isFile: true },
    { key: 'tds_return', label: 'TDS Return', isClickable: false, isQuarterly: true },
    { key: 'tds_deducted', label: 'TDS Deducted', isClickable: false },
  ];

  const getCellValue = (rowKey: string, month: number) => {
    if (!sheetData?.month_data?.[month]) return null;
    const monthData = sheetData.month_data[month];

    switch (rowKey) {
      case 'tds_payable':
        return monthData.has_pending ? 'generate' : monthData.tds_payable;
      case 'tds_paid':
        return monthData.tds_paid;
      case 'penalty':
        return monthData.penalty;
      case 'interest':
        return monthData.interest;
      case 'challan':
        return monthData.has_challan_files ? 'download' : null;
      case 'tds_return':
        // Only show in quarter-end months
        if (!QUARTER_END_MONTHS.includes(month)) return null;
        const quarter = getQuarterForMonth(month);
        const quarterData = sheetData.quarter_data?.[quarter];
        if (!quarterData) return null;
        return quarterData.has_return_file ? 'download' : 'upload';
      case 'tds_deducted':
        return monthData.tds_deducted;
      default:
        return null;
    }
  };

  const getRowTotal = (rowKey: string) => {
    if (!sheetData?.totals) return null;
    switch (rowKey) {
      case 'tds_payable':
        return sheetData.totals.tds_payable;
      case 'tds_paid':
        return sheetData.totals.tds_paid;
      case 'penalty':
        return sheetData.totals.penalty;
      case 'interest':
        return sheetData.totals.interest;
      case 'tds_deducted':
        return sheetData.totals.tds_deducted;
      default:
        return null;
    }
  };

  const renderCell = (rowType: typeof ROW_TYPES[0], month: number) => {
    const value = getCellValue(rowType.key, month);

    if (value === 'generate') {
      return (
        <button
          onClick={() => handleGenerateClick(month)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
        >
          Generate
        </button>
      );
    }

    if (value === 'download' && rowType.key === 'challan') {
      return (
        <button
          onClick={() => handleChallanDownload(month)}
          className="text-green-600 hover:text-green-800"
          title="Download Challan"
        >
          <FileText className="h-4 w-4" />
        </button>
      );
    }

    if (rowType.isQuarterly && QUARTER_END_MONTHS.includes(month)) {
      const quarter = getQuarterForMonth(month);
      const quarterData = sheetData?.quarter_data?.[quarter];

      if (value === 'download') {
        return (
          <button
            onClick={() => handleReturnClick(quarter)}
            className="text-green-600 hover:text-green-800"
            title="View Return"
          >
            <Download className="h-4 w-4" />
          </button>
        );
      }
      if (value === 'upload') {
        return (
          <button
            onClick={() => handleReturnClick(quarter)}
            className="text-orange-600 hover:text-orange-800"
            title="Upload Return"
          >
            <Upload className="h-4 w-4" />
          </button>
        );
      }
    }

    if (typeof value === 'number') {
      return formatCurrency(value);
    }

    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Dashboard</span>
        <ChevronRight className="h-4 w-4" />
        <span>TDS</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Sheet</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">TDS Sheet</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Financial Year */}
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {fyOptions.map((fy) => (
              <option key={fy} value={fy}>
                FY {fy}
              </option>
            ))}
          </select>

          {/* Branch */}
          <select
            value={branchId || ''}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.branch_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TDS Type Toggle */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTdsType('PAYABLE')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            tdsType === 'PAYABLE'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          TDS Payable
        </button>
        <button
          onClick={() => setTdsType('RECEIVABLE')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            tdsType === 'RECEIVABLE'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          TDS Receivable
        </button>
      </div>

      {/* TDS Sheet Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  SN
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-12 bg-gray-50 z-10 min-w-[120px]">
                  Type
                </th>
                {MONTHS.map((m) => (
                  <th
                    key={m.num}
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]"
                  >
                    {m.name.substring(0, 3)}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] bg-gray-100">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ROW_TYPES.map((rowType, index) => (
                <tr key={rowType.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-inherit z-10">
                    {index + 1}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-12 bg-inherit z-10">
                    {rowType.label}
                  </td>
                  {MONTHS.map((m) => (
                    <td
                      key={m.num}
                      className="px-3 py-3 whitespace-nowrap text-sm text-right text-gray-700"
                    >
                      {renderCell(rowType, m.num)}
                    </td>
                  ))}
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 bg-gray-100">
                    {rowType.key !== 'challan' && rowType.key !== 'tds_return'
                      ? formatCurrency(getRowTotal(rowType.key) || 0)
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Modal */}
      {generateModalOpen && generateMonth !== null && (
        <TDSGenerateModal
          isOpen={generateModalOpen}
          onClose={() => {
            setGenerateModalOpen(false);
            setGenerateMonth(null);
          }}
          financialYear={financialYear}
          month={generateMonth}
          tdsType={tdsType}
          branchId={branchId}
          onSuccess={() => {
            refetch();
            setGenerateModalOpen(false);
            setGenerateMonth(null);
          }}
        />
      )}

      {/* Return Modal */}
      {returnModalOpen && returnQuarter !== null && (
        <TDSReturnModal
          isOpen={returnModalOpen}
          onClose={() => {
            setReturnModalOpen(false);
            setReturnQuarter(null);
          }}
          financialYear={financialYear}
          quarter={returnQuarter}
          tdsType={tdsType}
          branchId={branchId}
          onSuccess={() => {
            refetch();
            setReturnModalOpen(false);
            setReturnQuarter(null);
          }}
        />
      )}
    </div>
  );
}
