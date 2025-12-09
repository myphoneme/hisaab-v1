import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Printer, Send, XCircle, Paperclip } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { invoiceApi, settingsApi, paymentApi, invoiceAttachmentApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { AttachmentList } from '../../components/invoices/AttachmentList';
import { formatCurrency } from '../../lib/utils';
import type { Invoice, CompanySettings, Payment, InvoiceAttachment } from '../../types';

interface InvoiceViewProps {
  returnPath?: string;
}

export function InvoiceView({ returnPath = '/invoices' }: InvoiceViewProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: number; status: string }) =>
      invoiceApi.updateStatus(invoiceId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowSendConfirm(false);
      setShowCancelConfirm(false);
      if (variables.status === 'SENT') {
        toast.success('Invoice sent and posted to ledger');
      } else if (variables.status === 'CANCELLED') {
        toast.success('Invoice cancelled');
      }
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      let msg = 'Failed to update invoice status';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0]?.msg || msg;
      }
      toast.error(msg);
    },
  });

  const handleSendInvoice = () => {
    if (id) {
      statusMutation.mutate({ invoiceId: Number(id), status: 'SENT' });
    }
  };

  const handleCancelInvoice = () => {
    if (id) {
      statusMutation.mutate({ invoiceId: Number(id), status: 'CANCELLED' });
    }
  };

  // Fetch invoice data
  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ['invoice', id],
    queryFn: () => invoiceApi.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch company settings
  const { data: settings } = useQuery<CompanySettings>({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  // Fetch payments for this invoice
  const { data: paymentsData } = useQuery({
    queryKey: ['payments', 'invoice', id],
    queryFn: async () => {
      const response = await paymentApi.getAll();
      const payments = response?.items || [];
      return payments.filter((p: Payment) => p.invoice_id === Number(id));
    },
    enabled: !!id,
  });

  const payments = paymentsData as Payment[] | undefined;

  // Fetch attachments for this invoice
  const { data: attachmentsData } = useQuery({
    queryKey: ['invoice-attachments', id],
    queryFn: async () => {
      const response = await invoiceAttachmentApi.list(Number(id));
      return response;
    },
    enabled: !!id,
  });

  const attachments = (attachmentsData as { attachments: InvoiceAttachment[] })?.attachments || [];

  const handleDownloadAttachment = async (attachment: InvoiceAttachment) => {
    try {
      await invoiceAttachmentApi.download(Number(id), attachment.id, attachment.filename);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Invoice not found</p>
      </div>
    );
  }

  const party = invoice.invoice_type === 'SALES' ? invoice.client : invoice.vendor;
  const totalPaid = payments?.reduce((sum, payment) => sum + (payment.net_amount || 0), 0) || 0;
  const amountDue = invoice.total_amount - totalPaid;

  return (
    <div className="space-y-6">
      {/* Send Invoice Confirmation Modal */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send Invoice?</h3>
            <p className="text-gray-600 mb-6">
              This will mark the invoice as SENT and create ledger entries.
              You won't be able to edit the invoice after sending.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSendConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvoice} disabled={statusMutation.isPending}>
                {statusMutation.isPending ? 'Sending...' : 'Yes, Send Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Invoice Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Cancel Invoice?</h3>
            <p className="text-gray-600 mb-6">
              This will cancel the invoice and reverse any ledger entries.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                No, Keep Invoice
              </Button>
              <Button variant="destructive" onClick={handleCancelInvoice} disabled={statusMutation.isPending}>
                {statusMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Actions - Hide on print */}
      <div className="no-print flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate(returnPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <div className="flex gap-3">
          {/* Send Invoice Button - Only visible for DRAFT status */}
          {invoice.status === 'DRAFT' && (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowSendConfirm(true)}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          )}

          {/* Cancel Invoice Button - Visible for DRAFT, SENT, PARTIAL statuses */}
          {['DRAFT', 'SENT', 'PARTIAL'].includes(invoice.status) && (
            <Button
              variant="destructive"
              onClick={() => setShowCancelConfirm(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Invoice
            </Button>
          )}

          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>

          {/* Edit Button - Only visible for DRAFT status */}
          {invoice.status === 'DRAFT' && (
            <Button onClick={() => navigate(`${returnPath}/${invoice.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Container */}
      <Card className="invoice-container">
        <CardContent className="p-8">
          {/* Logo at Top */}
          {settings?.company_logo && (
            <div className="mb-4 print-logo">
              <img
                src={settings.company_logo}
                alt="Company Logo"
                className="h-16 object-contain print:h-10"
              />
            </div>
          )}

          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{invoice.invoice_type} INVOICE</h1>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Invoice Number:</span> {invoice.invoice_number}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Date:</span> {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
              {invoice.due_date && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Due Date:</span> {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${
                  invoice.status === 'PAID'
                    ? 'bg-green-100 text-green-800'
                    : invoice.status === 'DRAFT'
                    ? 'bg-gray-100 text-gray-800'
                    : invoice.status === 'SENT'
                    ? 'bg-blue-100 text-blue-800'
                    : invoice.status === 'OVERDUE'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>

          {/* Company & Party Details */}
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

            {/* Party Details (To) */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {invoice.invoice_type === 'SALES' ? 'BILL TO:' : 'BILL FROM:'}
              </h3>
              <div className="text-sm">
                <p className="font-bold text-gray-900">{party?.name}</p>
                <p className="text-gray-600">{party?.address}</p>
                <p className="text-gray-600">
                  {party?.city}, {party?.state} {party?.pincode}
                </p>
                {party?.gstin && <p className="text-gray-600">GSTIN: {party.gstin}</p>}
                <p className="text-gray-600">Email: {party?.email}</p>
                <p className="text-gray-600">Phone: {party?.phone}</p>
              </div>
            </div>
          </div>

          {/* Invoice Metadata */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-600">Invoice Type</p>
              <p className="font-medium">{invoice.invoice_type}</p>
            </div>
            <div>
              <p className="text-gray-600">Place of Supply</p>
              <p className="font-medium">{invoice.place_of_supply}</p>
            </div>
            {invoice.po && (
              <div>
                <p className="text-gray-600">PO Reference</p>
                <p className="font-medium">{invoice.po.po_number}</p>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Items</h3>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-2 py-2 text-left">S.No</th>
                  <th className="border px-2 py-2 text-left">Description</th>
                  <th className="border px-2 py-2 text-left">HSN/SAC</th>
                  <th className="border px-2 py-2 text-right">Qty</th>
                  <th className="border px-2 py-2 text-right">Rate</th>
                  <th className="border px-2 py-2 text-right">Amount</th>
                  <th className="border px-2 py-2 text-right">GST%</th>
                  <th className="border px-2 py-2 text-right">GST Amt</th>
                  <th className="border px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => {
                  const itemAmount = Number(item.quantity) * Number(item.rate);
                  const gstAmount = Number(item.cgst_amount || 0) + Number(item.sgst_amount || 0) + Number(item.igst_amount || 0);

                  return (
                    <tr key={item.id}>
                      <td className="border px-2 py-2">{index + 1}</td>
                      <td className="border px-2 py-2">{item.description}</td>
                      <td className="border px-2 py-2">{item.hsn_sac}</td>
                      <td className="border px-2 py-2 text-right">{item.quantity} {item.unit}</td>
                      <td className="border px-2 py-2 text-right">{formatCurrency(item.rate)}</td>
                      <td className="border px-2 py-2 text-right">{formatCurrency(itemAmount)}</td>
                      <td className="border px-2 py-2 text-right">{Number(item.gst_rate)}%</td>
                      <td className="border px-2 py-2 text-right">{formatCurrency(gstAmount)}</td>
                      <td className="border px-2 py-2 text-right font-medium">{formatCurrency(item.total_amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tax Summary */}
          <div className="flex justify-end">
            <div className="w-80">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>

                {invoice.is_interstate ? (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IGST:</span>
                    <span className="font-medium">{formatCurrency(invoice.igst_amount || 0)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST:</span>
                      <span className="font-medium">{formatCurrency(invoice.cgst_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST:</span>
                      <span className="font-medium">{formatCurrency(invoice.sgst_amount || 0)}</span>
                    </div>
                  </>
                )}

                {invoice.cess_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">CESS:</span>
                    <span className="font-medium">{formatCurrency(invoice.cess_amount)}</span>
                  </div>
                )}

                {invoice.tds_amount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>TDS Deduction:</span>
                    <span className="font-medium">- {formatCurrency(invoice.tds_amount)}</span>
                  </div>
                )}

                {invoice.tcs_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>TCS:</span>
                    <span className="font-medium">+ {formatCurrency(invoice.tcs_amount)}</span>
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(invoice.total_amount)}</span>
                </div>

                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Amount Paid:</span>
                      <span className="font-medium">- {formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-red-600">
                      <span>Amount Due:</span>
                      <span>{formatCurrency(amountDue)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment Information */}
          {payments && payments.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-3">Payment History</h3>
              <div className="space-y-2 text-sm">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                    <div>
                      <p className="font-medium">{payment.payment_number}</p>
                      <p className="text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()} - {payment.payment_mode}
                      </p>
                    </div>
                    <span className="font-semibold">{formatCurrency(payment.net_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t no-print">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Attachments ({attachments.length})
              </h3>
              <AttachmentList
                attachments={attachments}
                onDownload={handleDownloadAttachment}
                canDelete={false}
              />
            </div>
          )}

          {/* Notes & Terms */}
          {(invoice.notes || settings?.invoice_terms) && (
            <div className="mt-8 pt-6 border-t">
              <div className="grid grid-cols-2 gap-8 text-sm">
                {invoice.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes:</h3>
                    <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
                  </div>
                )}
                {settings?.invoice_terms && (
                  <div>
                    <h3 className="font-semibold mb-2">Terms & Conditions:</h3>
                    <p className="text-gray-600 whitespace-pre-line">{settings.invoice_terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bank Account Details */}
          {invoice.bank_account && (
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-3">Bank Details for Payment</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Account Name</p>
                    <p className="font-medium">{invoice.bank_account.account_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Bank Name</p>
                    <p className="font-medium">{invoice.bank_account.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Number</p>
                    <p className="font-medium">{invoice.bank_account.account_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">IFSC Code</p>
                    <p className="font-medium">{invoice.bank_account.ifsc_code}</p>
                  </div>
                  {invoice.bank_account.branch_name && (
                    <div>
                      <p className="text-gray-600">Branch</p>
                      <p className="font-medium">{invoice.bank_account.branch_name}</p>
                    </div>
                  )}
                  {invoice.bank_account.upi_id && (
                    <div>
                      <p className="text-gray-600">UPI ID</p>
                      <p className="font-medium">{invoice.bank_account.upi_id}</p>
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
          /* Page settings */
          @page {
            margin: 10mm;
            size: A4 portrait;
          }

          /* Hide non-print elements */
          .no-print,
          .tsqd-open-btn-container,
          .tsqd-main-panel,
          [class*="ReactQueryDevtools"],
          button[aria-label="Open React Query Devtools"],
          aside, nav, header {
            display: none !important;
          }

          /* Reset layout constraints for multi-page print */
          html, body, #root, #root > div,
          .h-screen, .flex-1, main {
            height: auto !important;
            overflow: visible !important;
          }

          .overflow-hidden, .overflow-y-auto, .overflow-x-auto {
            overflow: visible !important;
          }

          body, main {
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Hide scrollbars */
          body {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          /* Invoice container */
          .invoice-container {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 5mm !important;
          }

          /* Logo */
          .print-logo img {
            height: 50px !important;
          }

          /* Table styles */
          table {
            width: 100% !important;
            font-size: 10pt !important;
            border-collapse: collapse !important;
          }

          th, td {
            padding: 6px 8px !important;
            border: 1px solid #ccc !important;
          }

          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Keep rows together */
          tr {
            page-break-inside: avoid;
          }

          /* Repeat table header on each page */
          thead {
            display: table-header-group;
          }

          /* Background colors */
          .bg-gray-50 {
            background-color: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
