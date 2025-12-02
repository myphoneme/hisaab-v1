from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

from app.models.invoice import InvoiceType, InvoiceStatus
from app.schemas.client import ClientResponse
from app.schemas.vendor import VendorResponse
from app.schemas.branch import BranchResponse


class InvoiceItemBase(BaseModel):
    serial_no: int
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal
    unit: str = "NOS"
    rate: Decimal
    discount_percent: Decimal = Decimal("0")
    gst_rate: Decimal = Decimal("18")
    cess_rate: Decimal = Decimal("0")


class InvoiceItemCreate(InvoiceItemBase):
    pass


class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int
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


class InvoiceBase(BaseModel):
    invoice_date: date
    invoice_type: InvoiceType
    client_id: Optional[int] = None
    vendor_id: Optional[int] = None
    branch_id: Optional[int] = None
    po_id: Optional[int] = None
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
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None


class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]


class InvoiceUpdate(BaseModel):
    invoice_date: Optional[date] = None
    client_id: Optional[int] = None
    vendor_id: Optional[int] = None
    branch_id: Optional[int] = None
    po_id: Optional[int] = None
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
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    status: Optional[InvoiceStatus] = None
    items: Optional[List[InvoiceItemCreate]] = None


class InvoiceResponse(InvoiceBase):
    id: int
    invoice_number: str
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
    amount_due: Decimal
    amount_paid: Decimal
    irn: Optional[str]
    ack_number: Optional[str]
    ack_date: Optional[date]
    status: InvoiceStatus
    is_posted: bool = False
    items: List[InvoiceItemResponse]
    client: Optional[ClientResponse] = None
    vendor: Optional[VendorResponse] = None
    branch: Optional[BranchResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
