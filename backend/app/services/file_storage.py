import os
import uuid
import aiofiles
from pathlib import Path
from typing import Tuple

from app.core.config import settings


class FileStorageService:
    """Service for handling file storage operations."""

    @staticmethod
    def get_base_upload_path() -> Path:
        """Get the base upload directory path."""
        # Get the backend directory (parent of app)
        backend_dir = Path(__file__).parent.parent.parent
        return backend_dir / settings.UPLOAD_DIR

    @staticmethod
    def get_invoice_attachments_path(invoice_id: int) -> Path:
        """Get upload directory for invoice attachments, creating if needed."""
        base_path = FileStorageService.get_base_upload_path()
        invoice_path = base_path / settings.INVOICE_ATTACHMENTS_DIR / str(invoice_id)
        invoice_path.mkdir(parents=True, exist_ok=True)
        return invoice_path

    @staticmethod
    async def save_file(file_content: bytes, original_filename: str, invoice_id: int) -> Tuple[str, str, int]:
        """
        Save uploaded file with a UUID-based name.

        Args:
            file_content: The file bytes
            original_filename: Original filename from upload
            invoice_id: ID of the invoice

        Returns:
            Tuple of (stored_filename, relative_path, file_size)
        """
        # Generate UUID-based filename to prevent collisions and security issues
        ext = Path(original_filename).suffix.lower()
        stored_filename = f"{uuid.uuid4()}{ext}"

        # Get upload path
        upload_path = FileStorageService.get_invoice_attachments_path(invoice_id)
        file_path = upload_path / stored_filename

        # Relative path for database storage
        relative_path = f"{settings.INVOICE_ATTACHMENTS_DIR}/{invoice_id}/{stored_filename}"

        # Write file asynchronously
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(file_content)

        return stored_filename, relative_path, len(file_content)

    @staticmethod
    def delete_file(relative_path: str) -> bool:
        """
        Delete a file from storage.

        Args:
            relative_path: Relative path from uploads directory

        Returns:
            True if file was deleted, False if it didn't exist
        """
        base_path = FileStorageService.get_base_upload_path()
        file_path = base_path / relative_path

        if file_path.exists():
            file_path.unlink()

            # Try to remove empty parent directories
            try:
                parent = file_path.parent
                if parent.exists() and not any(parent.iterdir()):
                    parent.rmdir()
            except OSError:
                pass  # Directory not empty or other error, ignore

            return True
        return False

    @staticmethod
    def get_full_path(relative_path: str) -> Path:
        """
        Get absolute path for a stored file.

        Args:
            relative_path: Relative path from uploads directory

        Returns:
            Absolute Path object
        """
        base_path = FileStorageService.get_base_upload_path()
        return base_path / relative_path

    @staticmethod
    def file_exists(relative_path: str) -> bool:
        """Check if a file exists."""
        full_path = FileStorageService.get_full_path(relative_path)
        return full_path.exists()

    @staticmethod
    def validate_file_type(content_type: str) -> bool:
        """Check if the file type is allowed."""
        return content_type in settings.ALLOWED_ATTACHMENT_TYPES

    @staticmethod
    def validate_file_size(file_size: int) -> bool:
        """Check if the file size is within limits."""
        max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024  # Convert MB to bytes
        return file_size <= max_size

    @staticmethod
    def get_max_file_size_bytes() -> int:
        """Get maximum file size in bytes."""
        return settings.MAX_FILE_SIZE_MB * 1024 * 1024
