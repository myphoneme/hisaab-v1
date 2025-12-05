from sqlalchemy import Column, String, Boolean

from app.models.base import BaseModel


class State(BaseModel):
    __tablename__ = "states"

    code = Column(String(2), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
