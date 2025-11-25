from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime

from app.models.vendor import VendorType


class VendorBase(BaseModel):
    name: str
    gstin: Optional[str] = None
    pan: str
    address: str
    city: str
    state: str
    state_code: str
    pincode: str
    country: str = "India"
    email: EmailStr
    phone: str
    contact_person: Optional[str] = None
    vendor_type: VendorType = VendorType.BOTH
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    payment_terms: int = 30
    tds_applicable: bool = True
    tds_section: Optional[str] = None

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
        if not re.match(pattern, v):
            raise ValueError("Invalid GSTIN format")
        return v

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, v: str) -> str:
        import re
        pattern = r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
        if not re.match(pattern, v):
            raise ValueError("Invalid PAN format")
        return v


class VendorCreate(VendorBase):
    code: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    pincode: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    contact_person: Optional[str] = None
    vendor_type: Optional[VendorType] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    payment_terms: Optional[int] = None
    tds_applicable: Optional[bool] = None
    tds_section: Optional[str] = None
    is_active: Optional[bool] = None


class VendorResponse(VendorBase):
    id: int
    code: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
