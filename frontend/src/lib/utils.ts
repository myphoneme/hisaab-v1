import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function calculateGST(amount: number, rate: number): { cgst: number; sgst: number; igst: number; total: number } {
  const gstAmount = (amount * rate) / 100;
  return {
    cgst: gstAmount / 2,
    sgst: gstAmount / 2,
    igst: gstAmount,
    total: gstAmount,
  };
}

export function calculateTDS(amount: number, rate: number): number {
  return (amount * rate) / 100;
}

export function calculateTCS(amount: number, rate: number): number {
  return (amount * rate) / 100;
}

export function generateInvoiceNumber(prefix: string, sequence: number, year: string): string {
  return `${prefix}/${year}/${String(sequence).padStart(4, '0')}`;
}

export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month < 3) {
    return `${year - 1}-${String(year).slice(2)}`;
  }
  return `${year}-${String(year + 1).slice(2)}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

export function validatePAN(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

export function getStateCodeFromGSTIN(gstin: string): string {
  return gstin.substring(0, 2);
}
