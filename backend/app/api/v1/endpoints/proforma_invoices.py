import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

from app.db.session import get_db
from app.models.proforma_invoice import ProformaInvoice, ProformaInvoiceItem, PIStatus
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.billing_schedule import BillingSchedule, ScheduleStatus
from app.models.bank_account import BankAccount
from app.models.user import User
from app.schemas.proforma_invoice import PICreate, PIUpdate, PIResponse, PIListResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user
from app.services.number_generator import generate_pi_number, generate_invoice_number

router = APIRouter()


def calculate_pi_item_amounts(item_data: dict, is_igst: bool) -> dict:
    """Calculate amounts for a PI item."""
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


@router.get("", response_model=PaginatedResponse[PIResponse])
async def get_proforma_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    branch_id: Optional[int] = None,
    client_id: Optional[int] = None,
    status_filter: Optional[PIStatus] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all proforma invoices with pagination and filtering."""
    query = select(ProformaInvoice).options(
        selectinload(ProformaInvoice.items),
        selectinload(ProformaInvoice.client),
        selectinload(ProformaInvoice.branch),
        selectinload(ProformaInvoice.bank_account).selectinload(BankAccount.branch)
    )

    if branch_id:
        query = query.where(ProformaInvoice.branch_id == branch_id)
    if client_id:
        query = query.where(ProformaInvoice.client_id == client_id)
    if status_filter:
        query = query.where(ProformaInvoice.status == status_filter)
    if from_date:
        query = query.where(ProformaInvoice.pi_date >= from_date)
    if to_date:
        query = query.where(ProformaInvoice.pi_date <= to_date)

    query = query.order_by(ProformaInvoice.pi_date.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/{pi_id}", response_model=PIResponse)
async def get_proforma_invoice(
    pi_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single proforma invoice by ID."""
    result = await db.execute(
        select(ProformaInvoice)
        .options(
            selectinload(ProformaInvoice.items),
            selectinload(ProformaInvoice.client),
            selectinload(ProformaInvoice.branch),
            selectinload(ProformaInvoice.bank_account).selectinload(BankAccount.branch)
        )
        .where(ProformaInvoice.id == pi_id)
    )
    pi = result.scalar_one_or_none()

    if not pi:
        raise HTTPException(status_code=404, detail="Proforma Invoice not found")

    return pi


