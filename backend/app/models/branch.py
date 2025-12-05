from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Branch(BaseModel):
    __tablename__ = "branches"

    # Basic Information
    branch_name = Column(String(255), nullable=False, index=True)
    branch_code = Column(String(50), unique=True, nullable=False, index=True)

    # GST & Tax Details (Branch-specific)
    gstin = Column(String(15), nullable=False, unique=True, index=True)  # 15-char GSTIN
    state = Column(String(100), nullable=False)
    state_code = Column(String(2), nullable=False)  # 2-digit state code for GST

    # Address
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    pincode = Column(String(6), nullable=False)

    # Contact Information
    email = Column(String(255), nullable=True)
    phone = Column(String(15), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_head_office = Column(Boolean, default=False, nullable=False)

    # Relationships
    bank_accounts = relationship("BankAccount", back_populates="branch", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="branch")
    payments = relationship("Payment", back_populates="branch")
    purchase_orders = relationship("PurchaseOrder", back_populates="branch")
    ledger_entries = relationship("LedgerEntry", back_populates="branch")
    client_pos = relationship("ClientPO", back_populates="branch")
