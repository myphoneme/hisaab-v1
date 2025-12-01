from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Text, Enum, Boolean
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class AccountType(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"


class AccountGroup(str, enum.Enum):
    # Assets
    CASH_BANK = "CASH_BANK"
    ACCOUNTS_RECEIVABLE = "ACCOUNTS_RECEIVABLE"
    INVENTORY = "INVENTORY"
    FIXED_ASSETS = "FIXED_ASSETS"
    OTHER_ASSETS = "OTHER_ASSETS"

    # Liabilities
    ACCOUNTS_PAYABLE = "ACCOUNTS_PAYABLE"
    DUTIES_TAXES = "DUTIES_TAXES"
    LOANS = "LOANS"
    OTHER_LIABILITIES = "OTHER_LIABILITIES"

    # Equity
    CAPITAL = "CAPITAL"
    RESERVES = "RESERVES"

    # Revenue
    SALES = "SALES"
    OTHER_INCOME = "OTHER_INCOME"

    # Expenses
    PURCHASE = "PURCHASE"
    DIRECT_EXPENSES = "DIRECT_EXPENSES"
    INDIRECT_EXPENSES = "INDIRECT_EXPENSES"


class ReferenceType(str, enum.Enum):
    INVOICE = "INVOICE"
    PAYMENT = "PAYMENT"
    JOURNAL = "JOURNAL"
    OPENING = "OPENING"


class ChartOfAccount(BaseModel):
    __tablename__ = "chart_of_accounts"

    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    account_type = Column(Enum(AccountType), nullable=False)
    account_group = Column(Enum(AccountGroup), nullable=False)
    parent_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)  # System accounts cannot be deleted


class LedgerEntry(BaseModel):
    __tablename__ = "ledger_entries"

    # Entry Details
    entry_date = Column(Date, nullable=False, index=True)
    voucher_number = Column(String(50), nullable=False, index=True)

    # Account
    account_id = Column(Integer, ForeignKey("chart_of_accounts.id"), nullable=False)

    # Amounts
    debit = Column(Numeric(15, 2), default=0, nullable=False)
    credit = Column(Numeric(15, 2), default=0, nullable=False)

    # Reference
    reference_type = Column(Enum(ReferenceType), nullable=False)
    reference_id = Column(Integer, nullable=True)  # ID of invoice/payment/journal

    # Description
    narration = Column(Text, nullable=True)

    # Party (for AR/AP)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)

    # Branch
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False, index=True)

    # Financial Year
    financial_year = Column(String(10), nullable=False)  # e.g., "2024-25"

    # Relationships
    branch = relationship("Branch", back_populates="ledger_entries")
