from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from app.models.billing_schedule import ScheduleStatus


class BillingScheduleBase(BaseModel):
    installment_number: int
    description: Optional[str] = None
    due_date: date
    amount: Decimal = Decimal("0")
    gst_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    notes: Optional[str] = None


class BillingScheduleCreate(BillingScheduleBase):
    client_po_id: int


class BillingScheduleUpdate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[date] = None
    amount: Optional[Decimal] = None
    gst_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    notes: Optional[str] = None


class BillingScheduleStatusUpdate(BaseModel):
    status: ScheduleStatus


class BillingScheduleResponse(BillingScheduleBase):
    id: int
    client_po_id: int
    status: ScheduleStatus
    proforma_invoice_id: Optional[int]
    invoice_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BillingScheduleWithPOResponse(BillingScheduleResponse):
    client_po_internal_number: Optional[str] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


class GenerateSchedulesRequest(BaseModel):
    """Request to auto-generate billing schedules from Client PO"""
    start_date: date
    end_date: Optional[date] = None
    custom_amounts: Optional[dict] = None  # { installment_number: amount }


class CreateInvoiceFromScheduleRequest(BaseModel):
    """Request to create invoice from a billing schedule"""
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    bank_account_id: Optional[int] = None
    notes: Optional[str] = None
