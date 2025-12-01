from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.branch import Branch
from app.models.bank_account import BankAccount
from app.models.user import User
from app.schemas.branch import BranchCreate, BranchUpdate, BranchResponse, BranchWithBankAccounts
from app.schemas.bank_account import BankAccountResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedResponse[BranchResponse])
async def get_branches(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all branches with pagination."""
    query = select(Branch)

    if search:
        query = query.where(
            (Branch.branch_name.ilike(f"%{search}%")) |
            (Branch.branch_code.ilike(f"%{search}%")) |
            (Branch.gstin.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.where(Branch.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    branches = result.scalars().all()

    return PaginatedResponse(
        items=[BranchResponse.model_validate(b) for b in branches],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/active", response_model=List[BranchResponse])
async def get_active_branches(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active branches (for dropdowns)."""
    query = select(Branch).where(Branch.is_active == True).order_by(Branch.branch_name)
    result = await db.execute(query)
    branches = result.scalars().all()
    return [BranchResponse.model_validate(b) for b in branches]


@router.get("/{branch_id}", response_model=BranchWithBankAccounts)
async def get_branch(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific branch by ID with bank accounts."""
    query = select(Branch).options(selectinload(Branch.bank_accounts)).where(Branch.id == branch_id)
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")
    return branch


@router.get("/{branch_id}/bank-accounts", response_model=List[BankAccountResponse])
async def get_branch_bank_accounts(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all bank accounts for a specific branch."""
    # Verify branch exists
    branch_result = await db.execute(select(Branch).where(Branch.id == branch_id))
    branch = branch_result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    # Get bank accounts
    query = select(BankAccount).where(BankAccount.branch_id == branch_id).order_by(BankAccount.is_default.desc(), BankAccount.account_name)
    result = await db.execute(query)
    accounts = result.scalars().all()
    return [BankAccountResponse.model_validate(a) for a in accounts]


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    branch_data: BranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new branch."""
    # Check for duplicate branch_code
    code_result = await db.execute(select(Branch).where(Branch.branch_code == branch_data.branch_code))
    if code_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Branch code already exists")

    # Check for duplicate GSTIN
    gstin_result = await db.execute(select(Branch).where(Branch.gstin == branch_data.gstin))
    if gstin_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GSTIN already exists")

    # Verify GSTIN state code matches branch state code
    gstin_state_code = branch_data.gstin[:2]
    if gstin_state_code != branch_data.state_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GSTIN state code ({gstin_state_code}) must match branch state code ({branch_data.state_code})"
        )

    branch = Branch(**branch_data.model_dump())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return branch


@router.patch("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: int,
    branch_data: BranchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a branch."""
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    update_data = branch_data.model_dump(exclude_unset=True)

    # Check for duplicate branch_code if being updated
    if "branch_code" in update_data and update_data["branch_code"] != branch.branch_code:
        code_result = await db.execute(select(Branch).where(Branch.branch_code == update_data["branch_code"]))
        if code_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Branch code already exists")

    # Check for duplicate GSTIN if being updated
    if "gstin" in update_data and update_data["gstin"] != branch.gstin:
        gstin_result = await db.execute(select(Branch).where(Branch.gstin == update_data["gstin"]))
        if gstin_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GSTIN already exists")

    # Verify GSTIN state code matches branch state code if either is being updated
    gstin = update_data.get("gstin", branch.gstin)
    state_code = update_data.get("state_code", branch.state_code)
    if gstin and state_code:
        gstin_state_code = gstin[:2]
        if gstin_state_code != state_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"GSTIN state code ({gstin_state_code}) must match branch state code ({state_code})"
            )

    for field, value in update_data.items():
        setattr(branch, field, value)

    await db.commit()
    await db.refresh(branch)
    return branch


@router.delete("/{branch_id}", response_model=Message)
async def delete_branch(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a branch (soft delete by setting is_active=False)."""
    result = await db.execute(select(Branch).where(Branch.id == branch_id))
    branch = result.scalar_one_or_none()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found")

    # Check if branch is head office
    if branch.is_head_office:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete head office branch"
        )

    branch.is_active = False
    await db.commit()
    return Message(message="Branch deactivated successfully")
