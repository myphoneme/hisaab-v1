from typing import Optional
from pydantic import BaseModel, field_validator
from datetime import datetime

from app.models.bank_account import AccountType


class BankAccountBase(BaseModel):
    branch_id: int
    account_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    branch_name: Optional[str] = None  # Bank branch name
    account_type: AccountType = AccountType.CURRENT
    upi_id: Optional[str] = None
    swift_code: Optional[str] = None
    is_active: bool = True
    is_default: bool = False

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc_code(cls, v: str) -> str:
        import re
        # IFSC format: AAAA0BBBBBB (11 chars: 4 alpha, 1 zero, 6 alphanumeric)
        pattern = r"^[A-Z]{4}0[A-Z0-9]{6}$"
        if not re.match(pattern, v.upper()):
            raise ValueError("Invalid IFSC code format. Must be 11 characters: AAAA0BBBBBB")
        return v.upper()

    @field_validator("account_number")
    @classmethod
    def validate_account_number(cls, v: str) -> str:
        # Account number should be 9-18 digits
        if not v.isdigit() or not (9 <= len(v) <= 18):
            raise ValueError("Account number must be 9-18 digits")
        return v


class BankAccountCreate(BankAccountBase):
    pass


class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    account_type: Optional[AccountType] = None
    upi_id: Optional[str] = None
    swift_code: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class BranchInfo(BaseModel):
    """Minimal branch info for bank account response."""
    id: int
    branch_name: str
    branch_code: str

    class Config:
        from_attributes = True


class BankAccountResponse(BankAccountBase):
    id: int
    created_at: datetime
    updated_at: datetime
    branch: Optional[BranchInfo] = None  # Include organization branch info

    class Config:
        from_attributes = True


class BankAccountWithBranch(BankAccountResponse):
    """Alias for backward compatibility."""
    pass
