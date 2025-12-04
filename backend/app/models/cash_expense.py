from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class TransactionType(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class CashExpense(BaseModel):
    __tablename__ = "cash_expenses"

    # Expense Details
    expense_number = Column(String(50), unique=True, nullable=False, index=True)
    transaction_date = Column(Date, nullable=False, index=True)

    # Category
    expense_category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)

    # Bank Account (linked to BankAccount - the account from which payment was made)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"), nullable=False)

    # Project (optional)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)

    # Branch
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)

    # Amount and Type
    amount = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # DEBIT or CREDIT

    # Transaction Reference (UPI UTR, Bank Ref, Cheque No, etc.)
    transaction_ref = Column(String(100), nullable=True, index=True)

    # Description
    description = Column(Text, nullable=True)

    # Financial Year
    financial_year = Column(String(10), nullable=False)  # e.g., "2024-25"

    # Relationships
    expense_category = relationship("ExpenseCategory", back_populates="cash_expenses")
    project = relationship("Project", back_populates="cash_expenses")
    bank_account = relationship("BankAccount")
    branch = relationship("Branch")
