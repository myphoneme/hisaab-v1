from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class AccountType(str, enum.Enum):
    SAVINGS = "SAVINGS"
    CURRENT = "CURRENT"
    OD = "OVERDRAFT"
    CC = "CASH_CREDIT"


class BankAccount(BaseModel):
    __tablename__ = "bank_accounts"

    # Branch Association
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)

    # Account Details
    account_name = Column(String(255), nullable=False)
    bank_name = Column(String(255), nullable=False)
    account_number = Column(String(50), nullable=False)
    ifsc_code = Column(String(11), nullable=False)
    branch_name = Column(String(255), nullable=True)  # Bank branch name
    account_type = Column(Enum(AccountType), default=AccountType.CURRENT, nullable=False)

    # Additional Details
    upi_id = Column(String(100), nullable=True)
    swift_code = Column(String(20), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)  # Default for branch

    # Relationships
    branch = relationship("Branch", back_populates="bank_accounts")
    payments = relationship("Payment", back_populates="bank_account_ref")
