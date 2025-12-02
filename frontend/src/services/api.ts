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
  updateStatus: (id: number, status: string) => api.patch<Invoice>(`/invoices/${id}/status`, status),
};

// Payment API
export const paymentApi = {
  getAll: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Payment>>('/payments', params),
  getById: (id: number) => api.get<Payment>(`/payments/${id}`),
  create: (data: unknown) => api.post<Payment>('/payments', data),
  update: (id: number, data: unknown) => api.patch<Payment>(`/payments/${id}`, data),
  delete: (id: number) => api.delete<{ message: string }>(`/payments/${id}`),
};

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

// Reports API
export const reportsApi = {
  getDashboard: (params?: Record<string, unknown>) => api.get<DashboardStats>('/reports/dashboard', params),
  getGSTSummary: (params?: Record<string, unknown>) => api.get<GSTSummaryResponse>('/reports/gst-summary', params),
  getTDSSummary: (params?: Record<string, unknown>) => api.get<TDSSummaryResponse>('/reports/tds-summary', params),
  getAgingReport: (params?: Record<string, unknown>) => api.get<unknown>('/reports/aging', params),
  getGSTR1: (params?: Record<string, unknown>) => api.get<unknown>('/reports/gstr-1', params),
  getGSTR3B: (params?: Record<string, unknown>) => api.get<unknown>('/reports/gstr-3b', params),
};

// Settings API
export const settingsApi = {
  get: () => api.get<CompanySettings>('/settings'),
  create: (data: unknown) => api.post<CompanySettings>('/settings', data),
  update: (data: unknown) => api.patch<CompanySettings>('/settings', data),
  updateById: (id: number, data: unknown) => api.patch<CompanySettings>(`/settings/${id}`, data),
};

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: unknown) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};
