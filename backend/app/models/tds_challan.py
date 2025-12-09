from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class TDSType(str, enum.Enum):
    PAYABLE = "PAYABLE"      # TDS you deduct from vendors (purchase invoices)
    RECEIVABLE = "RECEIVABLE"  # TDS clients deduct from you (sales invoices)


class TDSChallan(BaseModel):
    """TDS Challan - records TDS payment to government."""
    __tablename__ = "tds_challans"

    # Challan Identification
    challan_number = Column(String(50), nullable=False, index=True)
    bsr_code = Column(String(10), nullable=False)

    # Period
    financial_year = Column(String(9), nullable=False, index=True)  # "2024-2025"
    month = Column(Integer, nullable=False)  # 4-12, 1-3 (April=4, March=3)
    quarter = Column(Integer, nullable=False)  # 1, 2, 3, 4

    # Type
    tds_type = Column(Enum(TDSType), nullable=False, index=True)

    # Amounts
    tds_amount = Column(Numeric(15, 2), nullable=False, default=0)
    penalty = Column(Numeric(15, 2), default=0, nullable=False)
    interest = Column(Numeric(15, 2), default=0, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)

    # Payment Details
    payment_date = Column(Date, nullable=False)
    transaction_id = Column(String(50), nullable=True)

    # Branch (optional)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    # Challan Document
    challan_file_path = Column(String(500), nullable=True)
    challan_filename = Column(String(255), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    branch = relationship("Branch")
    entries = relationship("TDSChallanEntry", back_populates="challan", cascade="all, delete-orphan")


class TDSChallanEntry(BaseModel):
    """Individual entries in a TDS Challan - links invoices to challan."""
    __tablename__ = "tds_challan_entries"

    # Parent Challan
    challan_id = Column(Integer, ForeignKey("tds_challans.id"), nullable=False, index=True)

    # Invoice Reference
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)

    # Denormalized for reporting (avoid joins in reports)
    party_name = Column(String(200), nullable=False)
    party_pan = Column(String(10), nullable=True)
    invoice_number = Column(String(50), nullable=False)
    invoice_date = Column(Date, nullable=False)

    # Amounts
    base_amount = Column(Numeric(15, 2), nullable=False)  # Taxable amount
    tds_rate = Column(Numeric(5, 2), nullable=False)
    tds_section = Column(String(10), nullable=False)
    tds_amount = Column(Numeric(15, 2), nullable=False)
    penalty = Column(Numeric(15, 2), default=0, nullable=False)
    interest = Column(Numeric(15, 2), default=0, nullable=False)

    # Relationships
    challan = relationship("TDSChallan", back_populates="entries")
    invoice = relationship("Invoice")
