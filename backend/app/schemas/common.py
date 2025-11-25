from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel
from datetime import datetime

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class Message(BaseModel):
    message: str


class BaseSchema(BaseModel):
    class Config:
        from_attributes = True


class TimestampSchema(BaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime
