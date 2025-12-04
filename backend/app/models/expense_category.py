from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ExpenseCategory(BaseModel):
    __tablename__ = "expense_categories"

    # Basic Information
    name = Column(String(255), nullable=False, unique=True, index=True)
    code = Column(String(50), nullable=True, unique=True, index=True)
    description = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    cash_expenses = relationship("CashExpense", back_populates="expense_category")
