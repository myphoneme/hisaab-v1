from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.state import State
from app.models.user import User
from app.schemas.state import StateResponse
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=List[StateResponse])
async def get_states(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active states."""
    result = await db.execute(
        select(State)
        .where(State.is_active == True)
        .order_by(State.code)
    )
    return result.scalars().all()


@router.get("/{state_code}", response_model=StateResponse)
async def get_state_by_code(
    state_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a state by its code."""
    result = await db.execute(
        select(State).where(State.code == state_code)
    )
    state = result.scalar_one_or_none()
    if not state:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="State not found")
    return state
