from sqlalchemy import Column, String, Integer, ForeignKey, Text, BigInteger
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class InvoiceAttachment(BaseModel):
    """Model for storing invoice document attachments."""

    __tablename__ = "invoice_attachments"

    # Parent invoice reference
    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # File metadata
    filename = Column(String(255), nullable=False)  # Original filename
    stored_filename = Column(String(255), nullable=False)  # UUID-based stored name
    file_path = Column(String(500), nullable=False)  # Relative path from uploads dir
    file_size = Column(BigInteger, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)  # e.g., application/pdf, image/jpeg

    # Optional description
    description = Column(Text, nullable=True)

    # Relationships
    invoice = relationship("Invoice", back_populates="attachments")

    def __repr__(self):
        return f"<InvoiceAttachment {self.filename} (Invoice: {self.invoice_id})>"