@router.post("", response_model=PIResponse, status_code=status.HTTP_201_CREATED)
async def create_proforma_invoice(
    pi_data: PICreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new proforma invoice."""
    try:
        # Generate PI number
        pi_number = await generate_pi_number(db, datetime.combine(pi_data.pi_date, datetime.min.time()))

        # Create PI
        pi = ProformaInvoice(
            pi_number=pi_number,
            pi_date=pi_data.pi_date,
            client_id=pi_data.client_id,
            branch_id=pi_data.branch_id,
            bank_account_id=pi_data.bank_account_id,
            client_po_id=pi_data.client_po_id,
            billing_schedule_id=pi_data.billing_schedule_id,
            place_of_supply=pi_data.place_of_supply,
            place_of_supply_code=pi_data.place_of_supply_code,
            is_igst=pi_data.is_igst,
            reverse_charge=pi_data.reverse_charge,
            discount_percent=pi_data.discount_percent,
            tds_applicable=pi_data.tds_applicable,
            tds_section=pi_data.tds_section,
            tds_rate=pi_data.tds_rate,
            tcs_applicable=pi_data.tcs_applicable,
            tcs_rate=pi_data.tcs_rate,
            due_date=pi_data.due_date,
            valid_until=pi_data.valid_until,
            notes=pi_data.notes,
            terms_conditions=pi_data.terms_conditions,
            status=PIStatus.DRAFT,
        )

        # Calculate totals
        subtotal = Decimal('0')
        total_cgst = Decimal('0')
        total_sgst = Decimal('0')
        total_igst = Decimal('0')
        total_cess = Decimal('0')

        for item_data in pi_data.items:
            amounts = calculate_pi_item_amounts(item_data.model_dump(), pi_data.is_igst)

            item = ProformaInvoiceItem(
                serial_no=item_data.serial_no,
                item_id=item_data.item_id,
                item_name=item_data.item_name,
                description=item_data.description,
                hsn_sac=item_data.hsn_sac,
                quantity=item_data.quantity,
                unit=item_data.unit,
                rate=item_data.rate,
                discount_percent=item_data.discount_percent,
                gst_rate=item_data.gst_rate,
                cess_rate=item_data.cess_rate,
                **amounts
            )
            pi.items.append(item)

            subtotal += amounts['amount']
            total_cgst += amounts['cgst_amount']
            total_sgst += amounts['sgst_amount']
            total_igst += amounts['igst_amount']
            total_cess += amounts['cess_amount']

        # Apply overall discount if any
        discount_amount = subtotal * pi_data.discount_percent / 100
        taxable_amount = subtotal - discount_amount

        # Recalculate tax on discounted amount if overall discount
        if pi_data.discount_percent > 0:
            discount_factor = Decimal('1') - (pi_data.discount_percent / 100)
            total_cgst = total_cgst * discount_factor
            total_sgst = total_sgst * discount_factor
            total_igst = total_igst * discount_factor
            total_cess = total_cess * discount_factor

        total_amount = taxable_amount + total_cgst + total_sgst + total_igst + total_cess

        # TDS calculation
        tds_amount = Decimal('0')
        if pi_data.tds_applicable:
            tds_amount = taxable_amount * pi_data.tds_rate / 100

        # TCS calculation
        tcs_amount = Decimal('0')
        if pi_data.tcs_applicable:
            tcs_amount = total_amount * pi_data.tcs_rate / 100
            total_amount += tcs_amount

        amount_after_tds = total_amount - tds_amount

        pi.subtotal = subtotal
        pi.discount_amount = discount_amount
        pi.taxable_amount = taxable_amount
        pi.cgst_amount = total_cgst
        pi.sgst_amount = total_sgst
        pi.igst_amount = total_igst
        pi.cess_amount = total_cess
        pi.total_amount = total_amount
        pi.tds_amount = tds_amount
        pi.tcs_amount = tcs_amount
        pi.amount_after_tds = amount_after_tds

        db.add(pi)

        # Update billing schedule if linked
        if pi_data.billing_schedule_id:
            schedule_result = await db.execute(
                select(BillingSchedule).where(BillingSchedule.id == pi_data.billing_schedule_id)
            )
            schedule = schedule_result.scalar_one_or_none()
            if schedule:
                schedule.proforma_invoice_id = pi.id
                schedule.status = ScheduleStatus.PI_RAISED

        await db.commit()
        await db.refresh(pi)

        # Reload with relationships
        result = await db.execute(
            select(ProformaInvoice)
            .options(
                selectinload(ProformaInvoice.items),
                selectinload(ProformaInvoice.client),
                selectinload(ProformaInvoice.branch),
                selectinload(ProformaInvoice.bank_account).selectinload(BankAccount.branch)
            )
            .where(ProformaInvoice.id == pi.id)
        )
        return result.scalar_one()

    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating proforma invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create proforma invoice: {str(e)}"
        )


@router.patch("/{pi_id}", response_model=PIResponse)
async def update_proforma_invoice(
    pi_id: int,
    pi_data: PIUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a proforma invoice. Only DRAFT PIs can be updated."""
    result = await db.execute(
        select(ProformaInvoice)
        .options(selectinload(ProformaInvoice.items))
        .where(ProformaInvoice.id == pi_id)
    )
    pi = result.scalar_one_or_none()

    if not pi:
        raise HTTPException(status_code=404, detail="Proforma Invoice not found")

    if pi.status != PIStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Only DRAFT proforma invoices can be updated"
        )

    try:
        # Update basic fields
        update_fields = pi_data.model_dump(exclude_unset=True, exclude={'items'})
        # Debug: Log what fields are being updated
        logger.info(f"PI Update - Fields received: bank_account_id={pi_data.bank_account_id}, tds_section={pi_data.tds_section}, notes={pi_data.notes}")
        logger.info(f"PI Update - Update fields: {list(update_fields.keys())}")
        for field, value in update_fields.items():
            if hasattr(pi, field):
                setattr(pi, field, value)

        # Update items if provided
        if pi_data.items is not None:
            # Remove existing items
            for item in pi.items:
                await db.delete(item)

            pi.items = []

            # Calculate totals
            subtotal = Decimal('0')
            total_cgst = Decimal('0')
            total_sgst = Decimal('0')
            total_igst = Decimal('0')
            total_cess = Decimal('0')

            is_igst = pi_data.is_igst if pi_data.is_igst is not None else pi.is_igst

            for item_data in pi_data.items:
                amounts = calculate_pi_item_amounts(item_data.model_dump(), is_igst)

                item = ProformaInvoiceItem(
                    proforma_invoice_id=pi.id,
                    serial_no=item_data.serial_no,
                    item_id=item_data.item_id,
                    item_name=item_data.item_name,
                    description=item_data.description,
                    hsn_sac=item_data.hsn_sac,
                    quantity=item_data.quantity,
                    unit=item_data.unit,
                    rate=item_data.rate,
                    discount_percent=item_data.discount_percent,
                    gst_rate=item_data.gst_rate,
                    cess_rate=item_data.cess_rate,
                    **amounts
                )
                pi.items.append(item)

                subtotal += amounts['amount']
                total_cgst += amounts['cgst_amount']
                total_sgst += amounts['sgst_amount']
                total_igst += amounts['igst_amount']
                total_cess += amounts['cess_amount']

            # Apply overall discount
            discount_percent = pi_data.discount_percent if pi_data.discount_percent is not None else pi.discount_percent
            discount_amount = subtotal * discount_percent / 100
            taxable_amount = subtotal - discount_amount

            if discount_percent > 0:
                discount_factor = Decimal('1') - (discount_percent / 100)
                total_cgst = total_cgst * discount_factor
                total_sgst = total_sgst * discount_factor
                total_igst = total_igst * discount_factor
                total_cess = total_cess * discount_factor

            total_amount = taxable_amount + total_cgst + total_sgst + total_igst + total_cess

            # TDS
            tds_applicable = pi_data.tds_applicable if pi_data.tds_applicable is not None else pi.tds_applicable
            tds_rate = pi_data.tds_rate if pi_data.tds_rate is not None else pi.tds_rate
            tds_amount = Decimal('0')
            if tds_applicable:
                tds_amount = taxable_amount * tds_rate / 100

            # TCS
            tcs_applicable = pi_data.tcs_applicable if pi_data.tcs_applicable is not None else pi.tcs_applicable
            tcs_rate = pi_data.tcs_rate if pi_data.tcs_rate is not None else pi.tcs_rate
            tcs_amount = Decimal('0')
            if tcs_applicable:
                tcs_amount = total_amount * tcs_rate / 100
                total_amount += tcs_amount

            amount_after_tds = total_amount - tds_amount

            pi.subtotal = subtotal
            pi.discount_amount = discount_amount
            pi.taxable_amount = taxable_amount
            pi.cgst_amount = total_cgst
            pi.sgst_amount = total_sgst
            pi.igst_amount = total_igst
            pi.cess_amount = total_cess
            pi.total_amount = total_amount
            pi.tds_amount = tds_amount
            pi.tcs_amount = tcs_amount
            pi.amount_after_tds = amount_after_tds

        await db.commit()
        await db.refresh(pi)

        # Reload with relationships
        result = await db.execute(
            select(ProformaInvoice)
            .options(
                selectinload(ProformaInvoice.items),
                selectinload(ProformaInvoice.client),
                selectinload(ProformaInvoice.branch),
                selectinload(ProformaInvoice.bank_account).selectinload(BankAccount.branch)
            )
            .where(ProformaInvoice.id == pi.id)
        )
        return result.scalar_one()

    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating proforma invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update proforma invoice: {str(e)}"
        )


