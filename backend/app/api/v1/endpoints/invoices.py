from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.client import Client
from app.models.vendor import Vendor
from app.models.user import User
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceItemCreate
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user
from app.services.number_generator import generate_invoice_number

router = APIRouter()


def calculate_invoice_item_amounts(item_data: dict, is_igst: bool) -> dict:
    """Calculate amounts for an invoice item."""
    quantity = Decimal(str(item_data['quantity']))
    rate = Decimal(str(item_data['rate']))
    discount_percent = Decimal(str(item_data.get('discount_percent', 0)))
    gst_rate = Decimal(str(item_data.get('gst_rate', 18)))
    cess_rate = Decimal(str(item_data.get('cess_rate', 0)))

    amount = quantity * rate
    discount_amount = amount * discount_percent / 100
    taxable_amount = amount - discount_amount

    gst_amount = taxable_amount * gst_rate / 100
    cess_amount = taxable_amount * cess_rate / 100

    if is_igst:
        cgst_rate = Decimal('0')
        sgst_rate = Decimal('0')
        igst_rate = gst_rate
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = gst_amount
    else:
        cgst_rate = gst_rate / 2
        sgst_rate = gst_rate / 2
        igst_rate = Decimal('0')
        cgst_amount = gst_amount / 2
        sgst_amount = gst_amount / 2
        igst_amount = Decimal('0')

    total_amount = taxable_amount + gst_amount + cess_amount

    return {
        'amount': amount,
        'discount_amount': discount_amount,
        'taxable_amount': taxable_amount,
        'cgst_rate': cgst_rate,
        'cgst_amount': cgst_amount,
        'sgst_rate': sgst_rate,
        'sgst_amount': sgst_amount,
        'igst_rate': igst_rate,
        'igst_amount': igst_amount,
        'cess_amount': cess_amount,
        'total_amount': total_amount,
    }


