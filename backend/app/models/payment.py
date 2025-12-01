from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class PaymentType(str, enum.Enum):
    RECEIPT = "RECEIPT"  # Money received from client
    PAYMENT = "PAYMENT"  # Money paid to vendor


class PaymentMode(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    CHEQUE = "CHEQUE"
    UPI = "UPI"
    CARD = "CARD"
    NEFT = "NEFT"
    RTGS = "RTGS"
    IMPS = "IMPS"


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    BOUNCED = "BOUNCED"  # For cheque


class Payment(BaseModel):
    __tablename__ = "payments"

    # Payment Details
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    payment_date = Column(Date, nullable=False)
    payment_type = Column(Enum(PaymentType), nullable=False)

    # Client/Vendor
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    # Branch & Bank Account
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False, index=True)

    # Reference to Invoice
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)

    # Amounts
    gross_amount = Column(Numeric(15, 2), nullable=False)
    tds_amount = Column(Numeric(15, 2), default=0, nullable=False)
    tcs_amount = Column(Numeric(15, 2), default=0, nullable=False)
    net_amount = Column(Numeric(15, 2), nullable=False)

    # Payment Mode
    payment_mode = Column(Enum(PaymentMode), nullable=False)
    reference_number = Column(String(100), nullable=True)  # UTR, Cheque No, etc.

    # Bank Details
    bank_name = Column(String(255), nullable=True)
    bank_account = Column(String(50), nullable=True)

    # For Cheque
    cheque_date = Column(Date, nullable=True)

    # Status
    status = Column(Enum(PaymentStatus), default=PaymentStatus.COMPLETED, nullable=False)

    # Additional Info
    notes = Column(Text, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="payments")
    vendor = relationship("Vendor", back_populates="payments")
    branch = relationship("Branch", back_populates="payments")
    bank_account = relationship("BankAccount", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")
