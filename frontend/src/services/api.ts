import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  ApiError,
  Branch,
  BankAccount,
  Client,
  Vendor,
  PurchaseOrder,
  Invoice,
  Payment,
  DashboardStats,
  PaginatedResponse,
  CompanySettings,
  ChartOfAccount,
  LedgerEntry,
  LedgerStatement,
  TrialBalance,
  ExpenseCategory,
  Project,
  CashExpense,
  State,
  Item,
  ClientPO,
  BillingSchedule,
  ProformaInvoice,
  TDSChallan,
  TDSChallanCreate,
  TDSChallanUpdate,
  TDSReturn,
  TDSReturnUpdate,
  TDSSheetData,
  PendingTDSResponse,
  TDSReturnExportResponse,
  TDSType,
} from '../types';

const API_BASE_URL = '/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return response.data;
  }
}

export const api = new ApiService();

// Client API
export const clientApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Client>>('/clients', params),
  getById: (id: number) => api.get<Client>(`/clients/${id}`),
  create: (data: unknown) => api.post<Client>('/clients', data),
  update: (id: number, data: unknown) => api.put<Client>(`/clients/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/clients/${id}`),
};

// Vendor API
export const vendorApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Vendor>>('/vendors', params),
  getById: (id: number) => api.get<Vendor>(`/vendors/${id}`),
  create: (data: unknown) => api.post<Vendor>('/vendors', data),
  update: (id: number, data: unknown) => api.put<Vendor>(`/vendors/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/vendors/${id}`),
};

// Branch API
export const branchApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Branch>>('/branches', params),
  getActive: () => api.get<Branch[]>('/branches/active'),
  getById: (id: number) => api.get<Branch>(`/branches/${id}`),
  create: (data: unknown) => api.post<Branch>('/branches', data),
  update: (id: number, data: unknown) => api.patch<Branch>(`/branches/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/branches/${id}`),
  getBankAccounts: (id: number) => api.get<BankAccount[]>(`/branches/${id}/bank-accounts`),
};

// Bank Account API
export const bankAccountApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<BankAccount>>('/bank-accounts', params),
  getById: (id: number) => api.get<BankAccount>(`/bank-accounts/${id}`),
  create: (data: unknown) => api.post<BankAccount>('/bank-accounts', data),
  update: (id: number, data: unknown) => api.patch<BankAccount>(`/bank-accounts/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/bank-accounts/${id}`),
  setDefault: (id: number) => api.patch<BankAccount>(`/bank-accounts/${id}/set-default`),
};

// Purchase Order API
export const purchaseOrderApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders', params),
  getById: (id: number) => api.get<PurchaseOrder>(`/purchase-orders/${id}`),
  create: (data: unknown) => api.post<PurchaseOrder>('/purchase-orders', data),
  update: (id: number, data: unknown) => api.put<PurchaseOrder>(`/purchase-orders/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/purchase-orders/${id}`),
  updateStatus: (id: number, status: string) => api.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status }),
};

// Invoice API
export const invoiceApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Invoice>>('/invoices', params),
  getById: (id: number) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: unknown) => api.post<Invoice>('/invoices', data),
  update: (id: number, data: unknown) => api.patch<Invoice>(`/invoices/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/invoices/${id}`),
  updateStatus: (id: number, status: string) => api.patch<Invoice>(`/invoices/${id}/status`, { status_update: status }),
};

// Payment API
export const paymentApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Payment>>('/payments', params),
  getById: (id: number) => api.get<Payment>(`/payments/${id}`),
  create: (data: unknown) => api.post<Payment>('/payments', data),
  update: (id: number, data: unknown) => api.patch<Payment>(`/payments/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/payments/${id}`),
};

// Post All Unposted Response type
export interface PostAllUnpostedResponse {
  message: string;
  invoices_posted: number;
  payments_posted: number;
  total_posted: number;
  errors: string[] | null;
}

// Ledger API
export const ledgerApi = {
  // Chart of Accounts
  getAccounts: (params?: Record<string, unknown>) => api.get<PaginatedResponse<ChartOfAccount>>('/ledger/accounts', params),
  getAccountById: (id: number) => api.get<ChartOfAccount>(`/ledger/accounts/${id}`),
  createAccount: (data: unknown) => api.post<ChartOfAccount>('/ledger/accounts', data),
  updateAccount: (id: number, data: unknown) => api.patch<ChartOfAccount>(`/ledger/accounts/${id}`, data),
  deleteAccount: (id: number) => api.delete<{ message: string }>(`/ledger/accounts/${id}`),
  seedAccounts: () => api.post<{ message: string }>('/ledger/accounts/seed'),
  // Ledger Entries
  getEntries: (params?: Record<string, unknown>) => api.get<PaginatedResponse<LedgerEntry>>('/ledger/entries', params),
  createJournalEntry: (data: unknown) => api.post<LedgerEntry>('/ledger/journal-entry', data),
  // Posting
  postAllUnposted: () => api.post<PostAllUnpostedResponse>('/ledger/post-all-unposted'),
  // Reports
  getStatement: (accountId: number, params?: Record<string, unknown>) =>
    api.get<LedgerStatement>(`/ledger/statement/${accountId}`, params),
  getTrialBalance: (params?: Record<string, unknown>) => api.get<TrialBalance>('/ledger/trial-balance', params),
};

