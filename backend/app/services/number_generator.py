from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Integer

from app.models.purchase_order import PurchaseOrder
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.ledger import LedgerEntry
from app.models.cash_expense import CashExpense


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
    prefix_len = len(prefix)

    # Get max sequence number by extracting numeric part
    result = await db.execute(
        select(
            func.max(
                cast(
                    func.substr(PurchaseOrder.po_number, prefix_len + 1),
                    Integer
                )
            )
        ).where(PurchaseOrder.po_number.like(f"{prefix}%"))
    )
    max_num = result.scalar() or 0

    return f"{prefix}{str(max_num + 1).zfill(4)}"


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

    prefix_len = len(prefix)

    # Get max sequence number by extracting numeric part
    result = await db.execute(
        select(
            func.max(
                cast(
                    func.substr(Invoice.invoice_number, prefix_len + 1),
                    Integer
                )
            )
        ).where(Invoice.invoice_number.like(f"{prefix}%"))
    )
    max_num = result.scalar() or 0

    return f"{prefix}{str(max_num + 1).zfill(4)}"


async def generate_payment_number(db: AsyncSession, payment_type: str) -> str:
    """Generate unique payment/receipt number."""
    fy = get_financial_year()

    if payment_type == "RECEIPT":
        prefix = f"REC/{fy}/"
    else:
        prefix = f"PAY/{fy}/"

    prefix_len = len(prefix)

    # Get max sequence number by extracting numeric part
    result = await db.execute(
        select(
            func.max(
                cast(
                    func.substr(Payment.payment_number, prefix_len + 1),
                    Integer
                )
            )
        ).where(Payment.payment_number.like(f"{prefix}%"))
    )
    max_num = result.scalar() or 0

    return f"{prefix}{str(max_num + 1).zfill(4)}"


async def generate_voucher_number(db: AsyncSession, voucher_type: str = "JV") -> str:
    """Generate unique voucher number for journal entries."""
    fy = get_financial_year()
    prefix = f"{voucher_type}/{fy}/"
    prefix_len = len(prefix)

    # Get max sequence number by extracting numeric part
    result = await db.execute(
        select(
            func.max(
                cast(
                    func.substr(LedgerEntry.voucher_number, prefix_len + 1),
                    Integer
                )
            )
        ).where(LedgerEntry.voucher_number.like(f"{prefix}%"))
    )
    max_num = result.scalar() or 0

    return f"{prefix}{str(max_num + 1).zfill(4)}"


async def generate_expense_number(db: AsyncSession) -> str:
    """Generate unique expense number for cash expenses."""
    fy = get_financial_year()
    prefix = f"EXP/{fy}/"
    prefix_len = len(prefix)

    # Get max sequence number by extracting numeric part
    result = await db.execute(
        select(
            func.max(
                cast(
                    func.substr(CashExpense.expense_number, prefix_len + 1),
                    Integer
                )
            )
        ).where(CashExpense.expense_number.like(f"{prefix}%"))
    )
    max_num = result.scalar() or 0

    return f"{prefix}{str(max_num + 1).zfill(4)}"
