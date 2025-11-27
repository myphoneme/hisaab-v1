from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from decimal import Decimal

from app.db.session import get_db
from app.models.ledger import (
    ChartOfAccount,
    LedgerEntry,
    AccountType,
    AccountGroup,
    ReferenceType,
)
from app.models.user import User
from app.schemas.ledger import (
    ChartOfAccountCreate,
    ChartOfAccountUpdate,
    ChartOfAccountResponse,
    LedgerEntryCreate,
    LedgerEntryResponse,
    JournalEntryCreate,
    LedgerStatement,
    TrialBalance,
    TrialBalanceItem,
)
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user
from app.services.number_generator import generate_voucher_number

router = APIRouter()


# Chart of Accounts Endpoints
@router.get("/accounts", response_model=PaginatedResponse[ChartOfAccountResponse])
async def get_accounts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    account_type: Optional[AccountType] = None,
    account_group: Optional[AccountGroup] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all chart of accounts."""
    query = select(ChartOfAccount)

    if account_type:
        query = query.where(ChartOfAccount.account_type == account_type)
    if account_group:
        query = query.where(ChartOfAccount.account_group == account_group)
    if is_active is not None:
        query = query.where(ChartOfAccount.is_active == is_active)

    query = query.order_by(ChartOfAccount.code)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    accounts = result.scalars().all()

    return PaginatedResponse(
        items=[ChartOfAccountResponse.model_validate(acc) for acc in accounts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/accounts/{account_id}", response_model=ChartOfAccountResponse)
async def get_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific account."""
    result = await db.execute(
        select(ChartOfAccount).where(ChartOfAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )
    return account


@router.post("/accounts", response_model=ChartOfAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: ChartOfAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new chart of account."""
    # Check if code already exists
    existing = await db.execute(
        select(ChartOfAccount).where(ChartOfAccount.code == account_data.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account code already exists"
        )

    account = ChartOfAccount(**account_data.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.patch("/accounts/{account_id}", response_model=ChartOfAccountResponse)
async def update_account(
    account_id: int,
    account_data: ChartOfAccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a chart of account."""
    result = await db.execute(
        select(ChartOfAccount).where(ChartOfAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )

    if account.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify system accounts"
        )

    for field, value in account_data.model_dump(exclude_unset=True).items():
        setattr(account, field, value)

    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/accounts/{account_id}", response_model=Message)
async def delete_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a chart of account."""
    result = await db.execute(
        select(ChartOfAccount).where(ChartOfAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )

    if account.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system accounts"
        )

    # Check if account has entries
    entries_result = await db.execute(
        select(func.count()).select_from(LedgerEntry).where(LedgerEntry.account_id == account_id)
    )
    if entries_result.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete account with ledger entries"
        )

    await db.delete(account)
    await db.commit()
    return Message(message="Account deleted successfully")


# Ledger Entry Endpoints
@router.get("/entries", response_model=PaginatedResponse[LedgerEntryResponse])
async def get_ledger_entries(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    account_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    reference_type: Optional[ReferenceType] = None,
    client_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get ledger entries with filters."""
    query = select(LedgerEntry)

    if account_id:
        query = query.where(LedgerEntry.account_id == account_id)
    if from_date:
        query = query.where(LedgerEntry.entry_date >= from_date)
    if to_date:
        query = query.where(LedgerEntry.entry_date <= to_date)
    if reference_type:
        query = query.where(LedgerEntry.reference_type == reference_type)
    if client_id:
        query = query.where(LedgerEntry.client_id == client_id)
    if vendor_id:
        query = query.where(LedgerEntry.vendor_id == vendor_id)

    query = query.order_by(LedgerEntry.entry_date.desc(), LedgerEntry.id.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    entries = result.scalars().all()

    return PaginatedResponse(
        items=[LedgerEntryResponse.model_validate(entry) for entry in entries],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("/journal-entry", status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    journal_data: JournalEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a manual journal entry."""
    # Validate double entry - total debits must equal total credits
    total_debit = sum(item.debit for item in journal_data.items)
    total_credit = sum(item.credit for item in journal_data.items)

    if total_debit != total_credit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Debits ({total_debit}) must equal Credits ({total_credit})"
        )

    # Generate voucher number if not provided
    voucher_number = journal_data.voucher_number
    if not voucher_number:
        voucher_number = await generate_voucher_number(db, "JV")

    # Get current financial year (April to March)
    today = journal_data.entry_date
    if today.month >= 4:
        fy = f"{today.year}-{str(today.year + 1)[-2:]}"
    else:
        fy = f"{today.year - 1}-{str(today.year)[-2:]}"

    # Create ledger entries
    entries = []
    for item in journal_data.items:
        # Verify account exists
        account_result = await db.execute(
            select(ChartOfAccount).where(ChartOfAccount.id == item.account_id)
        )
        if not account_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account ID {item.account_id} not found"
            )

        entry = LedgerEntry(
            entry_date=journal_data.entry_date,
            voucher_number=voucher_number,
            account_id=item.account_id,
            debit=item.debit,
            credit=item.credit,
            narration=item.narration or journal_data.narration,
            reference_type=ReferenceType.JOURNAL,
            financial_year=fy,
        )
        db.add(entry)
        entries.append(entry)

    await db.commit()

    return {
        "message": "Journal entry created successfully",
        "voucher_number": voucher_number,
        "entry_count": len(entries),
    }


@router.get("/statement/{account_id}", response_model=LedgerStatement)
async def get_ledger_statement(
    account_id: int,
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get ledger statement for an account."""
    # Get account details
    account_result = await db.execute(
        select(ChartOfAccount).where(ChartOfAccount.id == account_id)
    )
    account = account_result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )

    # Calculate opening balance (all entries before from_date)
    opening_result = await db.execute(
        select(
            func.sum(LedgerEntry.debit).label('total_debit'),
            func.sum(LedgerEntry.credit).label('total_credit')
        )
        .where(LedgerEntry.account_id == account_id)
        .where(LedgerEntry.entry_date < from_date)
    )
    opening = opening_result.one()
    opening_debit = opening.total_debit or Decimal('0')
    opening_credit = opening.total_credit or Decimal('0')

    # For asset/expense accounts: opening_balance = debit - credit
    # For liability/revenue/equity: opening_balance = credit - debit
    if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
        opening_balance = opening_debit - opening_credit
    else:
        opening_balance = opening_credit - opening_debit

    # Get entries for the period
    entries_result = await db.execute(
        select(LedgerEntry)
        .where(LedgerEntry.account_id == account_id)
        .where(LedgerEntry.entry_date >= from_date)
        .where(LedgerEntry.entry_date <= to_date)
        .order_by(LedgerEntry.entry_date, LedgerEntry.id)
    )
    entries = entries_result.scalars().all()

    # Calculate totals for the period
    total_debit = sum(e.debit for e in entries)
    total_credit = sum(e.credit for e in entries)

    # Calculate closing balance
    if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
        closing_balance = opening_balance + total_debit - total_credit
    else:
        closing_balance = opening_balance + total_credit - total_debit

    return LedgerStatement(
        account_code=account.code,
        account_name=account.name,
        account_type=account.account_type.value,
        opening_balance=opening_balance,
        total_debit=total_debit,
        total_credit=total_credit,
        closing_balance=closing_balance,
        entries=[LedgerEntryResponse.model_validate(e) for e in entries],
    )


@router.get("/trial-balance", response_model=TrialBalance)
async def get_trial_balance(
    as_on_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get trial balance as on a date."""
    # Get all active accounts
    accounts_result = await db.execute(
        select(ChartOfAccount).where(ChartOfAccount.is_active == True)
    )
    accounts = accounts_result.scalars().all()

    trial_balance_items = []
    total_debit = Decimal('0')
    total_credit = Decimal('0')

    for account in accounts:
        # Get sum of debits and credits for this account up to the date
        entries_result = await db.execute(
            select(
                func.sum(LedgerEntry.debit).label('total_debit'),
                func.sum(LedgerEntry.credit).label('total_credit')
            )
            .where(LedgerEntry.account_id == account.id)
            .where(LedgerEntry.entry_date <= as_on_date)
        )
        entries = entries_result.one()
        account_debit = entries.total_debit or Decimal('0')
        account_credit = entries.total_credit or Decimal('0')

        # Skip accounts with no balance
        if account_debit == 0 and account_credit == 0:
            continue

        # Determine debit/credit balance based on account type
        if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
            balance = account_debit - account_credit
            if balance > 0:
                debit_balance = balance
                credit_balance = Decimal('0')
            else:
                debit_balance = Decimal('0')
                credit_balance = abs(balance)
        else:
            balance = account_credit - account_debit
            if balance > 0:
                credit_balance = balance
                debit_balance = Decimal('0')
            else:
                credit_balance = Decimal('0')
                debit_balance = abs(balance)

        trial_balance_items.append(
            TrialBalanceItem(
                account_code=account.code,
                account_name=account.name,
                account_type=account.account_type.value,
                account_group=account.account_group.value,
                debit=debit_balance,
                credit=credit_balance,
            )
        )

        total_debit += debit_balance
        total_credit += credit_balance

    return TrialBalance(
        as_on_date=as_on_date,
        accounts=trial_balance_items,
        total_debit=total_debit,
        total_credit=total_credit,
    )
