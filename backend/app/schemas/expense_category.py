from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class ExpenseCategoryBase(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
