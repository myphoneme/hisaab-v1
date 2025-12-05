import enum
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, Enum

from app.models.base import BaseModel


class ItemType(str, enum.Enum):
    GOODS = "GOODS"
    SERVICES = "SERVICES"


class Item(BaseModel):
    """Item/Product master table for reusable catalog."""

    __tablename__ = "items"

    # Basic Details
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Type
    item_type = Column(Enum(ItemType), default=ItemType.SERVICES, nullable=False)

    # Tax Details
    hsn_sac = Column(String(8), nullable=True)  # HSN for goods, SAC for services
    default_gst_rate = Column(Numeric(5, 2), default=18, nullable=False)

    # Unit & Rate
    default_unit = Column(String(20), default="NOS", nullable=False)
    default_rate = Column(Numeric(15, 2), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
