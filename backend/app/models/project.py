from sqlalchemy import Column, String, Boolean, Text, Date, Numeric
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Project(BaseModel):
    __tablename__ = "projects"

    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), nullable=True, unique=True, index=True)
    description = Column(Text, nullable=True)

    # Project Details
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    budget = Column(Numeric(15, 2), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, ON_HOLD, CANCELLED

    # Relationships
    cash_expenses = relationship("CashExpense", back_populates="project")