// GST Summary Response type
export interface GSTSummaryResponse {
  output_tax: { taxable_amount: number; cgst: number; sgst: number; igst: number; cess: number };
  input_tax: { taxable_amount: number; cgst: number; sgst: number; igst: number; cess: number };
  net_liability: { cgst: number; sgst: number; igst: number };
}

// TDS Summary Response type
export interface TDSSummaryResponse {
  summary: Array<{ section: string; deductee_count: number; total_payment: number; total_tds: number }>;
  total_tds: number;
}

// Party Ledger Response type
export interface PartyLedgerTransaction {
  date: string;
  voucher_number: string;
  type: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference_id: number;
}

export interface PartyLedgerResponse {
  party: {
    id: number;
    name: string;
    gstin?: string;
    address: string;
    email?: string;
    phone?: string;
  };
  party_type: 'client' | 'vendor';
  period: { from: string; to: string };
  opening_balance: number;
  transactions: PartyLedgerTransaction[];
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

// Invoice Monthly Summary Response type
export interface MonthSummary {
  month: number;
  year: number;
  month_name: string;
  transactions: number;
  invoice_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  paid: number;
  due: number;
}

export interface InvoiceMonthlySummaryResponse {
  financial_year: string;
  summary: {
    total_transactions: number;
    total_invoice_value: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_paid: number;
    total_due: number;
  };
  months: MonthSummary[];
}

// Invoice By Month Response type
export interface InvoiceByMonth {
  id: number;
  invoice_number: string;
  invoice_date: string;
  client_name: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: string;
  branch_name: string | null;
}

// Reports API
export const reportsApi = {
  getDashboard: (params?: Record<string, unknown>) => api.get<DashboardStats>('/reports/dashboard', params),
  getGSTSummary: (params?: Record<string, unknown>) => api.get<GSTSummaryResponse>('/reports/gst-summary', params),
  getTDSSummary: (params?: Record<string, unknown>) => api.get<TDSSummaryResponse>('/reports/tds-summary', params),
  getAgingReport: (params?: Record<string, unknown>) => api.get<unknown>('/reports/aging', params),
  getGSTR1: (params?: Record<string, unknown>) => api.get<unknown>('/reports/gstr-1', params),
  getGSTR3B: (params?: Record<string, unknown>) => api.get<unknown>('/reports/gstr-3b', params),
  getRecentInvoices: (params?: Record<string, unknown>) => api.get<unknown>('/reports/recent-invoices', params),
  getUpcomingPayments: (params?: Record<string, unknown>) => api.get<unknown>('/reports/upcoming-payments', params),
  getProfitLoss: (params?: Record<string, unknown>) => api.get<unknown>('/reports/profit-loss', params),
  getBalanceSheet: (params?: Record<string, unknown>) => api.get<unknown>('/reports/balance-sheet', params),
  getPartyLedger: (partyType: 'client' | 'vendor', partyId: number, params?: Record<string, unknown>) =>
    api.get<PartyLedgerResponse>(`/reports/party-ledger/${partyType}/${partyId}`, params),
  downloadPartyLedgerPDF: async (partyType: 'client' | 'vendor', partyId: number, params?: Record<string, unknown>) => {
    const token = localStorage.getItem('access_token');
    const queryString = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    const response = await fetch(`/api/v1/reports/party-ledger/${partyType}/${partyId}/pdf${queryString}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to download PDF');
    return response.blob();
  },
  getExpectedIncome: (params?: Record<string, unknown>) => api.get<ExpectedIncomeResponse>('/reports/expected-income', params),
  getInvoiceMonthlySummary: (financialYear: string, branchId?: number) =>
    api.get<InvoiceMonthlySummaryResponse>('/reports/invoices/monthly-summary', {
      financial_year: financialYear,
      ...(branchId && { branch_id: branchId }),
    }),
};

// Invoice By Month API
export const invoiceByMonthApi = {
  getByMonth: (year: number, month: number, branchId?: number) =>
    api.get<InvoiceByMonth[]>(`/invoices/by-month/${year}/${month}`, branchId ? { branch_id: branchId } : undefined),
};

// Expected Income Response type
export interface ExpectedIncomeResponse {
  period: { from: string; to: string };
  summary: {
    total_schedules: number;
    total_amount: number;
    total_gst: number;
    total_expected: number;
  };
  monthly_forecast: Array<{
    month: string;
    month_name: string;
    schedule_count: number;
    amount: number;
    gst_amount: number;
    total_amount: number;
  }>;
  client_summary: Array<{
    client_id: number;
    client_name: string;
    schedule_count: number;
    total_expected: number;
  }>;
  details: Array<{
    id: number;
    client_po_id: number;
    client_po_number: string | null;
    client_name: string | null;
    installment_number: number;
    description: string | null;
    due_date: string;
    amount: number;
    gst_amount: number;
    total_amount: number;
  }>;
}

// Settings API
export const settingsApi = {
  get: () => api.get<CompanySettings>('/settings'),
  create: (data: unknown) => api.post<CompanySettings>('/settings', data),
  update: (data: unknown) => api.patch<CompanySettings>('/settings', data),
  updateById: (id: number, data: unknown) => api.patch<CompanySettings>(`/settings/${id}`, data),
  uploadLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/v1/settings/logo', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload logo');
    }
    return response.json();
  },
  deleteLogo: async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/v1/settings/logo', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete logo');
    }
    return response.json();
  },
};

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: unknown) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Invoice Attachment API
export const invoiceAttachmentApi = {
  upload: async (invoiceId: number, files: File[], description?: string) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (description) formData.append('description', description);

    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }
    const response = await fetch(`/api/v1/invoices/${invoiceId}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload files');
    }
    return response.json();
  },

  list: (invoiceId: number) =>
    api.get(`/invoices/${invoiceId}/attachments`),

  get: (invoiceId: number, attachmentId: number) =>
    api.get(`/invoices/${invoiceId}/attachments/${attachmentId}`),

  download: async (invoiceId: number, attachmentId: number, filename: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }
    const response = await fetch(
      `/api/v1/invoices/${invoiceId}/attachments/${attachmentId}/download`,
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error('Failed to download file');
    const blob = await response.blob();

    // Trigger browser download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  delete: (invoiceId: number, attachmentId: number) =>
    api.delete(`/invoices/${invoiceId}/attachments/${attachmentId}`),
};

// Expense Category API
export const expenseCategoryApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<ExpenseCategory>>('/expense-categories', params),
  getActive: () => api.get<ExpenseCategory[]>('/expense-categories/active'),
  getById: (id: number) => api.get<ExpenseCategory>(`/expense-categories/${id}`),
  create: (data: unknown) => api.post<ExpenseCategory>('/expense-categories', data),
  update: (id: number, data: unknown) => api.patch<ExpenseCategory>(`/expense-categories/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/expense-categories/${id}`),
};

// Project API
export const projectApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Project>>('/projects', params),
  getActive: () => api.get<Project[]>('/projects/active'),
  getById: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (data: unknown) => api.post<Project>('/projects', data),
  update: (id: number, data: unknown) => api.patch<Project>(`/projects/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/projects/${id}`),
};

