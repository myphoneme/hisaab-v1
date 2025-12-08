from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class PIStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    GENERATED = "GENERATED"  # Invoice has been generated from this PI
    CANCELLED = "CANCELLED"


class ProformaInvoice(BaseModel):
    """Proforma Invoice - Preliminary invoice before final invoice generation"""
    __tablename__ = "proforma_invoices"

    # PI Details
    pi_number = Column(String(50), unique=True, nullable=False, index=True)
    pi_date = Column(Date, nullable=False)

    # Client
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    # Branch
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    # Bank Account (for printing on PI)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True, index=True)

    # Reference to Client PO and Billing Schedule
    client_po_id = Column(Integer, ForeignKey("client_pos.id"), nullable=True)
    billing_schedule_id = Column(Integer, ForeignKey("billing_schedules.id"), nullable=True)

    # GST Details
    place_of_supply = Column(String(100), nullable=False)
    place_of_supply_code = Column(String(2), nullable=False)
    is_igst = Column(Boolean, default=False, nullable=False)  # True if inter-state
    reverse_charge = Column(Boolean, default=False, nullable=False)

    # Amounts
    subtotal = Column(Numeric(15, 2), default=0, nullable=False)
    discount_percent = Column(Numeric(5, 2), default=0, nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0, nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=0, nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    igst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    cess_amount = Column(Numeric(15, 2), default=0, nullable=False)
    round_off = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # TDS (Tax Deducted at Source)
    tds_applicable = Column(Boolean, default=False, nullable=False)
    tds_section = Column(String(10), nullable=True)
    tds_rate = Column(Numeric(5, 2), default=0, nullable=False)
    tds_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # TCS (Tax Collected at Source)
    tcs_applicable = Column(Boolean, default=False, nullable=False)
    tcs_rate = Column(Numeric(5, 2), default=0, nullable=False)
    tcs_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # Net Amount after TDS
    amount_after_tds = Column(Numeric(15, 2), default=0, nullable=False)

    # Dates
    due_date = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=True)  # PI validity

    # Status
    status = Column(Enum(PIStatus), default=PIStatus.DRAFT, nullable=False)

    # Generated Invoice Reference (populated when invoice is generated from this PI)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    # Additional Info
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)

    # Relationships
    client = relationship("Client")
    branch = relationship("Branch")
    bank_account = relationship("BankAccount")
    client_po = relationship("ClientPO")
    billing_schedule = relationship("BillingSchedule", foreign_keys=[billing_schedule_id])
    invoice = relationship("Invoice", foreign_keys=[invoice_id])
    items = relationship("ProformaInvoiceItem", back_populates="proforma_invoice", cascade="all, delete-orphan")


class ProformaInvoiceItem(BaseModel):
    """Line items for Proforma Invoice"""
    __tablename__ = "proforma_invoice_items"

    # Parent
    proforma_invoice_id = Column(Integer, ForeignKey("proforma_invoices.id", ondelete="CASCADE"), nullable=False)

    # Item Master Reference (optional)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    item_name = Column(String(255), nullable=True)

    # Item Details
    serial_no = Column(Integer, nullable=False)
    description = Column(String(500), nullable=False)
    hsn_sac = Column(String(8), nullable=True)

    # Quantity & Rate
    quantity = Column(Numeric(15, 3), nullable=False)
    unit = Column(String(20), default="NOS", nullable=False)
    rate = Column(Numeric(15, 2), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)

    # Discount
    discount_percent = Column(Numeric(5, 2), default=0, nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0, nullable=False)
    taxable_amount = Column(Numeric(15, 2), nullable=False)

    # Tax
    gst_rate = Column(Numeric(5, 2), default=18, nullable=False)
    cgst_rate = Column(Numeric(5, 2), default=9, nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    sgst_rate = Column(Numeric(5, 2), default=9, nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    igst_rate = Column(Numeric(5, 2), default=0, nullable=False)
    igst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    cess_rate = Column(Numeric(5, 2), default=0, nullable=False)
    cess_amount = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)

    # Relationships
    proforma_invoice = relationship("ProformaInvoice", back_populates="items")
