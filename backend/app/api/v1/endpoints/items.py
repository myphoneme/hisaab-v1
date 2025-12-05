from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.item import Item, ItemType
from app.models.user import User
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ItemResponse])
async def get_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    item_type: Optional[ItemType] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all items with pagination and filtering."""
    query = select(Item)

    if search:
        query = query.where(
            (Item.name.ilike(f"%{search}%")) |
            (Item.code.ilike(f"%{search}%")) |
            (Item.description.ilike(f"%{search}%")) |
            (Item.hsn_sac.ilike(f"%{search}%"))
        )

    if item_type:
        query = query.where(Item.item_type == item_type)

    if is_active is not None:
        query = query.where(Item.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(Item.name).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedResponse(
        items=[ItemResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/active", response_model=List[ItemResponse])
async def get_active_items(
    item_type: Optional[ItemType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active items (for dropdowns)."""
    query = select(Item).where(Item.is_active == True)

    if item_type:
        query = query.where(Item.item_type == item_type)

    query = query.order_by(Item.name)
    result = await db.execute(query)
    items = result.scalars().all()
    return [ItemResponse.model_validate(item) for item in items]


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific item by ID."""
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    item_data: ItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new item."""
    # Check for duplicate code
    code_result = await db.execute(select(Item).where(Item.code == item_data.code))
    if code_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item code already exists")

    item = Item(**item_data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: int,
    item_data: ItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an item."""
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    update_data = item_data.model_dump(exclude_unset=True)

    # Check for duplicate code if being updated
    if "code" in update_data and update_data["code"] != item.code:
        code_result = await db.execute(select(Item).where(Item.code == update_data["code"]))
        if code_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Item code already exists")

    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", response_model=Message)
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an item (soft delete by setting is_active=False)."""
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    item.is_active = False
    await db.commit()
    return Message(message="Item deactivated successfully")
