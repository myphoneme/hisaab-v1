from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.cash_expense import CashExpense
from app.models.expense_category import ExpenseCategory
from app.models.project import Project
from app.models.branch import Branch
from app.models.bank_account import BankAccount
from app.models.user import User
from app.schemas.cash_expense import CashExpenseCreate, CashExpenseUpdate, CashExpenseResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user
from app.services.number_generator import generate_expense_number, get_financial_year

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CashExpenseResponse])
async def get_cash_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    expense_category_id: Optional[int] = None,
    project_id: Optional[int] = None,
    branch_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all cash expenses with pagination."""
    query = select(CashExpense).options(
        selectinload(CashExpense.expense_category),
        selectinload(CashExpense.project),
        selectinload(CashExpense.branch),
        selectinload(CashExpense.bank_account).selectinload(BankAccount.branch),
    )

    if search:
        query = query.where(
            (CashExpense.expense_number.ilike(f"%{search}%")) |
            (CashExpense.description.ilike(f"%{search}%"))
        )

    if from_date:
        query = query.where(CashExpense.transaction_date >= from_date)

    if to_date:
        query = query.where(CashExpense.transaction_date <= to_date)

    if expense_category_id:
        query = query.where(CashExpense.expense_category_id == expense_category_id)

    if project_id:
        query = query.where(CashExpense.project_id == project_id)

    if branch_id:
        query = query.where(CashExpense.branch_id == branch_id)

    if transaction_type:
        query = query.where(CashExpense.transaction_type == transaction_type)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(CashExpense.transaction_date.desc(), CashExpense.id.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    expenses = result.scalars().all()

    return PaginatedResponse(
        items=[CashExpenseResponse.model_validate(e) for e in expenses],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{expense_id}", response_model=CashExpenseResponse)
async def get_cash_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific cash expense by ID."""
    query = select(CashExpense).options(
        selectinload(CashExpense.expense_category),
        selectinload(CashExpense.project),
        selectinload(CashExpense.branch),
        selectinload(CashExpense.bank_account).selectinload(BankAccount.branch),
    ).where(CashExpense.id == expense_id)
    result = await db.execute(query)
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cash expense not found")
    return expense


@router.post("", response_model=CashExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_cash_expense(
    expense_data: CashExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new cash expense."""
    # Validate bank account exists
    bank_account_result = await db.execute(select(BankAccount).where(BankAccount.id == expense_data.bank_account_id))
    bank_account = bank_account_result.scalar_one_or_none()
    if not bank_account:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bank account not found")

    # Validate expense category if provided
    if expense_data.expense_category_id:
        cat_result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == expense_data.expense_category_id))
        if not cat_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense category not found")

    # Validate project if provided
    if expense_data.project_id:
        project_result = await db.execute(select(Project).where(Project.id == expense_data.project_id))
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found")

    # Validate branch if provided
    if expense_data.branch_id:
        branch_result = await db.execute(select(Branch).where(Branch.id == expense_data.branch_id))
        if not branch_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Branch not found")

    # Validate transaction type
    if expense_data.transaction_type not in ["DEBIT", "CREDIT"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction type must be DEBIT or CREDIT")

    # Generate expense number
    expense_number = await generate_expense_number(db)
    financial_year = get_financial_year()

    expense = CashExpense(
        expense_number=expense_number,
        financial_year=financial_year,
        **expense_data.model_dump()
    )
    db.add(expense)
    await db.commit()

    # Reload with relationships
    query = select(CashExpense).options(
        selectinload(CashExpense.expense_category),
        selectinload(CashExpense.project),
        selectinload(CashExpense.branch),
        selectinload(CashExpense.bank_account).selectinload(BankAccount.branch),
    ).where(CashExpense.id == expense.id)
    result = await db.execute(query)
    expense = result.scalar_one()

    return expense


@router.patch("/{expense_id}", response_model=CashExpenseResponse)
async def update_cash_expense(
    expense_id: int,
    expense_data: CashExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a cash expense."""
    result = await db.execute(select(CashExpense).where(CashExpense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cash expense not found")

    update_data = expense_data.model_dump(exclude_unset=True)

    # Validate bank account if being updated
    if "bank_account_id" in update_data:
        bank_account_result = await db.execute(select(BankAccount).where(BankAccount.id == update_data["bank_account_id"]))
        if not bank_account_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bank account not found")

    # Validate expense category if being updated
    if "expense_category_id" in update_data and update_data["expense_category_id"]:
        cat_result = await db.execute(select(ExpenseCategory).where(ExpenseCategory.id == update_data["expense_category_id"]))
        if not cat_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Expense category not found")

    # Validate project if being updated
    if "project_id" in update_data and update_data["project_id"]:
        project_result = await db.execute(select(Project).where(Project.id == update_data["project_id"]))
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found")

    # Validate branch if being updated
    if "branch_id" in update_data and update_data["branch_id"]:
        branch_result = await db.execute(select(Branch).where(Branch.id == update_data["branch_id"]))
        if not branch_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Branch not found")

    # Validate transaction type if being updated
    if "transaction_type" in update_data and update_data["transaction_type"] not in ["DEBIT", "CREDIT"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transaction type must be DEBIT or CREDIT")

    for field, value in update_data.items():
        setattr(expense, field, value)

    await db.commit()

    # Reload with relationships
    query = select(CashExpense).options(
        selectinload(CashExpense.expense_category),
        selectinload(CashExpense.project),
        selectinload(CashExpense.branch),
        selectinload(CashExpense.bank_account).selectinload(BankAccount.branch),
    ).where(CashExpense.id == expense.id)
    result = await db.execute(query)
    expense = result.scalar_one()

    return expense


@router.delete("/{expense_id}", response_model=Message)
async def delete_cash_expense(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a cash expense."""
    result = await db.execute(select(CashExpense).where(CashExpense.id == expense_id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cash expense not found")

    await db.delete(expense)
    await db.commit()
    return Message(message="Cash expense deleted successfully")
