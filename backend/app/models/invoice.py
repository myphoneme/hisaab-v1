from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class InvoiceType(str, enum.Enum):
    SALES = "SALES"
    PURCHASE = "PURCHASE"
    CREDIT_NOTE = "CREDIT_NOTE"
    DEBIT_NOTE = "DEBIT_NOTE"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIAL = "PARTIAL"  # Partially paid
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class Invoice(BaseModel):
    __tablename__ = "invoices"

    # Invoice Details
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    invoice_date = Column(Date, nullable=False)
    invoice_type = Column(Enum(InvoiceType), nullable=False)

    # Client/Vendor
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    # Branch
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    # Bank Account (for printing on invoice)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=True, index=True)

    # Reference to PO (Purchase Order)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)

    # Reference to Client PO (Sales Order) and Billing Schedule
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
    tds_challan_id = Column(Integer, ForeignKey("tds_challans.id"), nullable=True, index=True)

    # TCS (Tax Collected at Source)
    tcs_applicable = Column(Boolean, default=False, nullable=False)
    tcs_rate = Column(Numeric(5, 2), default=0, nullable=False)
    tcs_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # Net Amounts
    amount_after_tds = Column(Numeric(15, 2), default=0, nullable=False)
    amount_due = Column(Numeric(15, 2), default=0, nullable=False)
    amount_paid = Column(Numeric(15, 2), default=0, nullable=False)

    # Dates
    due_date = Column(Date, nullable=False)

    # E-Invoice (IRN)
    irn = Column(String(64), nullable=True)  # Invoice Reference Number
    ack_number = Column(String(20), nullable=True)
    ack_date = Column(Date, nullable=True)
    signed_qr_code = Column(Text, nullable=True)

    # Status
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)

    # Ledger Posting
    is_posted = Column(Boolean, default=False, nullable=False)  # Track if ledger entries created

    # Additional Info
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="invoices")
    vendor = relationship("Vendor", back_populates="invoices")
    branch = relationship("Branch", back_populates="invoices")
    bank_account = relationship("BankAccount")
    purchase_order = relationship("PurchaseOrder", back_populates="invoices")
    client_po = relationship("ClientPO", back_populates="invoices")
    billing_schedule = relationship("BillingSchedule", foreign_keys=[billing_schedule_id])
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")
    attachments = relationship("InvoiceAttachment", back_populates="invoice", cascade="all, delete-orphan")
    tds_challan = relationship("TDSChallan", foreign_keys=[tds_challan_id])


class InvoiceItem(BaseModel):
    __tablename__ = "invoice_items"

    # Parent
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)

    # Item Master Reference (optional)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)
    item_name = Column(String(200), nullable=True)

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
    invoice = relationship("Invoice", back_populates="items")
