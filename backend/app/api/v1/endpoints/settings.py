from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.settings import CompanySettings
from app.models.user import User
from app.schemas.settings import (
    CompanySettingsCreate,
    CompanySettingsUpdate,
    CompanySettingsResponse,
)
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=CompanySettingsResponse)
async def get_company_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get company settings."""
    result = await db.execute(
        select(CompanySettings).where(CompanySettings.is_active == True)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company settings not found. Please create settings first."
        )

    return settings


@router.post("", response_model=CompanySettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_company_settings(
    settings_data: CompanySettingsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create company settings. Only one company settings record should exist."""
    try:
        # Check if settings already exist
        result = await db.execute(
            select(CompanySettings).where(CompanySettings.is_active == True)
        )
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company settings already exist. Use PATCH to update."
            )

        settings = CompanySettings(**settings_data.model_dump())
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
        return settings
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error creating company settings: {str(e)}")
        print(traceback.format_exc())
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create settings: {str(e)}"
        )


@router.patch("/{settings_id}", response_model=CompanySettingsResponse)
async def update_company_settings(
    settings_id: int,
    settings_data: CompanySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update company settings."""
    result = await db.execute(
        select(CompanySettings).where(CompanySettings.id == settings_id)
    )
    settings = result.scalar_one_or_none()

    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company settings not found"
        )

    for field, value in settings_data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)
    return settings


@router.patch("", response_model=CompanySettingsResponse)
async def update_active_company_settings(
    settings_data: CompanySettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the active company settings without requiring ID."""
    try:
        result = await db.execute(
            select(CompanySettings).where(CompanySettings.is_active == True)
        )
        settings = result.scalar_one_or_none()

        if not settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company settings not found. Please create settings first."
            )

        for field, value in settings_data.model_dump(exclude_unset=True).items():
            setattr(settings, field, value)

        await db.commit()
        await db.refresh(settings)
        return settings
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error updating company settings: {str(e)}")
        print(traceback.format_exc())
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}"
        )
