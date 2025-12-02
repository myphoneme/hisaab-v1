from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

from app.models.payment import PaymentType, PaymentMode, PaymentStatus
from app.schemas.client import ClientResponse
from app.schemas.vendor import VendorResponse
from app.schemas.branch import BranchResponse
from app.schemas.bank_account import BankAccountResponse


class PaymentBase(BaseModel):
    payment_date: date
    payment_type: PaymentType
    client_id: Optional[int] = None
    vendor_id: Optional[int] = None
    branch_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    invoice_id: Optional[int] = None
    gross_amount: Decimal
    tds_amount: Decimal = Decimal("0")
    tcs_amount: Decimal = Decimal("0")
    payment_mode: PaymentMode
    reference_number: Optional[str] = None
    cheque_date: Optional[date] = None
    notes: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    payment_date: Optional[date] = None
    client_id: Optional[int] = None
    vendor_id: Optional[int] = None
    branch_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    invoice_id: Optional[int] = None
    gross_amount: Optional[Decimal] = None
    tds_amount: Optional[Decimal] = None
    tcs_amount: Optional[Decimal] = None
    payment_mode: Optional[PaymentMode] = None
    reference_number: Optional[str] = None
    cheque_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[PaymentStatus] = None


class PaymentResponse(PaymentBase):
    id: int
    payment_number: str
    net_amount: Decimal
    status: PaymentStatus
    is_posted: bool = False
    client: Optional[ClientResponse] = None
    vendor: Optional[VendorResponse] = None
    branch: Optional[BranchResponse] = None
    bank_account_ref: Optional[BankAccountResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
