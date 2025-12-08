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
  contact_person: string | null;
  client_type: 'B2B' | 'B2C' | 'B2G' | 'SEZ' | 'EXPORT';
  credit_limit: number;
  payment_terms: number;
  is_active: boolean;
  code: string | null;
  country: string;
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
  contact_person?: string;
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
  country: string;
  email: string;
  phone: string;
  contact_person: string | null;
  vendor_type: 'GOODS' | 'SERVICES' | 'BOTH';
  payment_terms: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  tds_applicable: boolean;
  tds_section: string | null;
  is_active: boolean;
  code: string | null;
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
  country?: string;
  email: string;
  phone: string;
  contact_person?: string;
  vendor_type: 'GOODS' | 'SERVICES' | 'BOTH';
  payment_terms?: number;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  tds_applicable?: boolean;
  tds_section?: string;
  code?: string;
}

// Branch Types
export interface Branch extends BaseEntity {
  branch_name: string;
  branch_code: string;
  gstin: string;
  state: string;
  state_code: string;
  address: string;
  city: string;
  pincode: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  is_head_office: boolean;
}

export interface BranchCreate {
  branch_name: string;
  branch_code: string;
  gstin: string;
  state: string;
  state_code: string;
  address: string;
  city: string;
  pincode: string;
  email?: string;
  phone?: string;
  is_head_office?: boolean;
}

// Bank Account Types
export interface BankAccount extends BaseEntity {
  branch_id: number;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string | null;
  account_type: 'SAVINGS' | 'CURRENT' | 'OVERDRAFT' | 'CASH_CREDIT';
  upi_id: string | null;
  swift_code: string | null;
  is_active: boolean;
  is_default: boolean;
  branch?: Branch;
}

export interface BankAccountCreate {
  branch_id: number;
  account_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name?: string;
  account_type?: 'SAVINGS' | 'CURRENT' | 'OVERDRAFT' | 'CASH_CREDIT';
  upi_id?: string;
  swift_code?: string;
  is_default?: boolean;
}

// Purchase Order Types
export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  serial_no: number;
  description: string;
  hsn_sac: string | null;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  cess_rate: number;
  total_amount: number;
}

export interface PurchaseOrderItemCreate {
  serial_no: number;
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit?: string;
  rate: number;
  gst_rate?: number;
  cess_rate?: number;
}

export interface PurchaseOrder extends BaseEntity {
  po_number: string;
  po_date: string;
  client_id: number;
  client?: Client;
  branch_id: number | null;
  branch?: Branch;
  reference_number: string | null;
  subject: string | null;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  items: PurchaseOrderItem[];
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_amount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'FULFILLED' | 'CANCELLED';
  notes: string | null;
  terms_conditions: string | null;
  valid_until: string | null;
}

export interface PurchaseOrderCreate {
  po_date: string;
  reference_number?: string;
  client_id: number;
  branch_id?: number;
  subject?: string;
  discount_percent?: number;
  notes?: string;
  terms_conditions?: string;
  valid_until?: string;
  items: PurchaseOrderItemCreate[];
}

// Invoice Types
export interface InvoiceItem {
  id: number;
  invoice_id: number;
  serial_no: number;
  description: string;
  hsn_sac: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  cess_rate: number;
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
  branch_id: number | null;
  branch?: Branch;
  bank_account_id: number | null;
  bank_account?: BankAccount;
  po_id: number | null;
  po?: PurchaseOrder;
  place_of_supply: string;
  place_of_supply_code: string;
  is_igst: boolean;
  reverse_charge: boolean;
  discount_percent: number;
  items: InvoiceItem[];
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  round_off: number;
  tds_applicable: boolean;
  tds_section: string | null;
  tds_rate: number;
  tds_amount: number;
  tcs_applicable: boolean;
  tcs_rate: number;
  tcs_amount: number;
  amount_after_tds: number;
  total_amount: number;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes: string | null;
  terms_conditions: string | null;
  irn: string | null;
  ack_number: string | null;
  ack_date: string | null;
  is_posted: boolean;
  attachments?: InvoiceAttachment[];
}

