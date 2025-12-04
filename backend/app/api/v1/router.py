from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    clients,
    vendors,
    branches,
    bank_accounts,
    purchase_orders,
    invoices,
    invoice_attachments,
    payments,
    reports,
    ledger,
    settings,
    expense_categories,
    projects,
    cash_expenses,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(branches.router, prefix="/branches", tags=["Branches"])
api_router.include_router(bank_accounts.router, prefix="/bank-accounts", tags=["Bank Accounts"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["Purchase Orders"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(invoice_attachments.router, prefix="/invoices", tags=["Invoice Attachments"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(ledger.router, prefix="/ledger", tags=["Ledger"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(expense_categories.router, prefix="/expense-categories", tags=["Expense Categories"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(cash_expenses.router, prefix="/cash-expenses", tags=["Cash Expenses"])
