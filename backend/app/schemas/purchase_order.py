from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

from app.models.purchase_order import POStatus
from app.schemas.client import ClientResponse
from app.schemas.branch import BranchResponse


class PurchaseOrderItemBase(BaseModel):
    serial_no: int
    description: str
    hsn_sac: Optional[str] = None
    quantity: Decimal
    unit: str = "NOS"
    rate: Decimal
    gst_rate: Decimal = Decimal("18")
    cess_rate: Decimal = Decimal("0")


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: int
    po_id: int
    amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    cess_amount: Decimal
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    po_date: date
    reference_number: Optional[str] = None
    client_id: int
    branch_id: Optional[int] = None
    subject: Optional[str] = None
    discount_percent: Decimal = Decimal("0")
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    valid_until: Optional[date] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderUpdate(BaseModel):
    po_date: Optional[date] = None
    reference_number: Optional[str] = None
    client_id: Optional[int] = None
    branch_id: Optional[int] = None
    subject: Optional[str] = None
    discount_percent: Optional[Decimal] = None
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None
    valid_until: Optional[date] = None
    status: Optional[POStatus] = None
    items: Optional[List[PurchaseOrderItemCreate]] = None


class POStatusUpdate(BaseModel):
    """Schema for updating purchase order status."""
    status: POStatus


class PurchaseOrderResponse(PurchaseOrderBase):
    id: int
    po_number: str
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    cess_amount: Decimal
    total_amount: Decimal
    status: POStatus
    items: List[PurchaseOrderItemResponse]
    client: Optional[ClientResponse] = None
    branch: Optional[BranchResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
