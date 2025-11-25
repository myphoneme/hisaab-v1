from sqlalchemy import Column, String, Boolean, Enum
import enum

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ACCOUNTANT = "accountant"
    VIEWER = "viewer"


class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
