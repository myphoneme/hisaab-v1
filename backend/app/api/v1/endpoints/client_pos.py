from typing import Optional, List
from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.client_po import ClientPO, ClientPOItem, ClientPOStatus, BillingFrequency
from app.models.billing_schedule import BillingSchedule, ScheduleStatus
from app.models.client import Client
from app.models.branch import Branch
from app.models.user import User
from app.schemas.client_po import (
    ClientPOCreate,
    ClientPOUpdate,
    ClientPOResponse,
    ClientPOWithItemsResponse,
    ClientPOListResponse,
    ClientPOStatusUpdate,
)
from app.schemas.billing_schedule import (
    BillingScheduleCreate,
    BillingScheduleUpdate,
    BillingScheduleResponse,
    BillingScheduleStatusUpdate,
    GenerateSchedulesRequest,
    CreateInvoiceFromScheduleRequest,
)
from app.schemas.invoice import InvoiceResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user
from app.services.number_generator import generate_client_po_number
from app.services.fulfillment import create_invoice_from_schedule as create_invoice_service, create_pi_from_schedule as create_pi_service
from app.models.invoice import Invoice
from app.models.proforma_invoice import ProformaInvoice
from app.models.bank_account import BankAccount
from app.schemas.proforma_invoice import PIResponse

router = APIRouter()


def calculate_gst_amounts(item_data: dict, is_igst: bool) -> dict:
    """Calculate GST amounts for an item."""
    amount = Decimal(str(item_data.get('amount', 0)))
    gst_rate = Decimal(str(item_data.get('gst_rate', 18)))

    gst_amount = amount * gst_rate / 100

    if is_igst:
        return {
            'cgst_amount': Decimal('0'),
            'sgst_amount': Decimal('0'),
            'igst_amount': gst_amount,
            'total_amount': amount + gst_amount,
        }
    else:
        half_gst = gst_amount / 2
        return {
            'cgst_amount': half_gst,
            'sgst_amount': half_gst,
            'igst_amount': Decimal('0'),
            'total_amount': amount + gst_amount,
        }


def calculate_po_totals(items: List[dict], is_igst: bool, discount_percent: Decimal = Decimal('0'), discount_amount: Decimal = Decimal('0')) -> dict:
    """Calculate PO totals from items."""
    subtotal = sum(Decimal(str(item.get('amount', 0))) for item in items)

    # Apply discount
    if discount_percent > 0:
        discount_amount = subtotal * discount_percent / 100
    taxable_amount = subtotal - discount_amount

    # Calculate GST
    total_cgst = Decimal('0')
    total_sgst = Decimal('0')
    total_igst = Decimal('0')

    for item in items:
        gst_rate = Decimal(str(item.get('gst_rate', 18)))
        item_taxable = Decimal(str(item.get('amount', 0))) * (1 - discount_percent / 100) if discount_percent > 0 else Decimal(str(item.get('amount', 0)))
        gst_amount = item_taxable * gst_rate / 100

        if is_igst:
            total_igst += gst_amount
        else:
            total_cgst += gst_amount / 2
            total_sgst += gst_amount / 2

    total_amount = taxable_amount + total_cgst + total_sgst + total_igst

    return {
        'subtotal': subtotal,
        'discount_percent': discount_percent,
        'discount_amount': discount_amount,
        'taxable_amount': taxable_amount,
        'cgst_amount': total_cgst,
        'sgst_amount': total_sgst,
        'igst_amount': total_igst,
        'total_amount': total_amount,
        'remaining_amount': total_amount,
    }


