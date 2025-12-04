from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.expense_category import ExpenseCategory
from app.models.user import User
from app.schemas.expense_category import ExpenseCategoryCreate, ExpenseCategoryUpdate, ExpenseCategoryResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ExpenseCategoryResponse])
async def get_expense_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all expense categories with pagination."""
    query = select(ExpenseCategory)

    if search:
        query = query.where(
            (ExpenseCategory.name.ilike(f"%{search}%")) |
            (ExpenseCategory.code.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.where(ExpenseCategory.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(ExpenseCategory.name).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    categories = result.scalars().all()

    return PaginatedResponse(
        items=[ExpenseCategoryResponse.model_validate(c) for c in categories],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/active", response_model=List[ExpenseCategoryResponse])
async def get_active_expense_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active expense categories (for dropdowns)."""
    query = select(ExpenseCategory).where(ExpenseCategory.is_active == True).order_by(ExpenseCategory.name)
    result = await db.execute(query)
    categories = result.scalars().all()
    return [ExpenseCategoryResponse.model_validate(c) for c in categories]


@router.get("/{category_id}", response_model=ExpenseCategoryResponse)
async def get_expense_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific expense category by ID."""
    result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense category not found")
    return category


@router.post("", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_expense_category(
    category_data: ExpenseCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new expense category."""
    # Check for duplicate name
    name_result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.name == category_data.name))
    if name_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense category name already exists")

    # Check for duplicate code if provided
    if category_data.code:
        code_result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.code == category_data.code))
        if code_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense category code already exists")

    category = ExpenseCategory(**category_data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=ExpenseCategoryResponse)
async def update_expense_category(
    category_id: int,
    category_data: ExpenseCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an expense category."""
    result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense category not found")

    update_data = category_data.model_dump(exclude_unset=True)

    # Check for duplicate name if being updated
    if "name" in update_data and update_data["name"] != category.name:
        name_result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.name == update_data["name"]))
        if name_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense category name already exists")

    # Check for duplicate code if being updated
    if "code" in update_data and update_data["code"] and update_data["code"] != category.code:
        code_result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.code == update_data["code"]))
        if code_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense category code already exists")

    for field, value in update_data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", response_model=Message)
async def delete_expense_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an expense category (soft delete by setting is_active=False)."""
    result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense category not found")

    category.is_active = False
    await db.commit()
    return Message(message="Expense category deactivated successfully")
