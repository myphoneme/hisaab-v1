from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.schemas.common import PaginatedResponse, Message
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ClientResponse])
async def get_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all clients with pagination."""
    query = select(Client)

    if search:
        query = query.where(
            (Client.name.ilike(f"%{search}%")) |
            (Client.gstin.ilike(f"%{search}%")) |
            (Client.pan.ilike(f"%{search}%"))
        )

    if is_active is not None:
        query = query.where(Client.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    clients = result.scalars().all()

    return PaginatedResponse(
        items=[ClientResponse.model_validate(c) for c in clients],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific client by ID."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new client."""
    # Check for duplicate PAN/GSTIN
    if client_data.gstin:
        result = await db.execute(select(Client).where(Client.gstin == client_data.gstin))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GSTIN already exists")

    client = Client(**client_data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", response_model=Message)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a client (soft delete by setting is_active=False)."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    client.is_active = False
    await db.commit()
    return Message(message="Client deactivated successfully")
