from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.purchase_order import PurchaseOrder
from app.models.invoice import Invoice
from app.models.payment import Payment


def get_financial_year() -> str:
    """Get current financial year string (e.g., '2024-25')."""
    today = datetime.now()
    year = today.year
    month = today.month

    if month < 4:  # Before April
        return f"{year - 1}-{str(year)[2:]}"
    return f"{year}-{str(year + 1)[2:]}"


async def generate_po_number(db: AsyncSession) -> str:
    """Generate unique PO number."""
    fy = get_financial_year()
    prefix = f"PO/{fy}/"

    # Get max sequence
    result = await db.execute(
        select(func.count()).where(PurchaseOrder.po_number.like(f"{prefix}%"))
    )
    count = result.scalar() or 0

    return f"{prefix}{str(count + 1).zfill(4)}"


async def generate_invoice_number(db: AsyncSession, invoice_type: str) -> str:
    """Generate unique invoice number."""
    fy = get_financial_year()

    if invoice_type == "SALES":
        prefix = f"INV/{fy}/"
    elif invoice_type == "PURCHASE":
        prefix = f"BILL/{fy}/"
    elif invoice_type == "CREDIT_NOTE":
        prefix = f"CN/{fy}/"
    else:
        prefix = f"DN/{fy}/"

    result = await db.execute(
        select(func.count()).where(Invoice.invoice_number.like(f"{prefix}%"))
    )
    count = result.scalar() or 0

    return f"{prefix}{str(count + 1).zfill(4)}"


async def generate_payment_number(db: AsyncSession, payment_type: str) -> str:
    """Generate unique payment/receipt number."""
    fy = get_financial_year()

    if payment_type == "RECEIPT":
        prefix = f"REC/{fy}/"
    else:
        prefix = f"PAY/{fy}/"

    result = await db.execute(
        select(func.count()).where(Payment.payment_number.like(f"{prefix}%"))
    )
    count = result.scalar() or 0

    return f"{prefix}{str(count + 1).zfill(4)}"
