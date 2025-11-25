from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from decimal import Decimal

from app.models.client import ClientType


class ClientBase(BaseModel):
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
    client_type: ClientType = ClientType.B2B
    credit_limit: Decimal = Decimal("0")
    payment_terms: int = 30

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

    @field_validator("state_code")
    @classmethod
    def validate_state_code(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 2:
            raise ValueError("State code must be 2 digits")
        return v


class ClientCreate(ClientBase):
    code: Optional[str] = None


class ClientUpdate(BaseModel):
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
    client_type: Optional[ClientType] = None
    credit_limit: Optional[Decimal] = None
    payment_terms: Optional[int] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    id: int
    code: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
