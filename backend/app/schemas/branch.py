from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


class BranchBase(BaseModel):
    branch_name: str
    branch_code: str
    gstin: str
    state: str
    state_code: str
    address: str
    city: str
    pincode: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: bool = True
    is_head_office: bool = False

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v: str) -> str:
        import re
        # GSTIN format: 99AAAAA9999A9Z9 (15 chars)
        pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
        if not re.match(pattern, v):
            raise ValueError("Invalid GSTIN format. Must be 15 characters: 99AAAAA9999A9Z9")
        return v

    @field_validator("state_code")
    @classmethod
    def validate_state_code(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 2:
            raise ValueError("State code must be 2 digits")
        return v

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("Pincode must be 6 digits")
        return v


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    branch_name: Optional[str] = None
    branch_code: Optional[str] = None
    gstin: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_head_office: Optional[bool] = None


class BranchResponse(BranchBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BranchWithBankAccounts(BranchResponse):
    bank_accounts: list = []

    class Config:
        from_attributes = True
