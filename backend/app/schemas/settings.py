from pydantic import BaseModel, EmailStr, Field, field_serializer
from typing import Optional
from datetime import datetime


class CompanySettingsBase(BaseModel):
    # Company Information
    company_name: str = Field(..., max_length=255)
    company_logo: Optional[str] = None

    # GST & Tax Details
    gstin: Optional[str] = Field(None, max_length=15)
    pan: str = Field(..., max_length=10)
    tan: Optional[str] = Field(None, max_length=10)
    cin: Optional[str] = Field(None, max_length=21)

    # Address
    address: str
    city: str = Field(..., max_length=100)
    state: str = Field(..., max_length=100)
    state_code: str = Field(..., max_length=2)
    pincode: str = Field(..., max_length=10)
    country: str = Field(default="India", max_length=100)

    # Contact Information
    email: EmailStr
    phone: str = Field(..., max_length=20)
    website: Optional[str] = Field(None, max_length=255)

    # Bank Details
    bank_name: Optional[str] = Field(None, max_length=255)
    bank_account_number: Optional[str] = Field(None, max_length=50)
    bank_ifsc: Optional[str] = Field(None, max_length=11)
    bank_branch: Optional[str] = Field(None, max_length=255)
    bank_account_type: Optional[str] = Field(None, max_length=50)

    # Financial Year Settings
    financial_year_start_month: int = Field(default=4, ge=1, le=12)

    # Preferences
    default_currency: str = Field(default="INR", max_length=3)
    default_gst_rate: int = Field(default=18, ge=0, le=100)
    enable_tds: bool = True
    enable_tcs: bool = False

    # Invoice Settings
    invoice_prefix: str = Field(default="INV", max_length=10)
    invoice_terms: Optional[str] = None
    invoice_notes: Optional[str] = None

    # System Settings
    enable_multi_currency: bool = False
    enable_inventory: bool = False

    # Ledger Posting Settings
    ledger_posting_on: str = Field(default="ON_SENT", max_length=20)  # ON_CREATE or ON_SENT

    # Default GL Account IDs
    default_sales_account_id: Optional[int] = None
    default_purchase_account_id: Optional[int] = None
    default_ar_account_id: Optional[int] = None
    default_ap_account_id: Optional[int] = None
    default_cash_account_id: Optional[int] = None
    default_bank_account_id: Optional[int] = None
    default_cgst_output_account_id: Optional[int] = None
    default_sgst_output_account_id: Optional[int] = None
    default_igst_output_account_id: Optional[int] = None
    default_cgst_input_account_id: Optional[int] = None
    default_sgst_input_account_id: Optional[int] = None
    default_igst_input_account_id: Optional[int] = None
    default_tds_receivable_account_id: Optional[int] = None
    default_tds_payable_account_id: Optional[int] = None
    default_round_off_account_id: Optional[int] = None


class CompanySettingsCreate(CompanySettingsBase):
    pass


class CompanySettingsUpdate(BaseModel):
    # All fields optional for partial updates
    company_name: Optional[str] = Field(None, max_length=255)
    company_logo: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=15)
    pan: Optional[str] = Field(None, max_length=10)
    tan: Optional[str] = Field(None, max_length=10)
    cin: Optional[str] = Field(None, max_length=21)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    state_code: Optional[str] = Field(None, max_length=2)
    pincode: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    bank_name: Optional[str] = Field(None, max_length=255)
    bank_account_number: Optional[str] = Field(None, max_length=50)
    bank_ifsc: Optional[str] = Field(None, max_length=11)
    bank_branch: Optional[str] = Field(None, max_length=255)
    bank_account_type: Optional[str] = Field(None, max_length=50)
    financial_year_start_month: Optional[int] = Field(None, ge=1, le=12)
    default_currency: Optional[str] = Field(None, max_length=3)
    default_gst_rate: Optional[int] = Field(None, ge=0, le=100)
    enable_tds: Optional[bool] = None
    enable_tcs: Optional[bool] = None
    invoice_prefix: Optional[str] = Field(None, max_length=10)
    invoice_terms: Optional[str] = None
    invoice_notes: Optional[str] = None
    enable_multi_currency: Optional[bool] = None
    enable_inventory: Optional[bool] = None
    # Ledger Posting Settings
    ledger_posting_on: Optional[str] = Field(None, max_length=20)
    default_sales_account_id: Optional[int] = None
    default_purchase_account_id: Optional[int] = None
    default_ar_account_id: Optional[int] = None
    default_ap_account_id: Optional[int] = None
    default_cash_account_id: Optional[int] = None
    default_bank_account_id: Optional[int] = None
    default_cgst_output_account_id: Optional[int] = None
    default_sgst_output_account_id: Optional[int] = None
    default_igst_output_account_id: Optional[int] = None
    default_cgst_input_account_id: Optional[int] = None
    default_sgst_input_account_id: Optional[int] = None
    default_igst_input_account_id: Optional[int] = None
    default_tds_receivable_account_id: Optional[int] = None
    default_tds_payable_account_id: Optional[int] = None
    default_round_off_account_id: Optional[int] = None


class CompanySettingsResponse(CompanySettingsBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime, _info) -> str:
        return dt.isoformat() if dt else None

    class Config:
        from_attributes = True
