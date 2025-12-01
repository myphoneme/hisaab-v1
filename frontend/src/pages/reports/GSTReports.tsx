import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { BranchSelector } from '../../components/ui/BranchSelector';
import { reportsApi } from '../../services/api';
import { formatCurrency } from '../../lib/utils';

export function GSTReports() {
  const [activeTab, setActiveTab] = useState<'gstr1' | 'gstr3b'>('gstr1');
  const [branchId, setBranchId] = useState<number | string>('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const { data: gstr1, isLoading: gstr1Loading } = useQuery({
    queryKey: ['gstr-1', dateRange, branchId],
    queryFn: () => {
      const params: any = { from_date: dateRange.from, to_date: dateRange.to };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getGSTR1(params);
    },
    enabled: activeTab === 'gstr1',
  });

  const { data: gstr3b, isLoading: gstr3bLoading } = useQuery({
    queryKey: ['gstr-3b', dateRange, branchId],
    queryFn: () => {
      const params: any = { from_date: dateRange.from, to_date: dateRange.to };
      if (branchId) params.branch_id = branchId;
      return reportsApi.getGSTR3B(params);
    },
    enabled: activeTab === 'gstr3b',
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GST Reports</h1>
          <p className="text-gray-500 mt-1">GSTR-1 and GSTR-3B filing reports</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="w-64">
              <BranchSelector
                value={branchId}
                onChange={setBranchId}
                label="Branch"
                required={false}
              />
            </div>
            <span className="text-sm font-medium">Period:</span>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
              className="w-40"
            />
            <span className="text-sm">to</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('gstr1')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'gstr1'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            GSTR-1
          </button>
          <button
            onClick={() => setActiveTab('gstr3b')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'gstr3b'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            GSTR-3B
          </button>
        </nav>
      </div>

      {/* GSTR-1 */}
      {activeTab === 'gstr1' && gstr1 && (
        <div className="space-y-6">
          {/* B2B Supplies */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">B2B Supplies</h3>
            </CardHeader>
            <CardContent className="p-6">
              {gstr1.b2b_supplies?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Invoice #</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Party Name</th>
                        <th className="px-4 py-2 text-left">GSTIN</th>
                        <th className="px-4 py-2 text-right">Taxable Value</th>
                        <th className="px-4 py-2 text-right">CGST</th>
                        <th className="px-4 py-2 text-right">SGST</th>
                        <th className="px-4 py-2 text-right">IGST</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1.b2b_supplies.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{item.invoice_number}</td>
                          <td className="px-4 py-2">{item.invoice_date}</td>
                          <td className="px-4 py-2">{item.party_name}</td>
                          <td className="px-4 py-2">{item.gstin}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.taxable_value)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.cgst)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.sgst)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.igst)}</td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(item.total_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No B2B transactions</p>
              )}
            </CardContent>
          </Card>

          {/* B2C Large */}
          {gstr1.b2c_large && gstr1.b2c_large.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">B2C Large (&gt; 2.5 Lakh)</h3>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Invoice #</th>
                        <th className="px-4 py-2 text-left">Place of Supply</th>
                        <th className="px-4 py-2 text-right">Taxable Value</th>
                        <th className="px-4 py-2 text-right">Tax</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1.b2c_large.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{item.invoice_number}</td>
                          <td className="px-4 py-2">{item.place_of_supply}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.taxable_value)}</td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(item.cgst + item.sgst + item.igst)}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatCurrency(item.total_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* HSN Summary */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">HSN-wise Summary</h3>
            </CardHeader>
            <CardContent className="p-6">
              {gstr1.hsn_summary?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">HSN Code</th>
                        <th className="px-4 py-2 text-left">UQC</th>
                        <th className="px-4 py-2 text-right">Quantity</th>
                        <th className="px-4 py-2 text-right">Taxable Value</th>
                        <th className="px-4 py-2 text-right">Rate</th>
                        <th className="px-4 py-2 text-right">Tax Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstr1.hsn_summary.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-2">{item.hsn_code}</td>
                          <td className="px-4 py-2">{item.uqc}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(item.taxable_value)}</td>
                          <td className="px-4 py-2 text-right">{item.rate}%</td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(item.cgst + item.sgst + item.igst)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No HSN data</p>
              )}
            </CardContent>
          </Card>

          {/* Document Summary */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Document Summary</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {gstr1.document_summary?.total_invoices || 0}
                  </p>
                  <p className="text-sm text-gray-500">Total Invoices</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {gstr1.document_summary?.total_credit_notes || 0}
                  </p>
                  <p className="text-sm text-gray-500">Credit Notes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {gstr1.document_summary?.cancelled || 0}
                  </p>
                  <p className="text-sm text-gray-500">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GSTR-3B */}
      {activeTab === 'gstr3b' && gstr3b && (
        <div className="space-y-6">
          {/* Outward Supplies */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">3.1 Outward Taxable Supplies</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Taxable Value</p>
                  <p className="font-bold">
                    {formatCurrency(gstr3b.section_3_1?.taxable_value || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">CGST</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_3_1?.cgst || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">SGST</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_3_1?.sgst || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">IGST</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_3_1?.igst || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Cess</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_3_1?.cess || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reverse Charge */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">4. Inward Supplies (Reverse Charge)</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Taxable Value</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_4?.taxable_value || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">CGST</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_4?.cgst || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">SGST</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_4?.sgst || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">IGST</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_4?.igst || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Cess</p>
                  <p className="font-bold">{formatCurrency(gstr3b.section_4?.cess || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eligible ITC */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">4. Eligible ITC</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">Inputs</p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">CGST</p>
                      <p className="font-bold">
                        {formatCurrency(gstr3b.section_4_itc?.inputs?.cgst || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">SGST</p>
                      <p className="font-bold">
                        {formatCurrency(gstr3b.section_4_itc?.inputs?.sgst || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">IGST</p>
                      <p className="font-bold">
                        {formatCurrency(gstr3b.section_4_itc?.inputs?.igst || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cess</p>
                      <p className="font-bold">
                        {formatCurrency(gstr3b.section_4_itc?.inputs?.cess || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="font-medium mb-2">Net ITC Available</p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">CGST</p>
                      <p className="font-bold text-green-600">
                        {formatCurrency(gstr3b.section_4_itc?.net_itc_available?.cgst || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">SGST</p>
                      <p className="font-bold text-green-600">
                        {formatCurrency(gstr3b.section_4_itc?.net_itc_available?.sgst || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">IGST</p>
                      <p className="font-bold text-green-600">
                        {formatCurrency(gstr3b.section_4_itc?.net_itc_available?.igst || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Cess</p>
                      <p className="font-bold text-green-600">
                        {formatCurrency(gstr3b.section_4_itc?.net_itc_available?.cess || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Tax Liability */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">6. Net Tax Liability</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">CGST</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(gstr3b.section_6_net_tax?.cgst || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">SGST</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(gstr3b.section_6_net_tax?.sgst || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">IGST</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(gstr3b.section_6_net_tax?.igst || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Cess</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(gstr3b.section_6_net_tax?.cess || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
