from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class ChartOfAccountBase(BaseModel):
    code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=255)
    account_type: str
    account_group: str
    parent_id: Optional[int] = None
    description: Optional[str] = None
    is_active: bool = True


class ChartOfAccountCreate(ChartOfAccountBase):
    pass


class ChartOfAccountUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    parent_id: Optional[int] = None


class ChartOfAccountResponse(ChartOfAccountBase):
    id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LedgerEntryBase(BaseModel):
    entry_date: date
    account_id: int
    debit: Decimal = Field(default=Decimal('0'), ge=0)
    credit: Decimal = Field(default=Decimal('0'), ge=0)
    narration: Optional[str] = None
    client_id: Optional[int] = None
    vendor_id: Optional[int] = None


class LedgerEntryCreate(LedgerEntryBase):
    voucher_number: str
    reference_type: str
    reference_id: Optional[int] = None
    financial_year: str


class LedgerEntryResponse(LedgerEntryBase):
    id: int
    voucher_number: str
    reference_type: str
    reference_id: Optional[int] = None
    financial_year: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JournalEntryItem(BaseModel):
    account_id: int
    debit: Decimal = Field(default=Decimal('0'), ge=0)
    credit: Decimal = Field(default=Decimal('0'), ge=0)
    narration: Optional[str] = None


class JournalEntryCreate(BaseModel):
    entry_date: date
    voucher_number: Optional[str] = None
    narration: str
    items: list[JournalEntryItem]


class LedgerFilter(BaseModel):
    account_id: Optional[int] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    client_id: Optional[int] = None
    vendor_id: Optional[int] = None
    reference_type: Optional[str] = None


class LedgerStatement(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    opening_balance: Decimal
    total_debit: Decimal
    total_credit: Decimal
    closing_balance: Decimal
    entries: list[LedgerEntryResponse]


class TrialBalanceItem(BaseModel):
    account_code: str
    account_name: str
    account_type: str
    account_group: str
    debit: Decimal
    credit: Decimal


class TrialBalance(BaseModel):
    as_on_date: date
    accounts: list[TrialBalanceItem]
    total_debit: Decimal
    total_credit: Decimal
