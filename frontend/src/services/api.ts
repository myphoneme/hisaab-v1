import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import type { ApiError } from '../types';

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
  getAll: (params?: Record<string, unknown>) => api.get('/clients', params),
  getById: (id: number) => api.get(`/clients/${id}`),
  create: (data: unknown) => api.post('/clients', data),
  update: (id: number, data: unknown) => api.put(`/clients/${id}`, data),
  delete: (id: number) => api.delete(`/clients/${id}`),
};

// Vendor API
export const vendorApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/vendors', params),
  getById: (id: number) => api.get(`/vendors/${id}`),
  create: (data: unknown) => api.post('/vendors', data),
  update: (id: number, data: unknown) => api.put(`/vendors/${id}`, data),
  delete: (id: number) => api.delete(`/vendors/${id}`),
};

// Branch API
export const branchApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/branches', params),
  getActive: () => api.get('/branches/active'),
  getById: (id: number) => api.get(`/branches/${id}`),
  create: (data: unknown) => api.post('/branches', data),
  update: (id: number, data: unknown) => api.patch(`/branches/${id}`, data),
  delete: (id: number) => api.delete(`/branches/${id}`),
  getBankAccounts: (id: number) => api.get(`/branches/${id}/bank-accounts`),
};

// Bank Account API
export const bankAccountApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/bank-accounts', params),
  getById: (id: number) => api.get(`/bank-accounts/${id}`),
  create: (data: unknown) => api.post('/bank-accounts', data),
  update: (id: number, data: unknown) => api.patch(`/bank-accounts/${id}`, data),
  delete: (id: number) => api.delete(`/bank-accounts/${id}`),
  setDefault: (id: number) => api.patch(`/bank-accounts/${id}/set-default`),
};

// Purchase Order API
export const purchaseOrderApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/purchase-orders', params),
  getById: (id: number) => api.get(`/purchase-orders/${id}`),
  create: (data: unknown) => api.post('/purchase-orders', data),
  update: (id: number, data: unknown) => api.put(`/purchase-orders/${id}`, data),
  delete: (id: number) => api.delete(`/purchase-orders/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/purchase-orders/${id}/status`, { status }),
};

// Invoice API
export const invoiceApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/invoices', params),
  getById: (id: number) => api.get(`/invoices/${id}`),
  create: (data: unknown) => api.post('/invoices', data),
  update: (id: number, data: unknown) => api.patch(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/invoices/${id}/status`, status),
};

// Payment API
export const paymentApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/payments', params),
  getById: (id: number) => api.get(`/payments/${id}`),
  create: (data: unknown) => api.post('/payments', data),
  update: (id: number, data: unknown) => api.patch(`/payments/${id}`, data),
  delete: (id: number) => api.delete(`/payments/${id}`),
};

// Ledger API
export const ledgerApi = {
  // Chart of Accounts
  getAccounts: (params?: Record<string, unknown>) => api.get('/ledger/accounts', params),
  getAccountById: (id: number) => api.get(`/ledger/accounts/${id}`),
  createAccount: (data: unknown) => api.post('/ledger/accounts', data),
  updateAccount: (id: number, data: unknown) => api.patch(`/ledger/accounts/${id}`, data),
  deleteAccount: (id: number) => api.delete(`/ledger/accounts/${id}`),
  // Ledger Entries
  getEntries: (params?: Record<string, unknown>) => api.get('/ledger/entries', params),
  createJournalEntry: (data: unknown) => api.post('/ledger/journal-entry', data),
  // Reports
  getStatement: (accountId: number, params?: Record<string, unknown>) =>
    api.get(`/ledger/statement/${accountId}`, params),
  getTrialBalance: (params?: Record<string, unknown>) => api.get('/ledger/trial-balance', params),
};

// Reports API
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getGSTSummary: (params?: Record<string, unknown>) => api.get('/reports/gst-summary', params),
  getTDSSummary: (params?: Record<string, unknown>) => api.get('/reports/tds-summary', params),
  getAgingReport: (params?: Record<string, unknown>) => api.get('/reports/aging', params),
  getGSTR1: (params?: Record<string, unknown>) => api.get('/reports/gstr-1', params),
  getGSTR3B: (params?: Record<string, unknown>) => api.get('/reports/gstr-3b', params),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  create: (data: unknown) => api.post('/settings', data),
  update: (data: unknown) => api.patch('/settings', data),
  updateById: (id: number, data: unknown) => api.patch(`/settings/${id}`, data),
};

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: unknown) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};