// Invoice Attachment Types
export interface InvoiceAttachment {
  id: number;
  invoice_id: number;
  filename: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  created_at: string;
}

export interface InvoiceAttachmentUploadResponse {
  message: string;
  attachments: InvoiceAttachment[];
}

export interface InvoiceAttachmentListResponse {
  attachments: InvoiceAttachment[];
  total: number;
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
  branch_id: number | null;
  branch?: Branch;
  bank_account_id: number | null;
  bank_account_ref?: BankAccount;
  invoice_id: number | null;
  invoice?: Invoice;
  gross_amount: number;
  tds_amount: number;
  tcs_amount: number;
  net_amount: number;
  payment_mode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'CARD';
  reference_number: string | null;
  notes: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  is_posted: boolean;
}

export interface PaymentCreate {
  payment_date: string;
  payment_type: 'RECEIPT' | 'PAYMENT';
  client_id?: number;
  vendor_id?: number;
  branch_id?: number;
  bank_account_id?: number;
  invoice_id?: number;
  gross_amount: number;
  tds_amount?: number;
  tcs_amount?: number;
  payment_mode: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI' | 'CARD';
  reference_number?: string;
  cheque_date?: string;
  notes?: string;
}

// Ledger Types
export interface ChartOfAccount extends BaseEntity {
  code: string;
  name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  account_group: string;
  parent_id: number | null;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
}

export interface ChartOfAccountCreate {
  code: string;
  name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  account_group: string;
  parent_id?: number;
  description?: string;
  is_active?: boolean;
}

export interface LedgerEntry extends BaseEntity {
  entry_date: string;
  voucher_number: string;
  account_id: number;
  debit: number;
  credit: number;
  narration: string | null;
  reference_type: 'INVOICE' | 'PAYMENT' | 'JOURNAL' | 'OPENING';
  reference_id: number | null;
  financial_year: string;
  client_id: number | null;
  vendor_id: number | null;
}

export interface LedgerStatement {
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  entries: LedgerEntry[];
}

export interface TrialBalanceItem {
  account_code: string;
  account_name: string;
  account_type: string;
  account_group: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  as_on_date: string;
  accounts: TrialBalanceItem[];
  total_debit: number;
  total_credit: number;
}

// State Types
export interface State extends BaseEntity {
  code: string;
  name: string;
  is_active: boolean;
}

// Item Types
export interface Item extends BaseEntity {
  code: string;
  name: string;
  description: string | null;
  item_type: 'GOODS' | 'SERVICES';
  hsn_sac: string | null;
  default_gst_rate: number;
  default_unit: string;
  default_rate: number | null;
  is_active: boolean;
}

export interface ItemCreate {
  code: string;
  name: string;
  description?: string;
  item_type?: 'GOODS' | 'SERVICES';
  hsn_sac?: string;
  default_gst_rate?: number;
  default_unit?: string;
  default_rate?: number;
}

export interface ItemUpdate {
  code?: string;
  name?: string;
  description?: string;
  item_type?: 'GOODS' | 'SERVICES';
  hsn_sac?: string;
  default_gst_rate?: number;
  default_unit?: string;
  default_rate?: number;
  is_active?: boolean;
}

// Client PO Types
export type ClientPOStatus = 'DRAFT' | 'ACTIVE' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type BillingFrequency = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'MILESTONE';
export type ScheduleStatus = 'PENDING' | 'PI_RAISED' | 'INVOICED' | 'CANCELLED';

