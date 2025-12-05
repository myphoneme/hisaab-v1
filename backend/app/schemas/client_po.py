from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date, datetime
from decimal import Decimal
from app.models.client_po import ClientPOStatus, BillingFrequency


# ==================== Client PO Item Schemas ====================

class ClientPOItemBase(BaseModel):
    item_id: Optional[int] = None
    serial_no: int
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit: str = "NOS"
    rate: Decimal = Decimal("0")
    amount: Decimal = Decimal("0")
    gst_rate: Decimal = Decimal("18")
    cgst_amount: Decimal = Decimal("0")
    sgst_amount: Decimal = Decimal("0")
    igst_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")


class ClientPOItemCreate(ClientPOItemBase):
    pass


class ClientPOItemUpdate(BaseModel):
    item_id: Optional[int] = None
    serial_no: Optional[int] = None
    description: Optional[str] = None
    hsn_sac: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    rate: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    gst_rate: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None


class ClientPOItemResponse(ClientPOItemBase):
    id: int
    client_po_id: int
    invoiced_quantity: Decimal
    remaining_quantity: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Client PO Schemas ====================

class ClientPOBase(BaseModel):
    client_po_number: Optional[str] = None
    client_po_date: Optional[date] = None
    received_date: date
    client_id: int
    branch_id: Optional[int] = None
    subject: Optional[str] = None
    notes: Optional[str] = None
    valid_from: date
    valid_until: Optional[date] = None
    billing_frequency: BillingFrequency = BillingFrequency.ONE_TIME
    place_of_supply: Optional[str] = None
    place_of_supply_code: Optional[str] = None
    is_igst: bool = False
    discount_percent: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")


class ClientPOCreate(ClientPOBase):
    items: List[ClientPOItemCreate] = []


class ClientPOUpdate(BaseModel):
    client_po_number: Optional[str] = None
    client_po_date: Optional[date] = None
    received_date: Optional[date] = None
    client_id: Optional[int] = None
    branch_id: Optional[int] = None
    subject: Optional[str] = None
    notes: Optional[str] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    billing_frequency: Optional[BillingFrequency] = None
    place_of_supply: Optional[str] = None
    place_of_supply_code: Optional[str] = None
    is_igst: Optional[bool] = None
    discount_percent: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    items: Optional[List[ClientPOItemCreate]] = None


class ClientPOStatusUpdate(BaseModel):
    status: ClientPOStatus


class ClientPOResponse(ClientPOBase):
    id: int
    internal_number: str
    subtotal: Decimal
    taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_amount: Decimal
    invoiced_amount: Decimal
    remaining_amount: Decimal
    status: ClientPOStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientPOWithItemsResponse(ClientPOResponse):
    items: List[ClientPOItemResponse] = []
    client_name: Optional[str] = None
    branch_name: Optional[str] = None

    class Config:
        from_attributes = True


class ClientPOListResponse(BaseModel):
    id: int
    internal_number: str
    client_po_number: Optional[str]
    client_po_date: Optional[date]
    received_date: date
    client_id: int
    client_name: str
    branch_id: Optional[int]
    branch_name: Optional[str]
    subject: Optional[str]
    valid_from: date
    valid_until: Optional[date]
    billing_frequency: BillingFrequency
    total_amount: Decimal
    invoiced_amount: Decimal
    remaining_amount: Decimal
    status: ClientPOStatus
    created_at: datetime

    class Config:
        from_attributes = True
