import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Printer, Send, FileCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { proformaInvoiceApi, settingsApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { ProformaInvoice, CompanySettings } from '../../types';

export function ProformaInvoiceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Fetch PI data
  const { data: pi, isLoading } = useQuery<ProformaInvoice>({
    queryKey: ['proforma-invoice', id],
    queryFn: () => proformaInvoiceApi.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch company settings
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ piId, status }: { piId: number; status: string }) =>
      proformaInvoiceApi.updateStatus(piId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      setShowSendConfirm(false);
      setShowCancelConfirm(false);
      if (variables.status === 'SENT') {
        toast.success('Proforma Invoice sent');
      } else if (variables.status === 'CANCELLED') {
        toast.success('Proforma Invoice cancelled');
      }
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    },
  });

  // Generate Invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: (piId: number) => proformaInvoiceApi.generateInvoice(piId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma-invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['proforma-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowGenerateConfirm(false);
      toast.success(`Invoice ${data.invoice_number} generated successfully`);
      navigate(`/invoices/${data.invoice_id}`);
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      toast.error(error.response?.data?.detail || 'Failed to generate invoice');
    },
  });

  const handleSendPI = () => {
    if (id) {
      statusMutation.mutate({ piId: Number(id), status: 'SENT' });
    }
  };

  const handleCancelPI = () => {
    if (id) {
      statusMutation.mutate({ piId: Number(id), status: 'CANCELLED' });
    }
  };

  const handleGenerateInvoice = () => {
    if (id) {
      generateInvoiceMutation.mutate(Number(id));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading proforma invoice...</p>
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Proforma Invoice not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      GENERATED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Send PI Confirmation Modal */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send Proforma Invoice?</h3>
            <p className="text-gray-600 mb-6">
              This will mark the proforma invoice as SENT.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSendConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendPI} disabled={statusMutation.isPending}>
                {statusMutation.isPending ? 'Sending...' : 'Yes, Send PI'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Invoice Confirmation Modal */}
      {showGenerateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Generate Invoice from PI?</h3>
            <p className="text-gray-600 mb-6">
              This will create a new invoice from this proforma invoice.
              The PI status will be changed to GENERATED and cannot be edited.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowGenerateConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateInvoice} disabled={generateInvoiceMutation.isPending}>
                {generateInvoiceMutation.isPending ? 'Generating...' : 'Yes, Generate Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel PI Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Cancel Proforma Invoice?</h3>
            <p className="text-gray-600 mb-6">
              This will cancel the proforma invoice. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                No, Keep PI
              </Button>
              <Button variant="destructive" onClick={handleCancelPI} disabled={statusMutation.isPending}>
                {statusMutation.isPending ? 'Cancelling...' : 'Yes, Cancel PI'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Actions - Hide on print */}
      <div className="no-print flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/proforma-invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Proforma Invoices
        </Button>
        <div className="flex gap-3">
          {/* Send PI Button - Only for DRAFT status */}
          {pi.status === 'DRAFT' && (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowSendConfirm(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Send PI
            </Button>
          )}

          {/* Generate Invoice Button - For DRAFT and SENT */}
          {(pi.status === 'DRAFT' || pi.status === 'SENT') && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowGenerateConfirm(true)}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          )}

          {/* Cancel Button - For DRAFT and SENT */}
          {(pi.status === 'DRAFT' || pi.status === 'SENT') && (
            <Button
              variant="destructive"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel PI
            </Button>
          )}

          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print PI
          </Button>

          {/* Edit Button - Only for DRAFT status */}
          {pi.status === 'DRAFT' && (
            <Button onClick={() => navigate(`/proforma-invoices/${pi.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit PI
            </Button>
          )}
        </div>
      </div>

      {/* PI Container */}
      <Card className="invoice-container">
        <CardContent className="p-8">
          {/* Logo at Top */}
          {settings?.company_logo && (
            <div className="mb-4">
              <img
                src={settings.company_logo}
                alt="Company Logo"
                className="h-12 object-contain"
              />
            </div>
          )}

          {/* PI Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">PROFORMA INVOICE</h1>
              <p className="text-sm text-gray-600">
                <span className="font-medium">PI Number:</span> {pi.pi_number}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Date:</span> {new Date(pi.pi_date).toLocaleDateString('en-IN')}
              </p>
              {pi.due_date && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Due Date:</span> {new Date(pi.due_date).toLocaleDateString('en-IN')}
                </p>
              )}
              {pi.valid_until && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Valid Until:</span> {new Date(pi.valid_until).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(pi.status)}`}>
                {pi.status}
              </span>
              {pi.invoice_id && (
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Invoice Generated:</span>{' '}
                  <button
                    onClick={() => navigate(`/invoices/${pi.invoice_id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    View Invoice
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Company & Client Details */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b">
            {/* Company Details (From) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">FROM:</h3>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{settings?.company_name || 'Your Company'}</p>
                <p className="text-gray-600">{settings?.address}</p>
                <p className="text-gray-600">
                  {settings?.city}, {settings?.state} {settings?.pincode}
                </p>
                {settings?.gstin && <p className="text-gray-600">GSTIN: {settings.gstin}</p>}
                <p className="text-gray-600">Email: {settings?.email}</p>
                <p className="text-gray-600">Phone: {settings?.phone}</p>
              </div>
            </div>

            {/* Client Details (To) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</h3>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{pi.client?.name}</p>
                <p className="text-gray-600">{pi.client?.address}</p>
                <p className="text-gray-600">
                  {pi.client?.city}, {pi.client?.state} {pi.client?.pincode}
                </p>
                {pi.client?.gstin && <p className="text-gray-600">GSTIN: {pi.client.gstin}</p>}
                <p className="text-gray-600">Email: {pi.client?.email}</p>
                <p className="text-gray-600">Phone: {pi.client?.phone}</p>
              </div>
            </div>
          </div>

          {/* PI Metadata */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-600">Place of Supply</p>
              <p className="font-medium">{pi.place_of_supply}</p>
            </div>
            {pi.branch && (
              <div>
                <p className="text-gray-600">Branch</p>
                <p className="font-medium">{pi.branch.name}</p>
              </div>
            )}
            {pi.reverse_charge && (
              <div>
                <p className="text-gray-600">Reverse Charge</p>
                <p className="font-medium">Yes</p>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">S.No</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-left">HSN/SAC</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">GST %</th>
                    <th className="px-3 py-2 text-right">GST Amt</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {pi.items?.map((item, index) => {
                    const itemAmount = Number(item.quantity) * Number(item.rate);
                    const gstAmount = Number(item.cgst_amount || 0) + Number(item.sgst_amount || 0) + Number(item.igst_amount || 0);

                    return (
                      <tr key={item.id || index} className="border-b">
                        <td className="px-3 py-2">{item.serial_no || index + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.description}</p>
                        </td>
                        <td className="px-3 py-2">{item.hsn_sac}</td>
                        <td className="px-3 py-2 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.rate)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(itemAmount)}</td>
                        <td className="px-3 py-2 text-right">{Number(item.gst_rate)}%</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(gstAmount)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total_amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Summary */}
          <div className="flex justify-end">
            <div className="w-80">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(pi.subtotal)}</span>
                </div>

                {pi.discount_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount ({pi.discount_percent}%):</span>
                    <span className="font-medium">- {formatCurrency(pi.discount_amount)}</span>
                  </div>
                )}

                {pi.is_igst ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IGST:</span>
                    <span className="font-medium">{formatCurrency(pi.igst_amount || 0)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST:</span>
                      <span className="font-medium">{formatCurrency(pi.cgst_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST:</span>
                      <span className="font-medium">{formatCurrency(pi.sgst_amount || 0)}</span>
                    </div>
                  </>
                )}

                {pi.cess_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">CESS:</span>
                    <span className="font-medium">{formatCurrency(pi.cess_amount)}</span>
                  </div>
                )}

                {pi.tds_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>TDS Deduction ({pi.tds_rate}%):</span>
                    <span className="font-medium">- {formatCurrency(pi.tds_amount)}</span>
                  </div>
                )}

                {pi.tcs_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>TCS ({pi.tcs_rate}%):</span>
                    <span className="font-medium">+ {formatCurrency(pi.tcs_amount)}</span>
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(pi.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          {(pi.notes || pi.terms_conditions || settings?.invoice_terms) && (
            <div className="mt-8 pt-6 border-t">
              <div className="grid grid-cols-2 gap-8 text-sm">
                {pi.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes:</h3>
                    <p className="text-gray-600 whitespace-pre-line">{pi.notes}</p>
                  </div>
                )}
                {(pi.terms_conditions || settings?.invoice_terms) && (
                  <div>
                    <h3 className="font-semibold mb-2">Terms & Conditions:</h3>
                    <p className="text-gray-600 whitespace-pre-line">{pi.terms_conditions || settings?.invoice_terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bank Account Details */}
          {pi.bank_account && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-3">Bank Details for Payment</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Account Name</p>
                    <p className="font-medium">{pi.bank_account.account_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Bank Name</p>
                    <p className="font-medium">{pi.bank_account.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Number</p>
                    <p className="font-medium">{pi.bank_account.account_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">IFSC Code</p>
                    <p className="font-medium">{pi.bank_account.ifsc_code}</p>
                  </div>
                  {pi.bank_account.branch_name && (
                    <div>
                      <p className="text-gray-600">Branch</p>
                      <p className="font-medium">{pi.bank_account.branch_name}</p>
                    </div>
                  )}
                  {pi.bank_account.upi_id && (
                    <div>
                      <p className="text-gray-600">UPI ID</p>
                      <p className="font-medium">{pi.bank_account.upi_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Company Stamp Section */}
          <div className="mt-12 pt-8 border-t">
            <div className="text-right">
              <p className="text-sm font-semibold mb-4">For {settings?.company_name || 'Company Name'}</p>
              <div className="h-24 border-2 border-dashed border-gray-300 w-48 ml-auto flex items-center justify-center text-gray-400 text-sm">
                Company Stamp
              </div>
              <div className="border-t border-gray-400 w-48 ml-auto pt-2 mt-8">
                <p className="text-sm font-medium">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          body::-webkit-scrollbar {
            display: none;
          }
          ::-webkit-scrollbar {
            display: none;
          }
          .invoice-container {
            box-shadow: none !important;
            max-width: none !important;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
          .bg-gray-50 {
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Hide React Query Devtools */
          .tsqd-parent-container,
          [class*="ReactQueryDevtools"],
          [data-reactquerydevtools] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
