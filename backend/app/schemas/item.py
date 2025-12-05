from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal

from app.models.item import ItemType


class ItemBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    item_type: ItemType = ItemType.SERVICES
    hsn_sac: Optional[str] = None
    default_gst_rate: Decimal = Decimal("18")
    default_unit: str = "NOS"
    default_rate: Optional[Decimal] = None


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    item_type: Optional[ItemType] = None
    hsn_sac: Optional[str] = None
    default_gst_rate: Optional[Decimal] = None
    default_unit: Optional[str] = None
    default_rate: Optional[Decimal] = None
    is_active: Optional[bool] = None


class ItemResponse(ItemBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
