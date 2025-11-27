# Hisaab - Accounting System API Documentation

## Overview
Complete Indian accounting system with GST, TDS, TCS compliance.

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All endpoints (except auth) require Bearer token:
```
Authorization: Bearer <token>
```

---

## 1. Authentication (`/auth`)

### POST `/auth/register`
Register new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

### POST `/auth/login`
Login user
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```
Response: `{ "access_token": "...", "token_type": "bearer" }`

---

## 2. Clients (`/clients`)

### GET `/clients` - List all clients (paginated)
Query params: `page`, `page_size`, `search`

### POST `/clients` - Create client
```json
{
  "name": "ABC Pvt Ltd",
  "gstin": "27AABCU9603R1Z1",
  "pan": "AABCU9603R",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "state_code": "27",
  "pincode": "400001",
  "email": "abc@example.com",
  "phone": "9876543210",
  "client_type": "B2B",
  "payment_terms": 30,
  "credit_limit": 100000
}
```

### GET `/clients/{id}` - Get client details
### PATCH `/clients/{id}` - Update client
### DELETE `/clients/{id}` - Delete client

---

## 3. Vendors (`/vendors`)

### GET `/vendors` - List all vendors
### POST `/vendors` - Create vendor
```json
{
  "name": "XYZ Suppliers",
  "gstin": "27AABCU9603R1Z2",
  "pan": "AABCU9603R",
  "address": "456 Supplier St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "state_code": "27",
  "pincode": "400002",
  "email": "xyz@example.com",
  "phone": "9876543211",
  "vendor_type": "GOODS",
  "tds_applicable": true,
  "tds_section": "194C"
}
```

### GET `/vendors/{id}` - Get vendor
### PATCH `/vendors/{id}` - Update vendor
### DELETE `/vendors/{id}` - Delete vendor

---

## 4. Purchase Orders (`/purchase-orders`)

### GET `/purchase-orders` - List POs
Query params: `client_id`, `status_filter`, `from_date`, `to_date`

### POST `/purchase-orders` - Create PO
```json
{
  "po_date": "2024-01-15",
  "client_id": 1,
  "reference_number": "REF123",
  "subject": "Office Supplies",
  "discount_percent": 5,
  "valid_until": "2024-02-15",
  "items": [
    {
      "serial_no": 1,
      "description": "Laptops",
      "hsn_sac": "8471",
      "quantity": 10,
      "unit": "NOS",
      "rate": 50000,
      "gst_rate": 18
    }
  ]
}
```

### GET `/purchase-orders/{id}` - Get PO
### PATCH `/purchase-orders/{id}/status` - Update PO status
### DELETE `/purchase-orders/{id}` - Delete PO (DRAFT only)

---

## 5. Invoices (`/invoices`)

### GET `/invoices` - List invoices
Query params: `invoice_type`, `client_id`, `vendor_id`, `status_filter`, `from_date`, `to_date`

### POST `/invoices` - Create invoice
```json
{
  "invoice_date": "2024-01-20",
  "invoice_type": "SALES",
  "client_id": 1,
  "place_of_supply": "Maharashtra",
  "place_of_supply_code": "27",
  "is_igst": false,
  "reverse_charge": false,
  "discount_percent": 0,
  "tds_applicable": false,
  "tds_rate": 0,
  "tcs_applicable": false,
  "tcs_rate": 0,
  "due_date": "2024-02-20",
  "items": [
    {
      "serial_no": 1,
      "description": "Software License",
      "hsn_sac": "998313",
      "quantity": 1,
      "unit": "NOS",
      "rate": 100000,
      "discount_percent": 0,
      "gst_rate": 18
    }
  ]
}
```

### GET `/invoices/{id}` - Get invoice
### PATCH `/invoices/{id}` - Update invoice (DRAFT only)
### PATCH `/invoices/{id}/status` - Update status
### DELETE `/invoices/{id}` - Delete invoice (DRAFT only)

**Invoice Types**: `SALES`, `PURCHASE`, `CREDIT_NOTE`, `DEBIT_NOTE`
**Invoice Status**: `DRAFT`, `SENT`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`

