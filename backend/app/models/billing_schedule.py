import enum
from sqlalchemy import Column, String, Integer, Numeric, Enum, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ScheduleStatus(str, enum.Enum):
    PENDING = "PENDING"
    PI_RAISED = "PI_RAISED"  # Proforma Invoice raised
    INVOICED = "INVOICED"
    CANCELLED = "CANCELLED"


class BillingSchedule(BaseModel):
    """Billing schedule entries for Client POs with recurring billing"""
    __tablename__ = "billing_schedules"

    client_po_id = Column(Integer, ForeignKey("client_pos.id", ondelete="CASCADE"), nullable=False)

    installment_number = Column(Integer, nullable=False)
    description = Column(String(255), nullable=True)  # e.g., "Monthly - January 2025"

    due_date = Column(Date, nullable=False)

    # Amounts
    amount = Column(Numeric(15, 2), default=0, nullable=False)
    gst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # Status
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.PENDING, nullable=False)

    # Links to PI/Invoice (will be populated when PI/Invoice is created)
    # Note: proforma_invoice_id has no FK constraint as proforma_invoices table doesn't exist yet
    proforma_invoice_id = Column(Integer, nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    notes = Column(Text, nullable=True)

    # Relationships
    client_po = relationship("ClientPO", back_populates="billing_schedules")
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