@router.patch("/{pi_id}/status", response_model=PIResponse)
async def update_pi_status(
    pi_id: int,
    status_update: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update proforma invoice status (DRAFT -> SENT)."""
    result = await db.execute(
        select(ProformaInvoice)
        .options(
            selectinload(ProformaInvoice.items),
            selectinload(ProformaInvoice.client),
            selectinload(ProformaInvoice.branch),
            selectinload(ProformaInvoice.bank_account).selectinload(BankAccount.branch)
        )
        .where(ProformaInvoice.id == pi_id)
    )
    pi = result.scalar_one_or_none()

    if not pi:
        raise HTTPException(status_code=404, detail="Proforma Invoice not found")

    if pi.status == PIStatus.GENERATED:
        raise HTTPException(
            status_code=400,
            detail="Cannot change status of a PI that has already generated an invoice"
        )

    try:
        new_status = PIStatus(status_update)
        pi.status = new_status
        await db.commit()
        await db.refresh(pi)
        return pi
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status_update}")


@router.post("/{pi_id}/generate-invoice", response_model=dict)
async def generate_invoice_from_pi(
    pi_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an Invoice from a Proforma Invoice."""
    result = await db.execute(
        select(ProformaInvoice)
        .options(selectinload(ProformaInvoice.items))
        .where(ProformaInvoice.id == pi_id)
    )
    pi = result.scalar_one_or_none()

    if not pi:
        raise HTTPException(status_code=404, detail="Proforma Invoice not found")

    if pi.status == PIStatus.GENERATED:
        raise HTTPException(
            status_code=400,
            detail="Invoice has already been generated from this PI"
        )

    try:
        # Generate invoice number
        invoice_number = await generate_invoice_number(db, "SALES")

        # Create Invoice from PI
        invoice = Invoice(
            invoice_number=invoice_number,
            invoice_date=date.today(),
            invoice_type=InvoiceType.SALES,
            client_id=pi.client_id,
            branch_id=pi.branch_id,
            bank_account_id=pi.bank_account_id,
            client_po_id=pi.client_po_id,
            billing_schedule_id=pi.billing_schedule_id,
            place_of_supply=pi.place_of_supply,
            place_of_supply_code=pi.place_of_supply_code,
            is_igst=pi.is_igst,
            reverse_charge=pi.reverse_charge,
            subtotal=pi.subtotal,
            discount_percent=pi.discount_percent,
            discount_amount=pi.discount_amount,
            taxable_amount=pi.taxable_amount,
            cgst_amount=pi.cgst_amount,
            sgst_amount=pi.sgst_amount,
            igst_amount=pi.igst_amount,
            cess_amount=pi.cess_amount,
            round_off=pi.round_off,
            total_amount=pi.total_amount,
            tds_applicable=pi.tds_applicable,
            tds_section=pi.tds_section,
            tds_rate=pi.tds_rate,
            tds_amount=pi.tds_amount,
            tcs_applicable=pi.tcs_applicable,
            tcs_rate=pi.tcs_rate,
            tcs_amount=pi.tcs_amount,
            amount_after_tds=pi.amount_after_tds,
            amount_due=pi.amount_after_tds,
            amount_paid=Decimal('0'),
            due_date=pi.due_date,
            status=InvoiceStatus.DRAFT,
            notes=pi.notes,
            terms_conditions=pi.terms_conditions,
        )

        # Copy items
        for pi_item in pi.items:
            invoice_item = InvoiceItem(
                serial_no=pi_item.serial_no,
                description=pi_item.description,
                hsn_sac=pi_item.hsn_sac,
                quantity=pi_item.quantity,
                unit=pi_item.unit,
                rate=pi_item.rate,
                amount=pi_item.amount,
                discount_percent=pi_item.discount_percent,
                discount_amount=pi_item.discount_amount,
                taxable_amount=pi_item.taxable_amount,
                gst_rate=pi_item.gst_rate,
                cgst_rate=pi_item.cgst_rate,
                cgst_amount=pi_item.cgst_amount,
                sgst_rate=pi_item.sgst_rate,
                sgst_amount=pi_item.sgst_amount,
                igst_rate=pi_item.igst_rate,
                igst_amount=pi_item.igst_amount,
                cess_rate=pi_item.cess_rate,
                cess_amount=pi_item.cess_amount,
                total_amount=pi_item.total_amount,
            )
            invoice.items.append(invoice_item)

        db.add(invoice)

        # Update PI status
        pi.status = PIStatus.GENERATED
        pi.invoice_id = invoice.id

        # Update billing schedule if linked
        if pi.billing_schedule_id:
            schedule_result = await db.execute(
                select(BillingSchedule).where(BillingSchedule.id == pi.billing_schedule_id)
            )
            schedule = schedule_result.scalar_one_or_none()
            if schedule:
                schedule.invoice_id = invoice.id
                schedule.status = ScheduleStatus.INVOICED

        await db.commit()
        await db.refresh(invoice)

        return {
            "message": "Invoice generated successfully",
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Error generating invoice from PI: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate invoice: {str(e)}"
        )


@router.delete("/{pi_id}", response_model=Message)
async def delete_proforma_invoice(
    pi_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a proforma invoice. Only DRAFT PIs can be deleted."""
    result = await db.execute(
        select(ProformaInvoice).where(ProformaInvoice.id == pi_id)
    )
    pi = result.scalar_one_or_none()

    if not pi:
        raise HTTPException(status_code=404, detail="Proforma Invoice not found")

    if pi.status != PIStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Only DRAFT proforma invoices can be deleted"
        )

    try:
        # Reset billing schedule if linked
        if pi.billing_schedule_id:
            schedule_result = await db.execute(
                select(BillingSchedule).where(BillingSchedule.id == pi.billing_schedule_id)
            )
            schedule = schedule_result.scalar_one_or_none()
            if schedule:
                schedule.proforma_invoice_id = None
                schedule.status = ScheduleStatus.PENDING

        await db.delete(pi)
        await db.commit()
        return {"message": "Proforma Invoice deleted successfully"}

    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting proforma invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete proforma invoice: {str(e)}"
        )