@router.get("", response_model=PaginatedResponse[ClientPOListResponse])
async def get_client_pos(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    client_id: Optional[int] = None,
    status_filter: Optional[ClientPOStatus] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all Client POs with pagination and filtering."""
    query = select(ClientPO).options(
        selectinload(ClientPO.client),
        selectinload(ClientPO.branch)
    )

    if search:
        query = query.where(
            (ClientPO.internal_number.ilike(f"%{search}%")) |
            (ClientPO.client_po_number.ilike(f"%{search}%")) |
            (ClientPO.subject.ilike(f"%{search}%"))
        )

    if client_id:
        query = query.where(ClientPO.client_id == client_id)

    if status_filter:
        query = query.where(ClientPO.status == status_filter)

    if from_date:
        query = query.where(ClientPO.received_date >= from_date)

    if to_date:
        query = query.where(ClientPO.received_date <= to_date)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(ClientPO.received_date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    client_pos = result.scalars().all()

    items_list = []
    for cpo in client_pos:
        items_list.append(ClientPOListResponse(
            id=cpo.id,
            internal_number=cpo.internal_number,
            client_po_number=cpo.client_po_number,
            client_po_date=cpo.client_po_date,
            received_date=cpo.received_date,
            client_id=cpo.client_id,
            client_name=cpo.client.name if cpo.client else "",
            branch_id=cpo.branch_id,
            branch_name=cpo.branch.branch_name if cpo.branch else None,
            subject=cpo.subject,
            valid_from=cpo.valid_from,
            valid_until=cpo.valid_until,
            billing_frequency=cpo.billing_frequency,
            total_amount=cpo.total_amount,
            invoiced_amount=cpo.invoiced_amount,
            remaining_amount=cpo.remaining_amount,
            status=cpo.status,
            created_at=cpo.created_at,
        ))

    return PaginatedResponse(
        items=items_list,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{po_id}", response_model=ClientPOWithItemsResponse)
async def get_client_po(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific Client PO with items."""
    result = await db.execute(
        select(ClientPO)
        .options(
            selectinload(ClientPO.items),
            selectinload(ClientPO.client),
            selectinload(ClientPO.branch),
            selectinload(ClientPO.billing_schedules)
        )
        .where(ClientPO.id == po_id)
    )
    client_po = result.scalar_one_or_none()

    if not client_po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client PO not found")

    return ClientPOWithItemsResponse(
        **ClientPOResponse.model_validate(client_po).model_dump(),
        items=[item for item in client_po.items],
        client_name=client_po.client.name if client_po.client else None,
        branch_name=client_po.branch.branch_name if client_po.branch else None,
    )


@router.post("", response_model=ClientPOWithItemsResponse, status_code=status.HTTP_201_CREATED)
async def create_client_po(
    po_data: ClientPOCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new Client PO."""
    # Validate client exists
    client_result = await db.execute(select(Client).where(Client.id == po_data.client_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client not found")

    # Validate branch if provided
    branch = None
    if po_data.branch_id:
        branch_result = await db.execute(select(Branch).where(Branch.id == po_data.branch_id))
        branch = branch_result.scalar_one_or_none()
        if not branch:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Branch not found")

    # Generate internal number
    internal_number = await generate_client_po_number(db)

    # Calculate totals
    items_dict = [item.model_dump() for item in po_data.items]
    totals = calculate_po_totals(
        items_dict,
        po_data.is_igst,
        po_data.discount_percent,
        po_data.discount_amount
    )

    # Create Client PO
    client_po = ClientPO(
        internal_number=internal_number,
        client_po_number=po_data.client_po_number,
        client_po_date=po_data.client_po_date,
        received_date=po_data.received_date,
        client_id=po_data.client_id,
        branch_id=po_data.branch_id,
        subject=po_data.subject,
        notes=po_data.notes,
        valid_from=po_data.valid_from,
        valid_until=po_data.valid_until,
        billing_frequency=po_data.billing_frequency,
        place_of_supply=po_data.place_of_supply,
        place_of_supply_code=po_data.place_of_supply_code,
        is_igst=po_data.is_igst,
        **totals,
        status=ClientPOStatus.DRAFT,
    )

    db.add(client_po)
    await db.flush()

    # Create items
    for item_data in po_data.items:
        item_dict = item_data.model_dump()
        gst_amounts = calculate_gst_amounts(item_dict, po_data.is_igst)
        # Remove GST fields from item_dict to avoid duplicate keys (we'll use calculated values)
        for key in ['cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount']:
            item_dict.pop(key, None)
        item = ClientPOItem(
            client_po_id=client_po.id,
            **item_dict,
            **gst_amounts,
            remaining_quantity=item_dict.get('quantity', Decimal('1')),
        )
        db.add(item)

    await db.commit()
    await db.refresh(client_po)

    # Reload with relationships
    result = await db.execute(
        select(ClientPO)
        .options(selectinload(ClientPO.items), selectinload(ClientPO.client), selectinload(ClientPO.branch))
        .where(ClientPO.id == client_po.id)
    )
    client_po = result.scalar_one()

    return ClientPOWithItemsResponse(
        **ClientPOResponse.model_validate(client_po).model_dump(),
        items=[item for item in client_po.items],
        client_name=client_po.client.name if client_po.client else None,
        branch_name=client_po.branch.branch_name if client_po.branch else None,
    )


@router.patch("/{po_id}", response_model=ClientPOWithItemsResponse)
async def update_client_po(
    po_id: int,
    po_data: ClientPOUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a Client PO."""
    result = await db.execute(
        select(ClientPO)
        .options(selectinload(ClientPO.items))
        .where(ClientPO.id == po_id)
    )
    client_po = result.scalar_one_or_none()

    if not client_po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client PO not found")

    if client_po.status not in [ClientPOStatus.DRAFT, ClientPOStatus.ACTIVE]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot edit PO in current status")

    update_data = po_data.model_dump(exclude_unset=True)

    # Update items if provided
    if 'items' in update_data:
        # Delete existing items
        for item in client_po.items:
            await db.delete(item)

        # Create new items
        items_dict = [item.model_dump() for item in po_data.items]
        is_igst = update_data.get('is_igst', client_po.is_igst)
        discount_percent = update_data.get('discount_percent', client_po.discount_percent)
        discount_amount = update_data.get('discount_amount', client_po.discount_amount)

        totals = calculate_po_totals(items_dict, is_igst, discount_percent, discount_amount)

        for item_data in po_data.items:
            item_dict = item_data.model_dump()
            gst_amounts = calculate_gst_amounts(item_dict, is_igst)
            # Remove GST fields from item_dict to avoid duplicate keys (we'll use calculated values)
            for key in ['cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount']:
                item_dict.pop(key, None)
            item = ClientPOItem(
                client_po_id=client_po.id,
                **item_dict,
                **gst_amounts,
                remaining_quantity=item_dict.get('quantity', Decimal('1')),
            )
            db.add(item)

        # Update totals
        for key, value in totals.items():
            setattr(client_po, key, value)

        del update_data['items']

    # Update other fields
    for field, value in update_data.items():
        setattr(client_po, field, value)

    await db.commit()
    await db.refresh(client_po)

    # Reload with relationships
    result = await db.execute(
        select(ClientPO)
        .options(selectinload(ClientPO.items), selectinload(ClientPO.client), selectinload(ClientPO.branch))
        .where(ClientPO.id == client_po.id)
    )
    client_po = result.scalar_one()

    return ClientPOWithItemsResponse(
        **ClientPOResponse.model_validate(client_po).model_dump(),
        items=[item for item in client_po.items],
        client_name=client_po.client.name if client_po.client else None,
        branch_name=client_po.branch.branch_name if client_po.branch else None,
    )


@router.patch("/{po_id}/status", response_model=ClientPOResponse)
async def update_client_po_status(
    po_id: int,
    status_data: ClientPOStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update Client PO status."""
    result = await db.execute(select(ClientPO).where(ClientPO.id == po_id))
    client_po = result.scalar_one_or_none()

    if not client_po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client PO not found")

    client_po.status = status_data.status
    await db.commit()
    await db.refresh(client_po)
    return client_po


@router.delete("/{po_id}", response_model=Message)
async def delete_client_po(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a Client PO (only DRAFT status)."""
    result = await db.execute(select(ClientPO).where(ClientPO.id == po_id))
    client_po = result.scalar_one_or_none()

    if not client_po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client PO not found")

    if client_po.status != ClientPOStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only DRAFT POs can be deleted")

    await db.delete(client_po)
    await db.commit()
    return Message(message="Client PO deleted successfully")


# ==================== Billing Schedules ====================

@router.get("/{po_id}/schedules", response_model=List[BillingScheduleResponse])
async def get_billing_schedules(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get billing schedules for a Client PO."""
    result = await db.execute(
        select(BillingSchedule)
        .where(BillingSchedule.client_po_id == po_id)
        .order_by(BillingSchedule.installment_number)
    )
    schedules = result.scalars().all()
    return schedules


@router.post("/{po_id}/schedules/generate", response_model=List[BillingScheduleResponse])
async def generate_billing_schedules(
    po_id: int,
    request: GenerateSchedulesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Auto-generate billing schedules based on billing frequency."""
    result = await db.execute(select(ClientPO).where(ClientPO.id == po_id))
    client_po = result.scalar_one_or_none()

    if not client_po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client PO not found")

    if client_po.billing_frequency == BillingFrequency.ONE_TIME:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot generate schedules for ONE_TIME billing")

    if client_po.billing_frequency == BillingFrequency.MILESTONE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Use manual schedule creation for MILESTONE billing")

    # Delete existing pending schedules
    await db.execute(
        BillingSchedule.__table__.delete().where(
            (BillingSchedule.client_po_id == po_id) &
            (BillingSchedule.status == ScheduleStatus.PENDING)
        )
    )

    # Determine number of installments
    start_date = request.start_date
    end_date = request.end_date or client_po.valid_until

    if not end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date is required")

    schedules = []
    current_date = start_date
    installment = 1

    if client_po.billing_frequency == BillingFrequency.MONTHLY:
        delta = relativedelta(months=1)
    elif client_po.billing_frequency == BillingFrequency.QUARTERLY:
        delta = relativedelta(months=3)
    elif client_po.billing_frequency == BillingFrequency.HALF_YEARLY:
        delta = relativedelta(months=6)
    elif client_po.billing_frequency == BillingFrequency.YEARLY:
        delta = relativedelta(years=1)

    # Count total installments (exclusive of end date for proper period calculation)
    # For example: Dec 2025 to Dec 2026 = 12 months, not 13
    temp_date = start_date
    total_installments = 0
    while temp_date < end_date:
        total_installments += 1
        temp_date += delta

    # Ensure at least 1 installment
    if total_installments == 0:
        total_installments = 1

    # Calculate amount per installment
    amount_per_installment = client_po.taxable_amount / total_installments if total_installments > 0 else Decimal('0')
    gst_per_installment = (client_po.cgst_amount + client_po.sgst_amount + client_po.igst_amount) / total_installments if total_installments > 0 else Decimal('0')

    while current_date < end_date:
        month_name = current_date.strftime("%B %Y")
        schedule = BillingSchedule(
            client_po_id=po_id,
            installment_number=installment,
            description=f"{client_po.billing_frequency.value} - {month_name}",
            due_date=current_date,
            amount=amount_per_installment,
            gst_amount=gst_per_installment,
            total_amount=amount_per_installment + gst_per_installment,
            status=ScheduleStatus.PENDING,
        )
        db.add(schedule)
        schedules.append(schedule)
        installment += 1
        current_date += delta

    await db.commit()

    # Refresh all schedules
    for schedule in schedules:
        await db.refresh(schedule)

    return schedules


@router.post("/{po_id}/schedules", response_model=BillingScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_schedule(
    po_id: int,
    schedule_data: BillingScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually create a billing schedule (for MILESTONE billing)."""
    if schedule_data.client_po_id != po_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PO ID mismatch")

    result = await db.execute(select(ClientPO).where(ClientPO.id == po_id))
    client_po = result.scalar_one_or_none()

    if not client_po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client PO not found")

    schedule = BillingSchedule(**schedule_data.model_dump())
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.patch("/{po_id}/schedules/{schedule_id}", response_model=BillingScheduleResponse)
async def update_billing_schedule(
    po_id: int,
    schedule_id: int,
    schedule_data: BillingScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a billing schedule."""
    result = await db.execute(
        select(BillingSchedule).where(
            (BillingSchedule.id == schedule_id) &
            (BillingSchedule.client_po_id == po_id)
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    if schedule.status != ScheduleStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only edit PENDING schedules")

    update_data = schedule_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    await db.commit()
    await db.refresh(schedule)
    return schedule


@router.delete("/{po_id}/schedules/{schedule_id}", response_model=Message)
async def delete_billing_schedule(
    po_id: int,
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a billing schedule (PENDING only)."""
    result = await db.execute(
        select(BillingSchedule).where(
            (BillingSchedule.id == schedule_id) &
            (BillingSchedule.client_po_id == po_id)
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    if schedule.status != ScheduleStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only delete PENDING schedules")

    await db.delete(schedule)
    await db.commit()
    return Message(message="Schedule deleted successfully")


@router.post("/{po_id}/schedules/{schedule_id}/create-invoice", response_model=InvoiceResponse)
async def create_invoice_from_schedule(
    po_id: int,
    schedule_id: int,
    request: CreateInvoiceFromScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create an invoice from a billing schedule.

    This will:
    1. Create a SALES invoice with schedule amounts
    2. Update the schedule status to INVOICED
    3. Update the ClientPO fulfillment amounts
    """
    # Verify schedule belongs to the PO
    result = await db.execute(
        select(BillingSchedule).where(
            (BillingSchedule.id == schedule_id) &
            (BillingSchedule.client_po_id == po_id)
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    if schedule.status != ScheduleStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create invoice from schedule in {schedule.status.value} status"
        )

    try:
        invoice = await create_invoice_service(
            db=db,
            schedule_id=schedule_id,
            invoice_date=request.invoice_date,
            due_date=request.due_date,
            bank_account_id=request.bank_account_id,
            notes=request.notes,
        )
        await db.commit()

        # Reload invoice with relationships
        result = await db.execute(
            select(Invoice)
            .options(
                selectinload(Invoice.items),
                selectinload(Invoice.client),
                selectinload(Invoice.branch),
                selectinload(Invoice.bank_account).selectinload(BankAccount.branch)
            )
            .where(Invoice.id == invoice.id)
        )
        invoice = result.scalar_one()
        return invoice

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{po_id}/schedules/{schedule_id}/create-pi", response_model=PIResponse)
async def create_pi_from_schedule(
    po_id: int,
    schedule_id: int,
    request: CreateInvoiceFromScheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a Proforma Invoice (PI) from a billing schedule.

    This will:
    1. Create a PI with schedule amounts
    2. Update the schedule status to PI_RAISED
    """
    # Verify schedule belongs to the PO
    result = await db.execute(
        select(BillingSchedule).where(
            (BillingSchedule.id == schedule_id) &
            (BillingSchedule.client_po_id == po_id)
        )
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    if schedule.status != ScheduleStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot create PI from schedule in {schedule.status.value} status"
        )

    try:
        pi = await create_pi_service(
            db=db,
            schedule_id=schedule_id,
            pi_date=request.invoice_date,
            due_date=request.due_date,
            bank_account_id=request.bank_account_id,
            notes=request.notes,
        )
        await db.commit()

        # Reload PI with relationships
        result = await db.execute(
            select(ProformaInvoice)
            .options(
                selectinload(ProformaInvoice.items),
                selectinload(ProformaInvoice.client),
                selectinload(ProformaInvoice.branch),
                selectinload(ProformaInvoice.bank_account)
            )
            .where(ProformaInvoice.id == pi.id)
        )
        pi = result.scalar_one()
        return pi

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