---

## 6. Payments (`/payments`)

### GET `/payments` - List payments
Query params: `payment_type`, `client_id`, `vendor_id`, `from_date`, `to_date`

### POST `/payments` - Create payment
```json
{
  "payment_date": "2024-01-25",
  "payment_type": "RECEIPT",
  "client_id": 1,
  "invoice_id": 1,
  "gross_amount": 118000,
  "tds_amount": 0,
  "tcs_amount": 0,
  "payment_mode": "BANK_TRANSFER",
  "reference_number": "TXN123456",
  "bank_name": "HDFC Bank",
  "notes": "Payment received"
}
```

### GET `/payments/{id}` - Get payment
### PATCH `/payments/{id}` - Update payment
### DELETE `/payments/{id}` - Delete payment

**Payment Types**: `RECEIPT` (from customer), `PAYMENT` (to vendor)
**Payment Modes**: `CASH`, `BANK_TRANSFER`, `CHEQUE`, `UPI`, `CARD`

---

## 7. Reports (`/reports`)

### GET `/reports/dashboard` - Dashboard statistics
Returns: receivables, payables, revenue, expenses, GST liability, TDS liability

### GET `/reports/gst-summary` - GST Summary
Query params: `from_date`, `to_date`
Returns: Output tax, Input tax, Net liability

### GET `/reports/tds-summary` - TDS Summary
Query params: `from_date`, `to_date`
Returns: TDS deducted by section

### GET `/reports/aging` - Aging Report
Query params: `report_type` (receivables/payables), `as_on_date`
Returns: Aging buckets (current, 30-60, 60-90, 90+)

### GET `/reports/gstr-1` - GSTR-1 Report
Query params: `from_date`, `to_date`
Returns: B2B, B2C Large, B2C Small, Credit/Debit Notes, HSN Summary

### GET `/reports/gstr-3b` - GSTR-3B Report
Query params: `from_date`, `to_date`
Returns: Outward supplies, ITC, Net tax liability

---

## 8. Ledger (`/ledger`)

### Chart of Accounts

#### GET `/ledger/accounts` - List accounts
Query params: `page`, `page_size`, `account_type`, `account_group`, `is_active`

#### POST `/ledger/accounts` - Create account
```json
{
  "code": "1000",
  "name": "Cash",
  "account_type": "ASSET",
  "account_group": "CASH_BANK",
  "description": "Cash in hand"
}
```

#### GET `/ledger/accounts/{id}` - Get account
#### PATCH `/ledger/accounts/{id}` - Update account
#### DELETE `/ledger/accounts/{id}` - Delete account