@router.get("", response_model=PaginatedResponse[InvoiceResponse])
async def get_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    invoice_type: Optional[InvoiceType] = None,
    client_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    status_filter: Optional[InvoiceStatus] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all invoices with pagination."""
    query = select(Invoice).options(
        selectinload(Invoice.items),
        selectinload(Invoice.client),
        selectinload(Invoice.vendor)
    )

    if invoice_type:
        query = query.where(Invoice.invoice_type == invoice_type)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if vendor_id:
        query = query.where(Invoice.vendor_id == vendor_id)
    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if from_date:
        query = query.where(Invoice.invoice_date >= from_date)
    if to_date:
        query = query.where(Invoice.invoice_date <= to_date)

    query = query.order_by(Invoice.invoice_date.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    invoices = result.scalars().all()

    return PaginatedResponse(
        items=[InvoiceResponse.model_validate(inv) for inv in invoices],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific invoice."""
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.client),
            selectinload(Invoice.vendor)
        )
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return invoice


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new invoice."""
    # Validate client/vendor based on invoice type
    if invoice_data.invoice_type in [InvoiceType.SALES, InvoiceType.CREDIT_NOTE]:
        if not invoice_data.client_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client is required for sales invoice")
        client_result = await db.execute(select(Client).where(Client.id == invoice_data.client_id))
        if not client_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client not found")
    else:
        if not invoice_data.vendor_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vendor is required for purchase invoice")
        vendor_result = await db.execute(select(Vendor).where(Vendor.id == invoice_data.vendor_id))
        if not vendor_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vendor not found")

    # Generate invoice number
    invoice_number = await generate_invoice_number(db, invoice_data.invoice_type.value)

    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        invoice_date=invoice_data.invoice_date,
        invoice_type=invoice_data.invoice_type,
        client_id=invoice_data.client_id,
        vendor_id=invoice_data.vendor_id,
        po_id=invoice_data.po_id,
        place_of_supply=invoice_data.place_of_supply,
        place_of_supply_code=invoice_data.place_of_supply_code,
        is_igst=invoice_data.is_igst,
        reverse_charge=invoice_data.reverse_charge,
        discount_percent=invoice_data.discount_percent,
        tds_applicable=invoice_data.tds_applicable,
        tds_section=invoice_data.tds_section,
        tds_rate=invoice_data.tds_rate,
        tcs_applicable=invoice_data.tcs_applicable,
        tcs_rate=invoice_data.tcs_rate,
        due_date=invoice_data.due_date,
        notes=invoice_data.notes,
        terms_conditions=invoice_data.terms_conditions,
        status=InvoiceStatus.DRAFT,
    )

    # Calculate item amounts
    subtotal = Decimal('0')
    total_cgst = Decimal('0')
    total_sgst = Decimal('0')
    total_igst = Decimal('0')
    total_cess = Decimal('0')

    for item_data in invoice_data.items:
        item_dict = item_data.model_dump()
        amounts = calculate_invoice_item_amounts(item_dict, invoice_data.is_igst)

        item = InvoiceItem(
            **item_dict,
            **amounts,
        )
        invoice.items.append(item)

        subtotal += amounts['taxable_amount']
        total_cgst += amounts['cgst_amount']
        total_sgst += amounts['sgst_amount']
        total_igst += amounts['igst_amount']
        total_cess += amounts['cess_amount']

    # Calculate totals
    discount_amount = subtotal * invoice_data.discount_percent / 100
    taxable_amount = subtotal - discount_amount
    total_tax = total_cgst + total_sgst + total_igst + total_cess
    total_before_round = taxable_amount + total_tax

    # Round off
    round_off = round(total_before_round) - total_before_round
    total_amount = round(total_before_round)

    # TDS/TCS
    tds_amount = taxable_amount * invoice_data.tds_rate / 100 if invoice_data.tds_applicable else Decimal('0')
    tcs_amount = total_amount * invoice_data.tcs_rate / 100 if invoice_data.tcs_applicable else Decimal('0')
    amount_after_tds = total_amount - tds_amount + tcs_amount

    invoice.subtotal = subtotal
    invoice.discount_amount = discount_amount
    invoice.taxable_amount = taxable_amount
    invoice.cgst_amount = total_cgst
    invoice.sgst_amount = total_sgst
    invoice.igst_amount = total_igst
    invoice.cess_amount = total_cess
    invoice.round_off = round_off
    invoice.total_amount = total_amount
    invoice.tds_amount = tds_amount
    invoice.tcs_amount = tcs_amount
    invoice.amount_after_tds = amount_after_tds
    invoice.amount_due = amount_after_tds
    invoice.amount_paid = Decimal('0')

    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)

    # Reload with relationships
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.client),
            selectinload(Invoice.vendor)
        )
        .where(Invoice.id == invoice.id)
    )
    return result.scalar_one()


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an invoice (only if in DRAFT status)."""
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only edit invoices in DRAFT status"
        )

    # Update basic fields
    update_data = invoice_data.model_dump(exclude={'items'}, exclude_unset=True)
    for field, value in update_data.items():
        setattr(invoice, field, value)

    # Update items if provided
    if invoice_data.items is not None:
        # Delete existing items
        for item in invoice.items:
            await db.delete(item)

        # Recalculate with new items
        subtotal = Decimal('0')
        total_cgst = Decimal('0')
        total_sgst = Decimal('0')
        total_igst = Decimal('0')
        total_cess = Decimal('0')

        for item_data in invoice_data.items:
            item_dict = item_data.model_dump()
            amounts = calculate_invoice_item_amounts(item_dict, invoice.is_igst)

            item = InvoiceItem(
                **item_dict,
                **amounts,
            )
            invoice.items.append(item)

            subtotal += amounts['taxable_amount']
            total_cgst += amounts['cgst_amount']
            total_sgst += amounts['sgst_amount']
            total_igst += amounts['igst_amount']
            total_cess += amounts['cess_amount']

        # Recalculate totals
        discount_amount = subtotal * invoice.discount_percent / 100
        taxable_amount = subtotal - discount_amount
        total_tax = total_cgst + total_sgst + total_igst + total_cess
        total_before_round = taxable_amount + total_tax

        round_off = round(total_before_round) - total_before_round
        total_amount = round(total_before_round)

        tds_amount = taxable_amount * invoice.tds_rate / 100 if invoice.tds_applicable else Decimal('0')
        tcs_amount = total_amount * invoice.tcs_rate / 100 if invoice.tcs_applicable else Decimal('0')
        amount_after_tds = total_amount - tds_amount + tcs_amount

        invoice.subtotal = subtotal
        invoice.discount_amount = discount_amount
        invoice.taxable_amount = taxable_amount
        invoice.cgst_amount = total_cgst
        invoice.sgst_amount = total_sgst
        invoice.igst_amount = total_igst
        invoice.cess_amount = total_cess
        invoice.round_off = round_off
        invoice.total_amount = total_amount
        invoice.tds_amount = tds_amount
        invoice.tcs_amount = tcs_amount
        invoice.amount_after_tds = amount_after_tds
        invoice.amount_due = amount_after_tds - invoice.amount_paid

    await db.commit()
    await db.refresh(invoice)

    # Reload with relationships
    result = await db.execute(
        select(Invoice)
        .options(
            selectinload(Invoice.items),
            selectinload(Invoice.client),
            selectinload(Invoice.vendor)
        )
        .where(Invoice.id == invoice.id)
    )
    return result.scalar_one()


@router.patch("/{invoice_id}/status", response_model=InvoiceResponse)
async def update_invoice_status(
    invoice_id: int,
    status_update: InvoiceStatus,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update invoice status."""
    result = await db.execute(
        select(Invoice).options(selectinload(Invoice.items)).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    invoice.status = status_update
    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}", response_model=Message)
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an invoice (only if in DRAFT status)."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete invoices in DRAFT status"
        )

    await db.delete(invoice)
    await db.commit()
    return Message(message="Invoice deleted successfully")
