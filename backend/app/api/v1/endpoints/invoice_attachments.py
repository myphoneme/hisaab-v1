from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.models.invoice_attachment import InvoiceAttachment
from app.api.v1.endpoints.auth import get_current_user
from app.services.file_storage import FileStorageService
from app.core.config import settings

router = APIRouter()


@router.post("/{invoice_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_attachments(
    invoice_id: int,
    files: List[UploadFile] = File(...),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload one or more files to an invoice."""

    # Verify invoice exists
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.attachments))
        .where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Check file count limit
    current_count = len(invoice.attachments) if invoice.attachments else 0
    if current_count + len(files) > settings.MAX_FILES_PER_INVOICE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.MAX_FILES_PER_INVOICE} files allowed per invoice. "
                   f"Current: {current_count}, Trying to add: {len(files)}"
        )

    uploaded_attachments = []

    for file in files:
        # Validate file type
        if not FileStorageService.validate_file_type(file.content_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file.content_type}' not allowed for '{file.filename}'. "
                       f"Allowed types: PDF, JPEG, PNG, GIF, WebP, TIFF"
            )

        # Read file content
        content = await file.read()

        # Validate file size
        if not FileStorageService.validate_file_size(len(content)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{file.filename}' exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB"
            )

        # Save file
        stored_filename, relative_path, file_size = await FileStorageService.save_file(
            file_content=content,
            original_filename=file.filename,
            invoice_id=invoice_id
        )

        # Create database record
        attachment = InvoiceAttachment(
            invoice_id=invoice_id,
            filename=file.filename,
            stored_filename=stored_filename,
            file_path=relative_path,
            file_size=file_size,
            mime_type=file.content_type,
            description=description
        )
        db.add(attachment)
        uploaded_attachments.append(attachment)

    await db.commit()

    # Refresh to get IDs
    for attachment in uploaded_attachments:
        await db.refresh(attachment)

    return {
        "message": f"Successfully uploaded {len(uploaded_attachments)} file(s)",
        "attachments": [
            {
                "id": att.id,
                "filename": att.filename,
                "file_size": att.file_size,
                "mime_type": att.mime_type,
                "created_at": att.created_at.isoformat() if att.created_at else None
            }
            for att in uploaded_attachments
        ]
    }


@router.get("/{invoice_id}/attachments")
async def list_attachments(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all attachments for an invoice."""

    # Verify invoice exists
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Get attachments
    result = await db.execute(
        select(InvoiceAttachment)
        .where(InvoiceAttachment.invoice_id == invoice_id)
        .order_by(InvoiceAttachment.created_at.desc())
    )
    attachments = result.scalars().all()

    return {
        "attachments": [
            {
                "id": att.id,
                "invoice_id": att.invoice_id,
                "filename": att.filename,
                "file_size": att.file_size,
                "mime_type": att.mime_type,
                "description": att.description,
                "created_at": att.created_at.isoformat() if att.created_at else None
            }
            for att in attachments
        ],
        "total": len(attachments)
    }


@router.get("/{invoice_id}/attachments/{attachment_id}")
async def get_attachment(
    invoice_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attachment metadata."""

    result = await db.execute(
        select(InvoiceAttachment)
        .where(
            InvoiceAttachment.id == attachment_id,
            InvoiceAttachment.invoice_id == invoice_id
        )
    )
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    return {
        "id": attachment.id,
        "invoice_id": attachment.invoice_id,
        "filename": attachment.filename,
        "file_size": attachment.file_size,
        "mime_type": attachment.mime_type,
        "description": attachment.description,
        "created_at": attachment.created_at.isoformat() if attachment.created_at else None
    }


@router.get("/{invoice_id}/attachments/{attachment_id}/download")
async def download_attachment(
    invoice_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download an attachment file."""

    result = await db.execute(
        select(InvoiceAttachment)
        .where(
            InvoiceAttachment.id == attachment_id,
            InvoiceAttachment.invoice_id == invoice_id
        )
    )
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    # Get file path
    file_path = FileStorageService.get_full_path(attachment.file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )

    return FileResponse(
        path=str(file_path),
        filename=attachment.filename,
        media_type=attachment.mime_type
    )


@router.delete("/{invoice_id}/attachments/{attachment_id}")
async def delete_attachment(
    invoice_id: int,
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an attachment."""

    result = await db.execute(
        select(InvoiceAttachment)
        .where(
            InvoiceAttachment.id == attachment_id,
            InvoiceAttachment.invoice_id == invoice_id
        )
    )
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )

    # Delete file from storage
    FileStorageService.delete_file(attachment.file_path)

    # Delete database record
    await db.delete(attachment)
    await db.commit()

    return {"message": "Attachment deleted successfully"}
