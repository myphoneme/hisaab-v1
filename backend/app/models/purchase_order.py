from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class POStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    PARTIAL = "PARTIAL"  # Partially fulfilled
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"


class PurchaseOrder(BaseModel):
    __tablename__ = "purchase_orders"

    # PO Details
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    po_date = Column(Date, nullable=False)
    reference_number = Column(String(100), nullable=True)  # Client's reference

    # Client
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    # Branch
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    # Subject/Description
    subject = Column(String(500), nullable=True)

    # Amounts
    subtotal = Column(Numeric(15, 2), default=0, nullable=False)
    discount_percent = Column(Numeric(5, 2), default=0, nullable=False)
    discount_amount = Column(Numeric(15, 2), default=0, nullable=False)
    taxable_amount = Column(Numeric(15, 2), default=0, nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    igst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    cess_amount = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0, nullable=False)

    # Status
    status = Column(Enum(POStatus), default=POStatus.DRAFT, nullable=False)

    # Additional Info
    notes = Column(Text, nullable=True)
    terms_conditions = Column(Text, nullable=True)

    # Validity
    valid_until = Column(Date, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="purchase_orders")
    branch = relationship("Branch", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="purchase_order")


class PurchaseOrderItem(BaseModel):
    __tablename__ = "purchase_order_items"

    # Parent
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)

    # Item Details
    serial_no = Column(Integer, nullable=False)
    description = Column(String(500), nullable=False)
    hsn_sac = Column(String(8), nullable=True)  # HSN for goods, SAC for services

    # Quantity & Rate
    quantity = Column(Numeric(15, 3), nullable=False)
    unit = Column(String(20), default="NOS", nullable=False)
    rate = Column(Numeric(15, 2), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)

    # Tax
    gst_rate = Column(Numeric(5, 2), default=18, nullable=False)
    cgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    sgst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    igst_amount = Column(Numeric(15, 2), default=0, nullable=False)
    cess_rate = Column(Numeric(5, 2), default=0, nullable=False)
    cess_amount = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="items")