// Cash Expense API
export const cashExpenseApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<CashExpense>>('/cash-expenses', params),
  getById: (id: number) => api.get<CashExpense>(`/cash-expenses/${id}`),
  create: (data: unknown) => api.post<CashExpense>('/cash-expenses', data),
  update: (id: number, data: unknown) => api.patch<CashExpense>(`/cash-expenses/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/cash-expenses/${id}`),
};

// State API
export const stateApi = {
  getAll: () => api.get<State[]>('/states'),
  getByCode: (code: string) => api.get<State>(`/states/${code}`),
};

// Item API
export const itemApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Item>>('/items', params),
  getActive: (item_type?: 'GOODS' | 'SERVICES') => api.get<Item[]>('/items/active', item_type ? { item_type } : undefined),
  getById: (id: number) => api.get<Item>(`/items/${id}`),
  create: (data: unknown) => api.post<Item>('/items', data),
  update: (id: number, data: unknown) => api.patch<Item>(`/items/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/items/${id}`),
};

// Proforma Invoice API
export const proformaInvoiceApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<ProformaInvoice>>('/proforma-invoices', params),
  getById: (id: number) => api.get<ProformaInvoice>(`/proforma-invoices/${id}`),
  create: (data: unknown) => api.post<ProformaInvoice>('/proforma-invoices', data),
  update: (id: number, data: unknown) => api.patch<ProformaInvoice>(`/proforma-invoices/${id}`, data),
  updateStatus: (id: number, status: string) => api.patch<ProformaInvoice>(`/proforma-invoices/${id}/status?status_update=${status}`, {}),
  delete: (id: number) => api.delete<{ message: string }>(`/proforma-invoices/${id}`),
  generateInvoice: (id: number) => api.post<{ message: string; invoice_id: number; invoice_number: string }>(`/proforma-invoices/${id}/generate-invoice`, {}),
};

