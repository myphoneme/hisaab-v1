import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Calendar,
  Users,
  FileText,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { reportsApi, clientApi, type ExpectedIncomeResponse } from '../../services/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { Client } from '../../types';

export function ExpectedIncome() {
  const today = new Date();
  const [fromMonth, setFromMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );
  const [toMonth, setToMonth] = useState(
    `${today.getFullYear() + 1}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );
  const [clientId, setClientId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'monthly' | 'clients' | 'details'>('monthly');

  const { data: clients } = useQuery<Client[]>({
    queryKey: ['clients-active'],
    queryFn: async () => {
      const response = await clientApi.getAll({ page_size: 100, is_active: true });
      return response.items;
    },
  });

  const { data, isLoading, error } = useQuery<ExpectedIncomeResponse>({
    queryKey: ['expected-income', fromMonth, toMonth, clientId],
    queryFn: () => {
      const params: Record<string, unknown> = {};
      if (fromMonth) params.from_month = fromMonth;
      if (toMonth) params.to_month = toMonth;
      if (clientId) params.client_id = parseInt(clientId);
      return reportsApi.getExpectedIncome(params);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/reports" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expected Income</h1>
            <p className="text-gray-500">Forecast based on pending billing schedules</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="from_month">From Month</Label>
              <Input
                id="from_month"
                type="month"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="to_month">To Month</Label>
              <Input
                id="to_month"
                type="month"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="client">Client</Label>
              <select
                id="client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Clients</option>
                {clients?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFromMonth(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
                  setToMonth(`${today.getFullYear() + 1}-${String(today.getMonth() + 1).padStart(2, '0')}`);
                  setClientId('');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">Failed to load data</div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Schedules</p>
                    <p className="text-xl font-bold">{data.summary.total_schedules}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Expected Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(data.summary.total_amount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">GST Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(data.summary.total_gst)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Expected</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(data.summary.total_expected)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('monthly')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'monthly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Monthly Forecast
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'clients'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                By Client
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Schedule Details
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'monthly' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Monthly Forecast</h2>
              </CardHeader>
              <CardContent>
                {data.monthly_forecast.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No pending schedules found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Month</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Schedules</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">GST</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.monthly_forecast.map((item) => (
                          <tr key={item.month} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium">{item.month_name}</div>
                              <div className="text-xs text-gray-500">{item.month}</div>
                            </td>
                            <td className="px-4 py-3 text-right">{item.schedule_count}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.gst_amount)}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              {formatCurrency(item.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-100">
                        <tr>
                          <td className="px-4 py-3 font-bold">Total</td>
                          <td className="px-4 py-3 text-right font-bold">{data.summary.total_schedules}</td>
                          <td className="px-4 py-3 text-right font-bold">{formatCurrency(data.summary.total_amount)}</td>
                          <td className="px-4 py-3 text-right font-bold">{formatCurrency(data.summary.total_gst)}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">
                            {formatCurrency(data.summary.total_expected)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'clients' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Client-wise Summary</h2>
              </CardHeader>
              <CardContent>
                {data.client_summary.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No pending schedules found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Pending Schedules</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Expected Income</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Share %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.client_summary.map((item) => (
                          <tr key={item.client_id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Link
                                to={`/clients/${item.client_id}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {item.client_name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right">{item.schedule_count}</td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              {formatCurrency(item.total_expected)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {data.summary.total_expected > 0
                                ? ((item.total_expected / data.summary.total_expected) * 100).toFixed(1)
                                : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'details' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Schedule Details</h2>
              </CardHeader>
              <CardContent>
                {data.details.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">No pending schedules found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Due Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client PO</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">GST</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.details.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                {formatDate(item.due_date)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                to={`/client-pos/${item.client_po_id}`}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {item.client_po_number}
                              </Link>
                            </td>
                            <td className="px-4 py-3">{item.client_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {item.description || `Installment ${item.installment_number}`}
                            </td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.amount)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(item.gst_amount)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.total_amount)}</td>
                            <td className="px-4 py-3 text-center">
                              <Link
                                to={`/client-pos/${item.client_po_id}`}
                                className="text-blue-600 hover:text-blue-800"
                                title="View Client PO"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
