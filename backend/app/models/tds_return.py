from sqlalchemy import Column, String, Integer, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel
from app.models.tds_challan import TDSType


class ReturnStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    FILED = "FILED"
    REVISED = "REVISED"


class TDSReturn(BaseModel):
    """TDS Quarterly Return - tracks return filing status."""
    __tablename__ = "tds_returns"

    # Period
    financial_year = Column(String(9), nullable=False, index=True)  # "2024-2025"
    quarter = Column(Integer, nullable=False)  # 1, 2, 3, 4

    # Type
    tds_type = Column(Enum(TDSType), nullable=False, index=True)

    # Branch (optional)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True, index=True)

    # Return file
    return_file_path = Column(String(500), nullable=True)
    return_filename = Column(String(255), nullable=True)

    # Status
    status = Column(Enum(ReturnStatus), default=ReturnStatus.DRAFT, nullable=False)
    filed_date = Column(Date, nullable=True)
    acknowledgment_number = Column(String(50), nullable=True)

    # Relationships
    branch = relationship("Branch")
