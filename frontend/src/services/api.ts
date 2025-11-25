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
  update: (id: number, data: unknown) => api.put(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/invoices/${id}/status`, { status }),
  generatePdf: (id: number) => api.get(`/invoices/${id}/pdf`),
};

// Payment API
export const paymentApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/payments', params),
  getById: (id: number) => api.get(`/payments/${id}`),
  create: (data: unknown) => api.post('/payments', data),
  update: (id: number, data: unknown) => api.put(`/payments/${id}`, data),
  delete: (id: number) => api.delete(`/payments/${id}`),
};

// Ledger API
export const ledgerApi = {
  getEntries: (params?: Record<string, unknown>) => api.get('/ledger', params),
  getTrialBalance: (params?: Record<string, unknown>) => api.get('/ledger/trial-balance', params),
  getProfitLoss: (params?: Record<string, unknown>) => api.get('/ledger/profit-loss', params),
  getBalanceSheet: (params?: Record<string, unknown>) => api.get('/ledger/balance-sheet', params),
};

// Reports API
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getGSTSummary: (params?: Record<string, unknown>) => api.get('/reports/gst-summary', params),
  getTDSSummary: (params?: Record<string, unknown>) => api.get('/reports/tds-summary', params),
  getAgingReport: (params?: Record<string, unknown>) => api.get('/reports/aging', params),
};

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: unknown) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};
