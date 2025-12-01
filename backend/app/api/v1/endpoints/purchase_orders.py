from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import date
from decimal import Decimal

from app.db.session import get_db
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem, POStatus
from app.models.client import Client
from app.models.user import User
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    POStatusUpdate,
)
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user
from app.services.number_generator import generate_po_number

router = APIRouter()


def calculate_item_amounts(item_data: dict, is_igst: bool) -> dict:
    """Calculate amounts for a PO item."""
    quantity = Decimal(str(item_data['quantity']))
    rate = Decimal(str(item_data['rate']))
    gst_rate = Decimal(str(item_data.get('gst_rate', 18)))
    cess_rate = Decimal(str(item_data.get('cess_rate', 0)))

    amount = quantity * rate
    gst_amount = amount * gst_rate / 100
    cess_amount = amount * cess_rate / 100

    if is_igst:
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = gst_amount
    else:
        cgst_amount = gst_amount / 2
        sgst_amount = gst_amount / 2
        igst_amount = Decimal('0')

    total_amount = amount + gst_amount + cess_amount

    return {
        'amount': amount,
        'cgst_amount': cgst_amount,
        'sgst_amount': sgst_amount,
        'igst_amount': igst_amount,
        'cess_amount': cess_amount,
        'total_amount': total_amount,
    }


@router.get("", response_model=PaginatedResponse[PurchaseOrderResponse])
async def get_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    branch_id: Optional[int] = None,
    client_id: Optional[int] = None,
    status_filter: Optional[POStatus] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all purchase orders with pagination and filtering by branch, dates, etc."""
    query = select(PurchaseOrder).options(
        selectinload(PurchaseOrder.items),
        selectinload(PurchaseOrder.client),
        selectinload(PurchaseOrder.branch)
    )

    if branch_id:
        query = query.where(PurchaseOrder.branch_id == branch_id)
    if client_id:
        query = query.where(PurchaseOrder.client_id == client_id)
    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
    if from_date:
        query = query.where(PurchaseOrder.po_date >= from_date)
    if to_date:
        query = query.where(PurchaseOrder.po_date <= to_date)

    query = query.order_by(PurchaseOrder.po_date.desc())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    pos = result.scalars().all()

    return PaginatedResponse(
        items=[PurchaseOrderResponse.model_validate(po) for po in pos],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific purchase order."""
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.client))
        .where(PurchaseOrder.id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    return po


@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    po_data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new purchase order."""
    # Verify client exists
    client_result = await db.execute(select(Client).where(Client.id == po_data.client_id))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client not found")

    # Determine if IGST (inter-state)
    is_igst = False  # Will be determined based on client state vs company state

    # Generate PO number
    po_number = await generate_po_number(db)

    # Create PO
    po = PurchaseOrder(
        po_number=po_number,
        po_date=po_data.po_date,
        client_id=po_data.client_id,
        reference_number=po_data.reference_number,
        subject=po_data.subject,
        discount_percent=po_data.discount_percent,
        notes=po_data.notes,
        terms_conditions=po_data.terms_conditions,
        valid_until=po_data.valid_until,
        status=POStatus.DRAFT,
    )

    # Calculate item amounts and add items
    subtotal = Decimal('0')
    total_cgst = Decimal('0')
    total_sgst = Decimal('0')
    total_igst = Decimal('0')
    total_cess = Decimal('0')

    for item_data in po_data.items:
        item_dict = item_data.model_dump()
        amounts = calculate_item_amounts(item_dict, is_igst)

        item = PurchaseOrderItem(
            **item_dict,
            **amounts,
        )
        po.items.append(item)

        subtotal += amounts['amount']
        total_cgst += amounts['cgst_amount']
        total_sgst += amounts['sgst_amount']
        total_igst += amounts['igst_amount']
        total_cess += amounts['cess_amount']

    # Calculate totals
    discount_amount = subtotal * po_data.discount_percent / 100
    taxable_amount = subtotal - discount_amount

    po.subtotal = subtotal
    po.discount_amount = discount_amount
    po.taxable_amount = taxable_amount
    po.cgst_amount = total_cgst
    po.sgst_amount = total_sgst
    po.igst_amount = total_igst
    po.cess_amount = total_cess
    po.total_amount = taxable_amount + total_cgst + total_sgst + total_igst + total_cess

    db.add(po)
    await db.commit()
    await db.refresh(po)

    # Reload with relationships
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.client))
        .where(PurchaseOrder.id == po.id)
    )
    return result.scalar_one()


@router.patch("/{po_id}/status", response_model=PurchaseOrderResponse)
async def update_po_status(
    po_id: int,
    status_data: POStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update purchase order status."""
    result = await db.execute(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.client))
        .where(PurchaseOrder.id == po_id)
    )
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    po.status = status_data.status
    await db.commit()
    await db.refresh(po)
    return po


@router.delete("/{po_id}", response_model=Message)
async def delete_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a purchase order (only if in DRAFT status)."""
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")

    if po.status != POStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete purchase orders in DRAFT status"
        )

    await db.delete(po)
    await db.commit()
    return Message(message="Purchase order deleted successfully")
