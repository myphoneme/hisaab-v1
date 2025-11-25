// Base Types
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

// Client Types
export interface Client extends BaseEntity {
  name: string;
  gstin: string | null;
  pan: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  email: string;
  phone: string;
  contact_person: string;
  client_type: 'B2B' | 'B2C' | 'B2G' | 'SEZ' | 'EXPORT';
  credit_limit: number;
  payment_terms: number;
  is_active: boolean;
}

export interface ClientCreate {
  name: string;
  gstin?: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  country?: string;
  email: string;
  phone: string;
  contact_person: string;
  client_type: 'B2B' | 'B2C' | 'B2G' | 'SEZ' | 'EXPORT';
  credit_limit?: number;
  payment_terms?: number;
  code?: string;
}

// Vendor Types
export interface Vendor extends BaseEntity {
  name: string;
  gstin: string | null;
  pan: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  email: string;
  phone: string;
  contact_person: string;
  vendor_type: 'GOODS' | 'SERVICES' | 'BOTH';
  payment_terms: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  is_active: boolean;
}

export interface VendorCreate {
  name: string;
  gstin?: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  email: string;
  phone: string;
  contact_person: string;
  vendor_type: 'GOODS' | 'SERVICES' | 'BOTH';
  payment_terms?: number;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
}

// Purchase Order Types
export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
}

export interface PurchaseOrder extends BaseEntity {
  po_number: string;
  po_date: string;
  client_id: number;
  client?: Client;
  reference_number: string | null;
  subject: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'FULFILLED' | 'CANCELLED';
  notes: string | null;
}

// Invoice Types
export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_amount: number;
}

export interface Invoice extends BaseEntity {
  invoice_number: string;
  invoice_date: string;
  invoice_type: 'SALES' | 'PURCHASE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  client_id: number | null;
  vendor_id: number | null;
  client?: Client;
  vendor?: Vendor;
  po_id: number | null;
  po?: PurchaseOrder;
  place_of_supply: string;
  is_igst: boolean;
  items: InvoiceItem[];
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  tds_rate: number;
  tds_amount: number;
  tcs_rate: number;
  tcs_amount: number;
  total_amount: number;
  amount_due: number;
  due_date: string;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes: string | null;
  irn: string | null;
  ack_number: string | null;
  ack_date: string | null;
}

// Payment Types
export interface Payment extends BaseEntity {
  payment_number: string;
  payment_date: string;
  payment_type: 'RECEIPT' | 'PAYMENT';
  client_id: number | null;
  vendor_id: number | null;
  client?: Client;
  vendor?: Vendor;
  invoice_id: number | null;
  invoice?: Invoice;
  amount: number;
  tds_amount: number;
  tcs_amount: number;
  net_amount: number;
  payment_mode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'CARD';
  reference_number: string | null;
  bank_name: string | null;
  notes: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

// Ledger Types
export interface LedgerEntry extends BaseEntity {
  entry_date: string;
  account_code: string;
  account_name: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference_type: 'INVOICE' | 'PAYMENT' | 'JOURNAL' | 'OPENING';
  reference_id: number | null;
}

// Dashboard Types
export interface DashboardStats {
  total_receivables: number;
  total_payables: number;
  revenue_this_month: number;
  expenses_this_month: number;
  pending_invoices: number;
  overdue_invoices: number;
  gst_liability: number;
  tds_liability: number;
}

// Tax Types
export interface GSTSummary {
  period: string;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total_tax: number;
}

export interface TDSSummary {
  section: string;
  deductee_count: number;
  total_payment: number;
  total_tds: number;
}

// API Response Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  errors?: Record<string, string[]>;
}

// Form Types
export type FormMode = 'create' | 'edit' | 'view';

// Filter Types
export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface SortParams {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}
