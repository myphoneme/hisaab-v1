from datetime import datetime
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.orm import declared_attr

from app.db.session import Base


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps."""

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class BaseModel(Base, TimestampMixin):
    """Base model class with common fields."""

    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()
