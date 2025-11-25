from sqlalchemy import Column, String, Boolean, Integer, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class VendorType(str, enum.Enum):
    GOODS = "GOODS"
    SERVICES = "SERVICES"
    BOTH = "BOTH"


class Vendor(BaseModel):
    __tablename__ = "vendors"

    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=True)

    # Tax Information
    gstin = Column(String(15), nullable=True, index=True)
    pan = Column(String(10), nullable=False, index=True)

    # Address
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    state_code = Column(String(2), nullable=False)
    pincode = Column(String(6), nullable=False)
    country = Column(String(100), default="India", nullable=False)

    # Contact Information
    email = Column(String(255), nullable=False)
    phone = Column(String(15), nullable=False)
    contact_person = Column(String(255), nullable=True)

    # Classification
    vendor_type = Column(Enum(VendorType), default=VendorType.BOTH, nullable=False)

    # Bank Details
    bank_name = Column(String(255), nullable=True)
    bank_account = Column(String(50), nullable=True)
    bank_ifsc = Column(String(11), nullable=True)
    bank_branch = Column(String(255), nullable=True)

    # Terms
    payment_terms = Column(Integer, default=30, nullable=False)

    # TDS Settings
    tds_applicable = Column(Boolean, default=True, nullable=False)
    tds_section = Column(String(10), nullable=True)  # e.g., 194C, 194J

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    invoices = relationship("Invoice", back_populates="vendor")
    payments = relationship("Payment", back_populates="vendor")
