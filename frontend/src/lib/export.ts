/**
 * Export utilities for CSV and Excel-compatible files
 */

interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: unknown) => string;
}

/**
 * Export data to CSV file
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn[],
  filename: string
): void {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Build CSV header
  const headers = columns.map(col => `"${col.header}"`).join(',');

  // Build CSV rows
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formattedValue = col.formatter ? col.formatter(value) : String(value ?? '');
      // Escape quotes and wrap in quotes
      return `"${formattedValue.replace(/"/g, '""')}"`;
    }).join(',');
  });

  // Combine header and rows
  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency for export (without symbol)
 */
export function formatCurrencyForExport(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

/**
 * Format date for export
 */
export function formatDateForExport(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN');
}

/**
 * Predefined column configurations for common exports
 */
export const invoiceExportColumns: ExportColumn[] = [
  { key: 'invoice_number', header: 'Invoice Number' },
  { key: 'invoice_date', header: 'Date', formatter: formatDateForExport },
  { key: 'client_name', header: 'Client Name' },
  { key: 'po_number', header: 'PO Number' },
  { key: 'subtotal', header: 'Subtotal', formatter: formatCurrencyForExport },
  { key: 'cgst_amount', header: 'CGST', formatter: formatCurrencyForExport },
  { key: 'sgst_amount', header: 'SGST', formatter: formatCurrencyForExport },
  { key: 'igst_amount', header: 'IGST', formatter: formatCurrencyForExport },
  { key: 'tds_amount', header: 'TDS', formatter: formatCurrencyForExport },
  { key: 'total_amount', header: 'Total Amount', formatter: formatCurrencyForExport },
  { key: 'amount_due', header: 'Amount Due', formatter: formatCurrencyForExport },
  { key: 'status', header: 'Status' },
];

export const paymentExportColumns: ExportColumn[] = [
  { key: 'payment_number', header: 'Payment Number' },
  { key: 'payment_date', header: 'Date', formatter: formatDateForExport },
  { key: 'invoice_number', header: 'Invoice Number' },
  { key: 'party_name', header: 'Party Name' },
  { key: 'payment_type', header: 'Type' },
  { key: 'payment_mode', header: 'Mode' },
  { key: 'amount', header: 'Amount', formatter: formatCurrencyForExport },
  { key: 'tds_amount', header: 'TDS Amount', formatter: formatCurrencyForExport },
  { key: 'reference_number', header: 'Reference' },
  { key: 'status', header: 'Status' },
];

export const ledgerEntryExportColumns: ExportColumn[] = [
  { key: 'entry_date', header: 'Date', formatter: formatDateForExport },
  { key: 'entry_number', header: 'Entry Number' },
  { key: 'account_code', header: 'Account Code' },
  { key: 'account_name', header: 'Account Name' },
  { key: 'description', header: 'Description' },
  { key: 'debit', header: 'Debit', formatter: formatCurrencyForExport },
  { key: 'credit', header: 'Credit', formatter: formatCurrencyForExport },
  { key: 'reference_type', header: 'Ref Type' },
  { key: 'reference_number', header: 'Ref Number' },
];

export const gstB2BExportColumns: ExportColumn[] = [
  { key: 'invoice_number', header: 'Invoice Number' },
  { key: 'invoice_date', header: 'Invoice Date', formatter: formatDateForExport },
  { key: 'party_name', header: 'Party Name' },
  { key: 'gstin', header: 'GSTIN' },
  { key: 'taxable_value', header: 'Taxable Value', formatter: formatCurrencyForExport },
  { key: 'cgst', header: 'CGST', formatter: formatCurrencyForExport },
  { key: 'sgst', header: 'SGST', formatter: formatCurrencyForExport },
  { key: 'igst', header: 'IGST', formatter: formatCurrencyForExport },
  { key: 'total_value', header: 'Total Value', formatter: formatCurrencyForExport },
];

export const trialBalanceExportColumns: ExportColumn[] = [
  { key: 'account_code', header: 'Account Code' },
  { key: 'account_name', header: 'Account Name' },
  { key: 'account_type', header: 'Type' },
  { key: 'debit', header: 'Debit', formatter: formatCurrencyForExport },
  { key: 'credit', header: 'Credit', formatter: formatCurrencyForExport },
];
