from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

from app.models.proforma_invoice import PIStatus
from app.schemas.client import ClientResponse
from app.schemas.branch import BranchResponse
from app.schemas.bank_account import BankAccountResponse


class PIItemBase(BaseModel):
    serial_no: int
    item_id: Optional[int] = None
    item_name: Optional[str] = None
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal
    unit: str = "NOS"
    rate: Decimal
    discount_percent: Decimal = Decimal("0")
    gst_rate: Decimal = Decimal("18")
    cess_rate: Decimal = Decimal("0")


class PIItemCreate(PIItemBase):
    pass


class PIItemResponse(PIItemBase):
    id: int
    proforma_invoice_id: int
    amount: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    cgst_rate: Decimal
    cgst_amount: Decimal
    sgst_rate: Decimal
    sgst_amount: Decimal
    igst_rate: Decimal
    igst_amount: Decimal
    cess_amount: Decimal
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PIBase(BaseModel):
    pi_date: date
    client_id: int
    branch_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    client_po_id: Optional[int] = None
    billing_schedule_id: Optional[int] = None
    place_of_supply: str
    place_of_supply_code: str
    is_igst: bool = False
    reverse_charge: bool = False
    discount_percent: Decimal = Decimal("0")
    tds_applicable: bool = False
    tds_section: Optional[str] = None
    tds_rate: Decimal = Decimal("0")
    tcs_applicable: bool = False
    tcs_rate: Decimal = Decimal("0")
    due_date: date
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None


class PICreate(PIBase):
    items: List[PIItemCreate]


class PIUpdate(BaseModel):
    pi_date: Optional[date] = None
    client_id: Optional[int] = None
    branch_id: Optional[int] = None
    bank_account_id: Optional[int] = None
    place_of_supply: Optional[str] = None
    place_of_supply_code: Optional[str] = None
    is_igst: Optional[bool] = None
    reverse_charge: Optional[bool] = None
    discount_percent: Optional[Decimal] = None
    tds_applicable: Optional[bool] = None
    tds_section: Optional[str] = None
    tds_rate: Optional[Decimal] = None
    tcs_applicable: Optional[bool] = None
    tcs_rate: Optional[Decimal] = None
    due_date: Optional[date] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    status: Optional[PIStatus] = None
    items: Optional[List[PIItemCreate]] = None


class PIResponse(PIBase):
    id: int
    pi_number: str
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    cess_amount: Decimal
    round_off: Decimal
    total_amount: Decimal
    tds_amount: Decimal
    tcs_amount: Decimal
    amount_after_tds: Decimal
    status: PIStatus
    invoice_id: Optional[int] = None
    items: List[PIItemResponse]
    client: Optional[ClientResponse] = None
    branch: Optional[BranchResponse] = None
    bank_account: Optional[BankAccountResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PIListResponse(BaseModel):
    """Lightweight response for listing PIs"""
    id: int
    pi_number: str
    pi_date: date
    client_id: int
    client_name: Optional[str] = None
    branch_id: Optional[int] = None
    total_amount: Decimal
    status: PIStatus
    invoice_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
