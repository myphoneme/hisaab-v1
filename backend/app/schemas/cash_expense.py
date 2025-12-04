from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

from app.schemas.expense_category import ExpenseCategoryResponse
from app.schemas.project import ProjectResponse
from app.schemas.branch import BranchResponse
from app.schemas.bank_account import BankAccountResponse


class CashExpenseBase(BaseModel):
    transaction_date: date
    expense_category_id: Optional[int] = None
    bank_account_id: int
    project_id: Optional[int] = None
    branch_id: Optional[int] = None
    amount: Decimal
    transaction_type: str  # DEBIT or CREDIT
    transaction_ref: Optional[str] = None  # UPI UTR, Bank Ref, Cheque No, etc.
    description: Optional[str] = None


class CashExpenseCreate(CashExpenseBase):
    pass


class CashExpenseUpdate(BaseModel):
    transaction_date: Optional[date] = None
    expense_category_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    project_id: Optional[int] = None
    branch_id: Optional[int] = None
    amount: Optional[Decimal] = None
    transaction_type: Optional[str] = None
    transaction_ref: Optional[str] = None
    description: Optional[str] = None


class CashExpenseResponse(CashExpenseBase):
    id: int
    expense_number: str
    financial_year: str
    expense_category: Optional[ExpenseCategoryResponse] = None
    project: Optional[ProjectResponse] = None
    branch: Optional[BranchResponse] = None
    bank_account: Optional[BankAccountResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
