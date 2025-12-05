import enum
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, Enum, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class ClientPOStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PARTIAL = "PARTIAL"  # Partially invoiced
    COMPLETED = "COMPLETED"  # Fully invoiced
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class BillingFrequency(str, enum.Enum):
    ONE_TIME = "ONE_TIME"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    HALF_YEARLY = "HALF_YEARLY"
    YEARLY = "YEARLY"
    MILESTONE = "MILESTONE"  # Manual milestones


class ClientPO(BaseModel):
    """Client Purchase Order - Sales Order received from clients"""
    __tablename__ = "client_pos"

    # Internal numbering
    internal_number = Column(String(50), unique=True, nullable=False, index=True)  # CPO/2024-25/0001

    # Client's PO details
    client_po_number = Column(String(100), nullable=True)  # Client's PO number
    client_po_date = Column(Date, nullable=True)
    received_date = Column(Date, nullable=False)

    # Relations
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)

    # Description
    subject = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Validity
    valid_from = Column(Date, nullable=False)
    valid_until = Column(Date, nullable=True)

    # Billing settings
    billing_frequency = Column(Enum(BillingFrequency), default=BillingFrequency.ONE_TIME, nullable=False)

    # Place of Supply (for GST)
    place_of_supply = Column(String(100), nullable=True)
    place_of_supply_code = Column(String(2), nullable=True)
    is_igst = Column(Boolean, default=False, nullable=False)

    # Amounts
    subtotal = Column(Numeric(15, 2), default=0, nullable=False)
    discount_percent = Column(Numeric(5, 2), default=0, nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0, nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=0, nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    igst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # Fulfillment tracking
    invoiced_amount = Column(Numeric(15, 2), default=0, nullable=False)
    remaining_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # Status
    status = Column(Enum(ClientPOStatus), default=ClientPOStatus.DRAFT, nullable=False)

    # Relationships
    client = relationship("Client", back_populates="client_pos")
    branch = relationship("Branch", back_populates="client_pos")
    items = relationship("ClientPOItem", back_populates="client_po", cascade="all, delete-orphan")
    billing_schedules = relationship("BillingSchedule", back_populates="client_po", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="client_po")


class ClientPOItem(BaseModel):
    """Line items in a Client PO"""
    __tablename__ = "client_po_items"

    client_po_id = Column(Integer, ForeignKey("client_pos.id", ondelete="CASCADE"), nullable=False)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=True)  # Optional link to Item Master

    serial_no = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    hsn_sac = Column(String(8), nullable=True)

    quantity = Column(Numeric(15, 3), default=1, nullable=False)
    unit = Column(String(20), default="NOS", nullable=False)
    rate = Column(Numeric(15, 2), default=0, nullable=False)
    amount = Column(Numeric(15, 2), default=0, nullable=False)

    # GST
    gst_rate = Column(Numeric(5, 2), default=18, nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    igst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # Fulfillment tracking
    invoiced_quantity = Column(Numeric(15, 3), default=0, nullable=False)
    remaining_quantity = Column(Numeric(15, 3), default=0, nullable=False)

    # Relationships
    client_po = relationship("ClientPO", back_populates="items")
    item = relationship("Item")