**Account Types**: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`

**Account Groups**:
- Assets: `CASH_BANK`, `ACCOUNTS_RECEIVABLE`, `INVENTORY`, `FIXED_ASSETS`, `OTHER_ASSETS`
- Liabilities: `ACCOUNTS_PAYABLE`, `DUTIES_TAXES`, `LOANS`, `OTHER_LIABILITIES`
- Equity: `CAPITAL`, `RESERVES`
- Revenue: `SALES`, `OTHER_INCOME`
- Expenses: `PURCHASE`, `DIRECT_EXPENSES`, `INDIRECT_EXPENSES`

### Ledger Entries

#### GET `/ledger/entries` - List entries
Query params: `account_id`, `from_date`, `to_date`, `reference_type`, `client_id`, `vendor_id`

#### POST `/ledger/journal-entry` - Create manual journal entry
```json
{
  "entry_date": "2024-01-20",
  "narration": "Office rent paid",
  "items": [
    {
      "account_id": 50,
      "debit": 10000,
      "credit": 0,
      "narration": "Rent expense"
    },
    {
      "account_id": 1,
      "debit": 0,
      "credit": 10000,
      "narration": "Cash paid"
    }
  ]
}
```

### Reports

#### GET `/ledger/statement/{account_id}` - Ledger statement
Query params: `from_date`, `to_date`
Returns: Opening balance, entries, closing balance

#### GET `/ledger/trial-balance` - Trial balance
Query params: `as_on_date`
Returns: All account balances (debit/credit)

---

## 9. Settings (`/settings`)

### GET `/settings` - Get company settings

### POST `/settings` - Create settings (first time)
```json
{
  "company_name": "My Company Pvt Ltd",
  "gstin": "27AABCU9603R1Z1",
  "pan": "AABCU9603R",
  "address": "123 Business St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "state_code": "27",
  "pincode": "400001",
  "email": "info@mycompany.com",
  "phone": "9876543210",
  "bank_name": "HDFC Bank",
  "bank_account_number": "12345678901",
  "bank_ifsc": "HDFC0001234",
  "default_gst_rate": 18,
  "enable_tds": true,
  "enable_tcs": false,
  "invoice_prefix": "INV"
}
```

### PATCH `/settings` - Update settings
### PATCH `/settings/{id}` - Update by ID

---

## Data Models Summary

### Indian Accounting Features

1. **GST Calculation**:
   - Supports CGST/SGST (intra-state) and IGST (inter-state)
   - Cess support
   - Reverse charge mechanism
   - Place of supply tracking

2. **TDS (Tax Deducted at Source)**:
   - Section-wise TDS tracking
   - TDS deduction from payments
   - TDS reports

3. **TCS (Tax Collected at Source)**:
   - TCS collection support
   - TCS reports

4. **Client Types**:
   - B2B (Business to Business)
   - B2C (Business to Consumer)
   - B2G (Business to Government)
   - SEZ (Special Economic Zone)
   - EXPORT

5. **Financial Year**:
   - April to March (Indian FY)
   - Auto-generated document numbers with FY prefix

---

## Next Steps for Frontend

### Remaining Frontend Components:

1. **Invoice Form** (`frontend/src/pages/invoices/InvoiceForm.tsx`)
   - Multi-item invoice creation
   - GST rate selection
   - TDS/TCS options
   - Place of supply
   - Auto-calculation of amounts

2. **Payment Form** (`frontend/src/pages/payments/PaymentForm.tsx`)
   - Link to invoice
   - TDS deduction
   - Multiple payment modes
   - Bank details

3. **Ledger Page** (`frontend/src/pages/ledger/Ledger.tsx`)
   - Chart of accounts management
   - Journal entry creation
   - Ledger statement view
   - Trial balance

4. **GST Reports Page** (`frontend/src/pages/reports/GSTReports.tsx`)
   - GSTR-1 view
   - GSTR-3B view
   - Export to Excel
   - Period selection

5. **Reports Page** (`frontend/src/pages/reports/Reports.tsx`)
   - Dashboard statistics
   - Aging reports
   - P&L statement
   - Balance sheet

6. **Update API Services** (`frontend/src/services/api.ts`)
   - Add ledger API calls
   - Add settings API calls
   - Add new report APIs

7. **Update Routing** (`frontend/src/App.tsx`)
   - Add routes for new pages
   - Protected routes

---

## Database Migrations

Before running the backend, create database migrations for new models:

```bash
cd backend
alembic revision --autogenerate -m "Add ledger and settings models"
alembic upgrade head
```

---

## Testing the APIs

You can test all APIs using:
1. **Swagger UI**: http://localhost:8000/api/v1/docs
2. **Postman**: Import the endpoints
3. **Frontend**: Use the React components

---

## Notes

- All monetary values are stored as `Decimal` for precision
- Dates follow ISO 8601 format (YYYY-MM-DD)
- GST rates are in percentage (18 means 18%)
- Document numbers auto-generate with financial year prefix
- Double-entry bookkeeping will be auto-created (service pending)

---

## Support

For issues or questions, refer to the codebase or create an issue in your repository.