export interface ClientPOItem {
  id: number;
  client_po_id: number;
  item_id: number | null;
  serial_no: number;
  description: string;
  hsn_sac: string | null;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  invoiced_quantity: number;
  remaining_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface ClientPOItemCreate {
  item_id?: number;
  serial_no: number;
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit?: string;
  rate: number;
  amount: number;
  gst_rate?: number;
}

export interface ClientPO extends BaseEntity {
  internal_number: string;
  client_po_number: string | null;
  client_po_date: string | null;
  received_date: string;
  client_id: number;
  branch_id: number | null;
  subject: string | null;
  notes: string | null;
  valid_from: string;
  valid_until: string | null;
  billing_frequency: BillingFrequency;
  place_of_supply: string | null;
  place_of_supply_code: string | null;
  is_igst: boolean;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  invoiced_amount: number;
  remaining_amount: number;
  status: ClientPOStatus;
  items?: ClientPOItem[];
  client_name?: string;
  branch_name?: string | null;
}

export interface ClientPOCreate {
  client_po_number?: string;
  client_po_date?: string;
  received_date: string;
  client_id: number;
  branch_id?: number;
  subject?: string;
  notes?: string;
  valid_from: string;
  valid_until?: string;
  billing_frequency?: BillingFrequency;
  place_of_supply?: string;
  place_of_supply_code?: string;
  is_igst?: boolean;
  discount_percent?: number;
  discount_amount?: number;
  items: ClientPOItemCreate[];
}

export interface ClientPOUpdate {
  client_po_number?: string;
  client_po_date?: string;
  received_date?: string;
  client_id?: number;
  branch_id?: number;
  subject?: string;
  notes?: string;
  valid_from?: string;
  valid_until?: string;
  billing_frequency?: BillingFrequency;
  place_of_supply?: string;
  place_of_supply_code?: string;
  is_igst?: boolean;
  discount_percent?: number;
  discount_amount?: number;
  items?: ClientPOItemCreate[];
}

export interface BillingSchedule extends BaseEntity {
  client_po_id: number;
  installment_number: number;
  description: string | null;
  due_date: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  status: ScheduleStatus;
  proforma_invoice_id: number | null;
  invoice_id: number | null;
  notes: string | null;
  client_po_internal_number?: string;
  client_name?: string;
}

export interface BillingScheduleCreate {
  client_po_id: number;
  installment_number: number;
  description?: string;
  due_date: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  notes?: string;
}

export interface GenerateSchedulesRequest {
  start_date: string;
  end_date?: string;
}

export interface CreateInvoiceFromScheduleRequest {
  invoice_date?: string;
  due_date?: string;
  bank_account_id?: number;
  notes?: string;
}

// Proforma Invoice Types
export type PIStatus = 'DRAFT' | 'SENT' | 'GENERATED' | 'CANCELLED';

export interface ProformaInvoiceItem {
  id: number;
  proforma_invoice_id: number;
  serial_no: number;
  item_id: number | null;
  item_name: string | null;
  description: string;
  hsn_sac: string | null;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  cess_rate: number;
  cess_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ProformaInvoice extends BaseEntity {
  pi_number: string;
  pi_date: string;
  client_id: number;
  branch_id: number | null;
  bank_account_id: number | null;
  client_po_id: number | null;
  billing_schedule_id: number | null;
  place_of_supply: string;
  place_of_supply_code: string;
  is_igst: boolean;
  reverse_charge: boolean;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  round_off: number;
  total_amount: number;
  tds_applicable: boolean;
  tds_section: string | null;
  tds_rate: number;
  tds_amount: number;
  tcs_applicable: boolean;
  tcs_rate: number;
  tcs_amount: number;
  amount_after_tds: number;
  due_date: string;
  valid_until: string | null;
  status: PIStatus;
  invoice_id: number | null;
  notes: string | null;
  terms_conditions: string | null;
  items?: ProformaInvoiceItem[];
  client?: Client;
  branch?: Branch;
  bank_account?: BankAccount;
}

export interface ProformaInvoiceItemCreate {
  serial_no: number;
  item_id?: number;
  item_name?: string;
  description: string;
  hsn_sac?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount_percent?: number;
  gst_rate?: number;
  cess_rate?: number;
}

export interface ProformaInvoiceCreate {
  pi_date: string;
  client_id: number;
  branch_id?: number;
  bank_account_id?: number;
  client_po_id?: number;
  billing_schedule_id?: number;
  place_of_supply: string;
  place_of_supply_code: string;
  is_igst?: boolean;
  reverse_charge?: boolean;
  discount_percent?: number;
  tds_applicable?: boolean;
  tds_section?: string;
  tds_rate?: number;
  tcs_applicable?: boolean;
  tcs_rate?: number;
  due_date: string;
  valid_until?: string;
  notes?: string;
  terms_conditions?: string;
  items: ProformaInvoiceItemCreate[];
}

// Expense Category Types
export interface ExpenseCategory extends BaseEntity {
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
}

export interface ExpenseCategoryCreate {
  name: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

// Project Types
export interface Project extends BaseEntity {
  name: string;
  code: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  is_active: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
}

export interface ProjectCreate {
  name: string;
  code?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  is_active?: boolean;
  status?: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
}

// Cash Expense Types
export interface CashExpense extends BaseEntity {
  expense_number: string;
  transaction_date: string;
  expense_category_id: number | null;
  expense_category?: ExpenseCategory;
  bank_account_id: number;
  bank_account?: BankAccount;
  project_id: number | null;
  project?: Project;
  branch_id: number | null;
  branch?: Branch;
  amount: number;
  transaction_type: 'DEBIT' | 'CREDIT';
  transaction_ref: string | null;
  description: string | null;
  financial_year: string;
}

export interface CashExpenseCreate {
  transaction_date: string;
  expense_category_id?: number;
  bank_account_id: number;
  project_id?: number;
  branch_id?: number;
  amount: number;
  transaction_type: 'DEBIT' | 'CREDIT';
  transaction_ref?: string;
  description?: string;
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

// Settings Types
export interface CompanySettings extends BaseEntity {
  company_name: string;
  company_logo: string | null;
  gstin: string | null;
  pan: string;
  tan: string | null;
  cin: string | null;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  country: string;
  email: string;
  phone: string;
  website: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  bank_account_type: string | null;
  financial_year_start_month: number;
  default_currency: string;
  default_gst_rate: number;
  enable_tds: boolean;
  enable_tcs: boolean;
  invoice_prefix: string;
  invoice_terms: string | null;
  invoice_notes: string | null;
  pi_terms: string | null;
  purchase_order_terms: string | null;
  enable_multi_currency: boolean;
  enable_inventory: boolean;
  is_active: boolean;
  // Ledger Posting Settings
  ledger_posting_on: 'ON_CREATE' | 'ON_SENT';
  default_sales_account_id: number | null;
  default_purchase_account_id: number | null;
  default_ar_account_id: number | null;
  default_ap_account_id: number | null;
  default_cash_account_id: number | null;
  default_bank_account_id: number | null;
  default_cgst_output_account_id: number | null;
  default_sgst_output_account_id: number | null;
  default_igst_output_account_id: number | null;
  default_cgst_input_account_id: number | null;
  default_sgst_input_account_id: number | null;
  default_igst_input_account_id: number | null;
  default_tds_receivable_account_id: number | null;
  default_tds_payable_account_id: number | null;
  default_round_off_account_id: number | null;
}

export interface CompanySettingsUpdate {
  company_name?: string;
  company_logo?: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  cin?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_branch?: string;
  bank_account_type?: string;
  financial_year_start_month?: number;
  default_currency?: string;
  default_gst_rate?: number;
  enable_tds?: boolean;
  enable_tcs?: boolean;
  invoice_prefix?: string;
  invoice_terms?: string;
  invoice_notes?: string;
  pi_terms?: string;
  purchase_order_terms?: string;
  enable_multi_currency?: boolean;
  enable_inventory?: boolean;
  // Ledger Posting Settings
  ledger_posting_on?: 'ON_CREATE' | 'ON_SENT';
  default_sales_account_id?: number;
  default_purchase_account_id?: number;
  default_ar_account_id?: number;
  default_ap_account_id?: number;
  default_cash_account_id?: number;
  default_bank_account_id?: number;
  default_cgst_output_account_id?: number;
  default_sgst_output_account_id?: number;
  default_igst_output_account_id?: number;
  default_cgst_input_account_id?: number;
  default_sgst_input_account_id?: number;
  default_igst_input_account_id?: number;
  default_tds_receivable_account_id?: number;
  default_tds_payable_account_id?: number;
  default_round_off_account_id?: number;
}