// Client PO API (Sales Orders received from clients)
export const clientPOApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<ClientPO>>('/client-pos', params),
  getById: (id: number) => api.get<ClientPO>(`/client-pos/${id}`),
  create: (data: unknown) => api.post<ClientPO>('/client-pos', data),
  update: (id: number, data: unknown) => api.patch<ClientPO>(`/client-pos/${id}`, data),
  updateStatus: (id: number, status: string) => api.patch<ClientPO>(`/client-pos/${id}/status`, { status }),
  delete: (id: number) => api.delete<{ message: string }>(`/client-pos/${id}`),
  // Billing Schedules
  getSchedules: (poId: number) => api.get<BillingSchedule[]>(`/client-pos/${poId}/schedules`),
  generateSchedules: (poId: number, data: { start_date: string; end_date?: string }) =>
    api.post<BillingSchedule[]>(`/client-pos/${poId}/schedules/generate`, data),
  createSchedule: (poId: number, data: unknown) =>
    api.post<BillingSchedule>(`/client-pos/${poId}/schedules`, data),
  updateSchedule: (poId: number, scheduleId: number, data: unknown) =>
    api.patch<BillingSchedule>(`/client-pos/${poId}/schedules/${scheduleId}`, data),
  deleteSchedule: (poId: number, scheduleId: number) =>
    api.delete<{ message: string }>(`/client-pos/${poId}/schedules/${scheduleId}`),
  // Create invoice from schedule
  createInvoiceFromSchedule: (poId: number, scheduleId: number, data?: { invoice_date?: string; due_date?: string; bank_account_id?: number; notes?: string }) =>
    api.post<Invoice>(`/client-pos/${poId}/schedules/${scheduleId}/create-invoice`, data || {}),
  // Create PI from schedule
  createPIFromSchedule: (poId: number, scheduleId: number, data?: { invoice_date?: string; due_date?: string; bank_account_id?: number; notes?: string }) =>
    api.post<ProformaInvoice>(`/client-pos/${poId}/schedules/${scheduleId}/create-pi`, data || {}),
};

// TDS API
export const tdsApi = {
  // TDS Sheet
  getSheet: (params: { financial_year: string; tds_type: TDSType; branch_id?: number }) =>
    api.get<TDSSheetData>('/tds/sheet', params as Record<string, unknown>),

  // Pending TDS Transactions
  getPending: (params: { financial_year: string; month: number; tds_type: TDSType; branch_id?: number }) =>
    api.get<PendingTDSResponse>(`/tds/pending/${params.financial_year}/${params.month}`, {
      tds_type: params.tds_type,
      branch_id: params.branch_id,
    }),

  // Challans
  createChallan: (data: TDSChallanCreate) => api.post<TDSChallan>('/tds/challan', data),
  getChallan: (id: number) => api.get<TDSChallan>(`/tds/challan/${id}`),
  updateChallan: (id: number, data: TDSChallanUpdate) => api.put<TDSChallan>(`/tds/challan/${id}`, data),
  listChallans: (params: { financial_year: string; tds_type: TDSType; month?: number; branch_id?: number }) =>
    api.get<TDSChallan[]>('/tds/challans', params as Record<string, unknown>),

  uploadChallanFile: async (challanId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }
    const response = await fetch(`/api/v1/tds/challan/${challanId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload challan file');
    }
    return response.json();
  },

  downloadChallanFile: async (challanId: number, filename: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }
    const response = await fetch(`/api/v1/tds/challan/${challanId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to download file');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Returns
  getReturn: (params: { financial_year: string; quarter: number; tds_type: TDSType; branch_id?: number }) =>
    api.get<TDSReturn>(`/tds/return/${params.financial_year}/${params.quarter}`, {
      tds_type: params.tds_type,
      branch_id: params.branch_id,
    }),
  updateReturn: (id: number, data: TDSReturnUpdate) => api.put<TDSReturn>(`/tds/return/${id}`, data),

  uploadReturnFile: async (returnId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }
    const response = await fetch(`/api/v1/tds/return/${returnId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload return file');
    }
    return response.json();
  },

  downloadReturnFile: async (returnId: number, filename: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('Not authenticated. Please log in again.');
    }
    const response = await fetch(`/api/v1/tds/return/${returnId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to download file');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportReturn: (params: { financial_year: string; quarter: number; tds_type: TDSType; branch_id?: number }) =>
    api.get<TDSReturnExportResponse>(`/tds/return/${params.financial_year}/${params.quarter}/export`, {
      tds_type: params.tds_type,
      branch_id: params.branch_id,
    }),
};
