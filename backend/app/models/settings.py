from sqlalchemy import Column, String, Text, Boolean, Integer
from app.models.base import BaseModel


class CompanySettings(BaseModel):
    __tablename__ = "company_settings"

    # Company Information
    company_name = Column(String(255), nullable=False)
    company_logo = Column(Text, nullable=True)  # Base64 or URL

    # GST & Tax Details
    gstin = Column(String(15), nullable=True)
    pan = Column(String(10), nullable=False)
    tan = Column(String(10), nullable=True)
    cin = Column(String(21), nullable=True)

    # Address
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    state_code = Column(String(2), nullable=False)
    pincode = Column(String(10), nullable=False)
    country = Column(String(100), default="India", nullable=False)

    # Contact Information
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    website = Column(String(255), nullable=True)

    # Bank Details
    bank_name = Column(String(255), nullable=True)
    bank_account_number = Column(String(50), nullable=True)
    bank_ifsc = Column(String(11), nullable=True)
    bank_branch = Column(String(255), nullable=True)
    bank_account_type = Column(String(50), nullable=True)

    # Financial Year Settings
    financial_year_start_month = Column(Integer, default=4, nullable=False)  # April = 4

    # Preferences
    default_currency = Column(String(3), default="INR", nullable=False)
    default_gst_rate = Column(Integer, default=18, nullable=False)
    enable_tds = Column(Boolean, default=True, nullable=False)
    enable_tcs = Column(Boolean, default=False, nullable=False)

    # Invoice Settings
    invoice_prefix = Column(String(10), default="INV", nullable=False)
    invoice_terms = Column(Text, nullable=True)
    invoice_notes = Column(Text, nullable=True)

    # System Settings
    enable_multi_currency = Column(Boolean, default=False, nullable=False)
    enable_inventory = Column(Boolean, default=False, nullable=False)

    # Only one company settings record should exist
    is_active = Column(Boolean, default=True, nullable=False)
