from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.vendor import Vendor
from app.models.user import User
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedResponse[VendorResponse])
async def get_vendors(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all vendors with pagination."""
    query = select(Vendor)

    if search:
        query = query.where(
            (Vendor.name.ilike(f"%{search}%")) |
            (Vendor.gstin.ilike(f"%{search}%")) |
            (Vendor.pan.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.where(Vendor.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    vendors = result.scalars().all()

    return PaginatedResponse(
        items=[VendorResponse.model_validate(v) for v in vendors],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific vendor by ID."""
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return vendor


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    vendor_data: VendorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new vendor."""
    if vendor_data.gstin:
        result = await db.execute(select(Vendor).where(Vendor.gstin == vendor_data.gstin))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GSTIN already exists")

    vendor = Vendor(**vendor_data.model_dump())
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a vendor."""
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    update_data = vendor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)

    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", response_model=Message)
async def delete_vendor(
    vendor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a vendor (soft delete)."""
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    vendor.is_active = False
    await db.commit()
    return Message(message="Vendor deactivated successfully")
