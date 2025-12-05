from pydantic import BaseModel
from datetime import datetime


class StateBase(BaseModel):
    code: str
    name: str
    is_active: bool = True


class StateCreate(StateBase):
    pass


class StateResponse(StateBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
