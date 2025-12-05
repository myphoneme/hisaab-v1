from sqlalchemy import Column, String, Boolean, Numeric, Integer, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class ClientType(str, enum.Enum):
    B2B = "B2B"  # Business to Business
    B2C = "B2C"  # Business to Consumer
    B2G = "B2G"  # Business to Government
    SEZ = "SEZ"  # Special Economic Zone
    EXPORT = "EXPORT"  # Export


class Client(BaseModel):
    __tablename__ = "clients"

    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=True)  # Client code for reference

    # Tax Information
    gstin = Column(String(15), nullable=True, index=True)  # 15-char GSTIN
    pan = Column(String(10), nullable=False, index=True)  # 10-char PAN

    # Address
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    state_code = Column(String(2), nullable=False)  # 2-digit state code for GST
    pincode = Column(String(6), nullable=False)
    country = Column(String(100), default="India", nullable=False)

    # Contact Information
    email = Column(String(255), nullable=False)
    phone = Column(String(15), nullable=False)
    contact_person = Column(String(255), nullable=True)

    # Classification
    client_type = Column(Enum(ClientType), default=ClientType.B2B, nullable=False)

    # Financial Terms
    credit_limit = Column(Numeric(15, 2), default=0, nullable=False)
    payment_terms = Column(Integer, default=30, nullable=False)  # Days

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    purchase_orders = relationship("PurchaseOrder", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")
    payments = relationship("Payment", back_populates="client")
    client_pos = relationship("ClientPO", back_populates="client")
