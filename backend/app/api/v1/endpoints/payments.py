import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import date
from decimal import Decimal

logger = logging.getLogger(__name__)

from app.db.session import get_db
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user
from app.services.number_generator import generate_payment_number
from app.services.ledger_posting import (
    post_payment, reverse_payment_posting, get_company_settings
)

router = APIRouter()


@router.get("", response_model=PaginatedResponse[PaymentResponse])
async def get_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    branch_id: Optional[int] = None,
    bank_account_id: Optional[int] = None,
    payment_type: Optional[PaymentType] = None,
    client_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all payments with pagination and filtering by branch, bank account, dates, etc."""
    query = select(Payment).options(
        selectinload(Payment.client),
        selectinload(Payment.vendor),
        selectinload(Payment.branch),
        selectinload(Payment.bank_account_ref)
    )

    if branch_id:
        query = query.where(Payment.branch_id == branch_id)
    if bank_account_id:
        query = query.where(Payment.bank_account_id == bank_account_id)
    if payment_type:
        query = query.where(Payment.payment_type == payment_type)
    if client_id:
        query = query.where(Payment.client_id == client_id)
    if vendor_id:
        query = query.where(Payment.vendor_id == vendor_id)
    if from_date:
        query = query.where(Payment.payment_date >= from_date)
    if to_date:
        query = query.where(Payment.payment_date <= to_date)

    query = query.order_by(Payment.payment_date.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    payments = result.scalars().all()

    return PaginatedResponse(
        items=[PaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific payment."""
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.client),
            selectinload(Payment.vendor),
            selectinload(Payment.branch),
            selectinload(Payment.bank_account_ref)
        )
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return payment


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payment_data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new payment/receipt."""
    # Generate payment number
    payment_number = await generate_payment_number(db, payment_data.payment_type.value)

    # Calculate net amount
    net_amount = payment_data.gross_amount - payment_data.tds_amount + payment_data.tcs_amount

    # Create payment
    payment = Payment(
        payment_number=payment_number,
        payment_date=payment_data.payment_date,
        payment_type=payment_data.payment_type,
        client_id=payment_data.client_id,
        vendor_id=payment_data.vendor_id,
        branch_id=payment_data.branch_id,
        bank_account_id=payment_data.bank_account_id,
        invoice_id=payment_data.invoice_id,
        gross_amount=payment_data.gross_amount,
        tds_amount=payment_data.tds_amount,
        tcs_amount=payment_data.tcs_amount,
        net_amount=net_amount,
        payment_mode=payment_data.payment_mode,
        reference_number=payment_data.reference_number,
        cheque_date=payment_data.cheque_date,
        notes=payment_data.notes,
        status=PaymentStatus.COMPLETED,
        is_posted=False,
    )

    db.add(payment)

    # Update invoice if linked
    if payment_data.invoice_id:
        invoice_result = await db.execute(select(Invoice).where(Invoice.id == payment_data.invoice_id))
        invoice = invoice_result.scalar_one_or_none()
        if invoice:
            invoice.amount_paid += net_amount
            invoice.amount_due = invoice.amount_after_tds - invoice.amount_paid

            if invoice.amount_due <= 0:
                invoice.status = InvoiceStatus.PAID
            elif invoice.amount_paid > 0:
                invoice.status = InvoiceStatus.PARTIAL

    await db.commit()
    await db.refresh(payment)

    # Post ledger entries for payment (payments are always posted immediately)
    settings = await get_company_settings(db)
    if settings:
        try:
            await post_payment(db, payment, settings)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to post ledger for payment {payment.payment_number}: {str(e)}")

    # Reload with relationships
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.client),
            selectinload(Payment.vendor),
            selectinload(Payment.branch),
            selectinload(Payment.bank_account_ref)
        )
        .where(Payment.id == payment.id)
    )
    return result.scalar_one()


@router.patch("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: int,
    payment_data: PaymentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a payment."""
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.client),
            selectinload(Payment.vendor),
            selectinload(Payment.branch),
            selectinload(Payment.bank_account_ref)
        )
        .where(Payment.id == payment_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    # Store old values for invoice update rollback if needed
    old_invoice_id = payment.invoice_id
    old_net_amount = payment.net_amount

    # Update fields
    for field, value in payment_data.model_dump(exclude_unset=True).items():
        if field not in ['gross_amount', 'tds_amount', 'tcs_amount']:
            setattr(payment, field, value)
        elif value is not None:
            setattr(payment, field, value)

    # Recalculate net amount if amounts changed
    if payment_data.gross_amount is not None or payment_data.tds_amount is not None or payment_data.tcs_amount is not None:
        payment.net_amount = payment.gross_amount - payment.tds_amount + payment.tcs_amount

    # Handle invoice update if invoice_id changed
    if payment_data.invoice_id is not None and payment_data.invoice_id != old_invoice_id:
        # Reverse old invoice update
        if old_invoice_id:
            old_invoice_result = await db.execute(select(Invoice).where(Invoice.id == old_invoice_id))
            old_invoice = old_invoice_result.scalar_one_or_none()
            if old_invoice:
                old_invoice.amount_paid -= old_net_amount
                old_invoice.amount_due = old_invoice.amount_after_tds - old_invoice.amount_paid
                if old_invoice.amount_due >= old_invoice.amount_after_tds:
                    old_invoice.status = InvoiceStatus.SENT
                else:
                    old_invoice.status = InvoiceStatus.PARTIAL

        # Apply new invoice update
        if payment.invoice_id:
            new_invoice_result = await db.execute(select(Invoice).where(Invoice.id == payment.invoice_id))
            new_invoice = new_invoice_result.scalar_one_or_none()
            if new_invoice:
                new_invoice.amount_paid += payment.net_amount
                new_invoice.amount_due = new_invoice.amount_after_tds - new_invoice.amount_paid
                if new_invoice.amount_due <= 0:
                    new_invoice.status = InvoiceStatus.PAID
                elif new_invoice.amount_paid > 0:
                    new_invoice.status = InvoiceStatus.PARTIAL
    # If net amount changed but invoice_id same, update the invoice
    elif old_invoice_id and payment.net_amount != old_net_amount:
        invoice_result = await db.execute(select(Invoice).where(Invoice.id == old_invoice_id))
        invoice = invoice_result.scalar_one_or_none()
        if invoice:
            # Remove old amount and add new amount
            invoice.amount_paid = invoice.amount_paid - old_net_amount + payment.net_amount
            invoice.amount_due = invoice.amount_after_tds - invoice.amount_paid
            if invoice.amount_due <= 0:
                invoice.status = InvoiceStatus.PAID
            elif invoice.amount_paid > 0:
                invoice.status = InvoiceStatus.PARTIAL
            else:
                invoice.status = InvoiceStatus.SENT

    await db.commit()
    await db.refresh(payment)

    # Reload with relationships
    result = await db.execute(
        select(Payment)
        .options(
            selectinload(Payment.client),
            selectinload(Payment.vendor),
            selectinload(Payment.branch),
            selectinload(Payment.bank_account_ref)
        )
        .where(Payment.id == payment.id)
    )
    return result.scalar_one()


@router.delete("/{payment_id}", response_model=Message)
async def delete_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a payment."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    # Reverse ledger posting if posted
    if payment.is_posted:
        settings = await get_company_settings(db)
        if settings:
            try:
                await reverse_payment_posting(db, payment, settings)
            except Exception as e:
                logger.error(f"Failed to reverse ledger for payment {payment.payment_number}: {str(e)}")

    # Reverse invoice update if linked
    if payment.invoice_id:
        invoice_result = await db.execute(select(Invoice).where(Invoice.id == payment.invoice_id))
        invoice = invoice_result.scalar_one_or_none()
        if invoice:
            invoice.amount_paid -= payment.net_amount
            invoice.amount_due = invoice.amount_after_tds - invoice.amount_paid
            if invoice.amount_due >= invoice.amount_after_tds:
                invoice.status = InvoiceStatus.SENT
            else:
                invoice.status = InvoiceStatus.PARTIAL

    await db.delete(payment)
    await db.commit()
    return Message(message="Payment deleted successfully")
