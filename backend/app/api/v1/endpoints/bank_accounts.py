from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.bank_account import BankAccount
from app.models.branch import Branch
from app.models.user import User
from app.schemas.bank_account import BankAccountCreate, BankAccountUpdate, BankAccountResponse, BankAccountWithBranch
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedResponse[BankAccountResponse])
async def get_bank_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    branch_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all bank accounts with pagination."""
    query = select(BankAccount).options(selectinload(BankAccount.branch))

    if branch_id is not None:
        query = query.where(BankAccount.branch_id == branch_id)

    if is_active is not None:
        query = query.where(BankAccount.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results - order by default first, then by name
    query = query.order_by(BankAccount.is_default.desc(), BankAccount.account_name)
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    accounts = result.scalars().all()

    return PaginatedResponse(
        items=[BankAccountResponse.model_validate(a) for a in accounts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{account_id}", response_model=BankAccountWithBranch)
async def get_bank_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific bank account by ID."""
    query = select(BankAccount).options(selectinload(BankAccount.branch)).where(BankAccount.id == account_id)
    result = await db.execute(query)
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")
    return account


@router.post("", response_model=BankAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    account_data: BankAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new bank account."""
    # Verify branch exists
    branch_result = await db.execute(select(Branch).where(Branch.id == account_data.branch_id))
    branch = branch_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    # Check for duplicate account number in the same branch
    duplicate_result = await db.execute(
        select(BankAccount).where(
            (BankAccount.branch_id == account_data.branch_id) &
            (BankAccount.account_number == account_data.account_number)
        )
    )
    if duplicate_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account number already exists for this branch"
        )

    # If this is being set as default, unset other defaults for this branch
    if account_data.is_default:
        await db.execute(
            update(BankAccount)
            .where(BankAccount.branch_id == account_data.branch_id)
            .values(is_default=False)
        )

    account = BankAccount(**account_data.model_dump())
    db.add(account)
    await db.commit()

    # Reload with branch relationship for response
    result = await db.execute(
        select(BankAccount)
        .options(selectinload(BankAccount.branch))
        .where(BankAccount.id == account.id)
    )
    return result.scalar_one()


@router.patch("/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: int,
    account_data: BankAccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a bank account."""
    result = await db.execute(select(BankAccount).where(BankAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    update_data = account_data.model_dump(exclude_unset=True)

    # Check for duplicate account number if being updated
    if "account_number" in update_data and update_data["account_number"] != account.account_number:
        duplicate_result = await db.execute(
            select(BankAccount).where(
                (BankAccount.branch_id == account.branch_id) &
                (BankAccount.account_number == update_data["account_number"]) &
                (BankAccount.id != account_id)
            )
        )
        if duplicate_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account number already exists for this branch"
            )

    # If this is being set as default, unset other defaults for this branch
    if "is_default" in update_data and update_data["is_default"] and not account.is_default:
        await db.execute(
            update(BankAccount)
            .where((BankAccount.branch_id == account.branch_id) & (BankAccount.id != account_id))
            .values(is_default=False)
        )

    for field, value in update_data.items():
        setattr(account, field, value)

    await db.commit()

    # Reload with branch relationship for response
    result = await db.execute(
        select(BankAccount)
        .options(selectinload(BankAccount.branch))
        .where(BankAccount.id == account_id)
    )
    return result.scalar_one()


@router.patch("/{account_id}/set-default", response_model=BankAccountResponse)
async def set_default_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set a bank account as the default for its branch."""
    result = await db.execute(
        select(BankAccount)
        .options(selectinload(BankAccount.branch))
        .where(BankAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    if account.is_default:
        return account  # Already default

    # Unset other defaults for this branch
    await db.execute(
        update(BankAccount)
        .where((BankAccount.branch_id == account.branch_id) & (BankAccount.id != account_id))
        .values(is_default=False)
    )

    # Set this as default
    account.is_default = True
    await db.commit()

    # Reload with branch relationship for response
    result = await db.execute(
        select(BankAccount)
        .options(selectinload(BankAccount.branch))
        .where(BankAccount.id == account_id)
    )
    return result.scalar_one()


@router.delete("/{account_id}", response_model=Message)
async def delete_bank_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a bank account (soft delete by setting is_active=False)."""
    result = await db.execute(select(BankAccount).where(BankAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank account not found")

    # Check if this is the only active account for the branch
    active_accounts_result = await db.execute(
        select(func.count())
        .select_from(BankAccount)
        .where((BankAccount.branch_id == account.branch_id) & (BankAccount.is_active == True))
    )
    active_count = active_accounts_result.scalar()

    if active_count <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last active bank account for a branch"
        )

    account.is_active = False
    # If this was the default, we need to set another account as default
    if account.is_default:
        # Find another active account for this branch
        other_account_result = await db.execute(
            select(BankAccount)
            .where((BankAccount.branch_id == account.branch_id) & (BankAccount.is_active == True) & (BankAccount.id != account_id))
            .limit(1)
        )
        other_account = other_account_result.scalar_one_or_none()
        if other_account:
            other_account.is_default = True

    await db.commit()
    return Message(message="Bank account deactivated successfully")
