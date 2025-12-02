from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal
from datetime import date
from typing import List, Optional

from app.models.ledger import LedgerEntry, ReferenceType
from app.models.invoice import Invoice, InvoiceType
from app.models.payment import Payment, PaymentType
from app.models.settings import CompanySettings


def get_financial_year(dt: date, fy_start_month: int = 4) -> str:
    """
    Get the financial year string for a given date.
    Default financial year starts in April (month 4).

    Args:
        dt: The date to get financial year for
        fy_start_month: Month when financial year starts (1-12, default April=4)

    Returns:
        Financial year string like "2024-25"
    """
    year = dt.year
    month = dt.month

    if month >= fy_start_month:
        start_year = year
    else:
        start_year = year - 1

    end_year = start_year + 1
    return f"{start_year}-{str(end_year)[-2:]}"


async def generate_voucher_number(
    db: AsyncSession,
    reference_type: ReferenceType,
    financial_year: str
) -> str:
    """
    Generate a unique voucher number for ledger entries.

    Args:
        db: Async database session
        reference_type: Type of reference (INVOICE, PAYMENT, JOURNAL)
        financial_year: Financial year string

    Returns:
        Voucher number like "INV/2024-25/0001"
    """
    prefix_map = {
        ReferenceType.INVOICE: "INV",
        ReferenceType.PAYMENT: "PAY",
        ReferenceType.JOURNAL: "JRN",
        ReferenceType.OPENING: "OPN"
    }
    prefix = prefix_map.get(reference_type, "VCH")

    # Count existing entries for this type and year
    result = await db.execute(
        select(func.count()).select_from(LedgerEntry).where(
            LedgerEntry.reference_type == reference_type,
            LedgerEntry.financial_year == financial_year
        )
    )
    count = result.scalar() or 0

    next_num = count + 1
    return f"{prefix}/{financial_year}/{next_num:04d}"


async def get_company_settings(db: AsyncSession) -> Optional[CompanySettings]:
    """Get the active company settings."""
    result = await db.execute(
        select(CompanySettings).where(CompanySettings.is_active == True).limit(1)
    )
    return result.scalar_one_or_none()


async def post_sales_invoice(db: AsyncSession, invoice: Invoice, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Create ledger entries for a sales invoice.

    Double Entry:
    - Debit: Accounts Receivable (Customer owes money)
    - Credit: Sales Revenue
    - Credit: CGST Output / SGST Output / IGST Output (Tax liability)
    - Debit/Credit: Round Off (if applicable)

    If TDS applicable:
    - Debit: TDS Receivable (reduces AR)
    """
    entries: List[LedgerEntry] = []

    fy_start = settings.financial_year_start_month or 4
    financial_year = get_financial_year(invoice.invoice_date, fy_start)
    voucher_number = await generate_voucher_number(db, ReferenceType.INVOICE, financial_year)

    common_fields = {
        "entry_date": invoice.invoice_date,
        "voucher_number": voucher_number,
        "reference_type": ReferenceType.INVOICE,
        "reference_id": invoice.id,
        "client_id": invoice.client_id,
        "branch_id": invoice.branch_id,
        "financial_year": financial_year
    }

    # 1. Debit: Accounts Receivable (total amount after TDS)
    if settings.default_ar_account_id and invoice.amount_after_tds > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_ar_account_id,
            debit=invoice.amount_after_tds,
            credit=Decimal("0"),
            narration=f"Sales Invoice {invoice.invoice_number} - Receivable from customer"
        ))

    # 2. Debit: TDS Receivable (if TDS applicable)
    if settings.default_tds_receivable_account_id and invoice.tds_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_tds_receivable_account_id,
            debit=invoice.tds_amount,
            credit=Decimal("0"),
            narration=f"Sales Invoice {invoice.invoice_number} - TDS deducted by customer"
        ))

    # 3. Credit: Sales Revenue
    if settings.default_sales_account_id and invoice.taxable_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_sales_account_id,
            debit=Decimal("0"),
            credit=invoice.taxable_amount,
            narration=f"Sales Invoice {invoice.invoice_number} - Sales revenue"
        ))

    # 4. Credit: GST Output (based on IGST or CGST+SGST)
    if invoice.is_igst:
        if settings.default_igst_output_account_id and invoice.igst_amount > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_igst_output_account_id,
                debit=Decimal("0"),
                credit=invoice.igst_amount,
                narration=f"Sales Invoice {invoice.invoice_number} - IGST output"
            ))
    else:
        if settings.default_cgst_output_account_id and invoice.cgst_amount > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_cgst_output_account_id,
                debit=Decimal("0"),
                credit=invoice.cgst_amount,
                narration=f"Sales Invoice {invoice.invoice_number} - CGST output"
            ))
        if settings.default_sgst_output_account_id and invoice.sgst_amount > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_sgst_output_account_id,
                debit=Decimal("0"),
                credit=invoice.sgst_amount,
                narration=f"Sales Invoice {invoice.invoice_number} - SGST output"
            ))

    # 5. Round Off
    if settings.default_round_off_account_id and invoice.round_off != 0:
        if invoice.round_off > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_round_off_account_id,
                debit=abs(invoice.round_off),
                credit=Decimal("0"),
                narration=f"Sales Invoice {invoice.invoice_number} - Round off"
            ))
        else:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_round_off_account_id,
                debit=Decimal("0"),
                credit=abs(invoice.round_off),
                narration=f"Sales Invoice {invoice.invoice_number} - Round off"
            ))

    for entry in entries:
        db.add(entry)

    invoice.is_posted = True

    return entries


async def post_purchase_invoice(db: AsyncSession, invoice: Invoice, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Create ledger entries for a purchase invoice.

    Double Entry:
    - Debit: Purchase Expense
    - Debit: CGST Input / SGST Input / IGST Input (Tax credit)
    - Credit: Accounts Payable (We owe money to vendor)

    If TDS applicable:
    - Credit: TDS Payable (reduces AP - we withhold tax)
    """
    entries: List[LedgerEntry] = []

    fy_start = settings.financial_year_start_month or 4
    financial_year = get_financial_year(invoice.invoice_date, fy_start)
    voucher_number = await generate_voucher_number(db, ReferenceType.INVOICE, financial_year)

    common_fields = {
        "entry_date": invoice.invoice_date,
        "voucher_number": voucher_number,
        "reference_type": ReferenceType.INVOICE,
        "reference_id": invoice.id,
        "vendor_id": invoice.vendor_id,
        "branch_id": invoice.branch_id,
        "financial_year": financial_year
    }

    # 1. Debit: Purchase Expense
    if settings.default_purchase_account_id and invoice.taxable_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_purchase_account_id,
            debit=invoice.taxable_amount,
            credit=Decimal("0"),
            narration=f"Purchase Invoice {invoice.invoice_number} - Purchase expense"
        ))

    # 2. Debit: GST Input
    if invoice.is_igst:
        if settings.default_igst_input_account_id and invoice.igst_amount > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_igst_input_account_id,
                debit=invoice.igst_amount,
                credit=Decimal("0"),
                narration=f"Purchase Invoice {invoice.invoice_number} - IGST input credit"
            ))
    else:
        if settings.default_cgst_input_account_id and invoice.cgst_amount > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_cgst_input_account_id,
                debit=invoice.cgst_amount,
                credit=Decimal("0"),
                narration=f"Purchase Invoice {invoice.invoice_number} - CGST input credit"
            ))
        if settings.default_sgst_input_account_id and invoice.sgst_amount > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_sgst_input_account_id,
                debit=invoice.sgst_amount,
                credit=Decimal("0"),
                narration=f"Purchase Invoice {invoice.invoice_number} - SGST input credit"
            ))

    # 3. Credit: Accounts Payable
    if settings.default_ap_account_id and invoice.amount_after_tds > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_ap_account_id,
            debit=Decimal("0"),
            credit=invoice.amount_after_tds,
            narration=f"Purchase Invoice {invoice.invoice_number} - Payable to vendor"
        ))

    # 4. Credit: TDS Payable
    if settings.default_tds_payable_account_id and invoice.tds_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_tds_payable_account_id,
            debit=Decimal("0"),
            credit=invoice.tds_amount,
            narration=f"Purchase Invoice {invoice.invoice_number} - TDS payable"
        ))

    # 5. Round Off
    if settings.default_round_off_account_id and invoice.round_off != 0:
        if invoice.round_off > 0:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_round_off_account_id,
                debit=abs(invoice.round_off),
                credit=Decimal("0"),
                narration=f"Purchase Invoice {invoice.invoice_number} - Round off"
            ))
        else:
            entries.append(LedgerEntry(
                **common_fields,
                account_id=settings.default_round_off_account_id,
                debit=Decimal("0"),
                credit=abs(invoice.round_off),
                narration=f"Purchase Invoice {invoice.invoice_number} - Round off"
            ))

    for entry in entries:
        db.add(entry)

    invoice.is_posted = True

    return entries


async def post_invoice(db: AsyncSession, invoice: Invoice, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Post ledger entries for an invoice based on its type.
    """
    if invoice.is_posted:
        raise ValueError(f"Invoice {invoice.invoice_number} is already posted")

    if invoice.invoice_type == InvoiceType.SALES:
        return await post_sales_invoice(db, invoice, settings)
    elif invoice.invoice_type == InvoiceType.PURCHASE:
        return await post_purchase_invoice(db, invoice, settings)
    elif invoice.invoice_type == InvoiceType.CREDIT_NOTE:
        entries = await post_sales_invoice(db, invoice, settings)
        for entry in entries:
            entry.debit, entry.credit = entry.credit, entry.debit
            entry.narration = entry.narration.replace("Sales Invoice", "Credit Note")
        return entries
    elif invoice.invoice_type == InvoiceType.DEBIT_NOTE:
        entries = await post_purchase_invoice(db, invoice, settings)
        for entry in entries:
            entry.debit, entry.credit = entry.credit, entry.debit
            entry.narration = entry.narration.replace("Purchase Invoice", "Debit Note")
        return entries
    else:
        raise ValueError(f"Unknown invoice type: {invoice.invoice_type}")


async def post_receipt(db: AsyncSession, payment: Payment, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Create ledger entries for a receipt (money received from client).

    Double Entry:
    - Debit: Bank/Cash (money received)
    - Credit: Accounts Receivable (reduces customer debt)
    - Debit: TDS Receivable (if TDS deducted by customer)
    """
    entries: List[LedgerEntry] = []

    fy_start = settings.financial_year_start_month or 4
    financial_year = get_financial_year(payment.payment_date, fy_start)
    voucher_number = await generate_voucher_number(db, ReferenceType.PAYMENT, financial_year)

    common_fields = {
        "entry_date": payment.payment_date,
        "voucher_number": voucher_number,
        "reference_type": ReferenceType.PAYMENT,
        "reference_id": payment.id,
        "client_id": payment.client_id,
        "branch_id": payment.branch_id,
        "financial_year": financial_year
    }

    # Determine cash or bank account
    cash_bank_account_id = settings.default_bank_account_id
    if payment.payment_mode.value == "CASH":
        cash_bank_account_id = settings.default_cash_account_id

    # 1. Debit: Bank/Cash (net amount received)
    if cash_bank_account_id and payment.net_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=cash_bank_account_id,
            debit=payment.net_amount,
            credit=Decimal("0"),
            narration=f"Receipt {payment.payment_number} - Money received from customer"
        ))

    # 2. Debit: TDS Receivable (if TDS deducted)
    if settings.default_tds_receivable_account_id and payment.tds_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_tds_receivable_account_id,
            debit=payment.tds_amount,
            credit=Decimal("0"),
            narration=f"Receipt {payment.payment_number} - TDS deducted by customer"
        ))

    # 3. Credit: Accounts Receivable (gross amount)
    if settings.default_ar_account_id and payment.gross_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_ar_account_id,
            debit=Decimal("0"),
            credit=payment.gross_amount,
            narration=f"Receipt {payment.payment_number} - Receivable cleared"
        ))

    for entry in entries:
        db.add(entry)

    payment.is_posted = True

    return entries


async def post_payment_to_vendor(db: AsyncSession, payment: Payment, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Create ledger entries for a payment (money paid to vendor).

    Double Entry:
    - Debit: Accounts Payable (reduces our debt)
    - Credit: Bank/Cash (money paid out)
    - Credit: TDS Payable (if TDS deducted)
    """
    entries: List[LedgerEntry] = []

    fy_start = settings.financial_year_start_month or 4
    financial_year = get_financial_year(payment.payment_date, fy_start)
    voucher_number = await generate_voucher_number(db, ReferenceType.PAYMENT, financial_year)

    common_fields = {
        "entry_date": payment.payment_date,
        "voucher_number": voucher_number,
        "reference_type": ReferenceType.PAYMENT,
        "reference_id": payment.id,
        "vendor_id": payment.vendor_id,
        "branch_id": payment.branch_id,
        "financial_year": financial_year
    }

    # Determine cash or bank account
    cash_bank_account_id = settings.default_bank_account_id
    if payment.payment_mode.value == "CASH":
        cash_bank_account_id = settings.default_cash_account_id

    # 1. Debit: Accounts Payable (gross amount)
    if settings.default_ap_account_id and payment.gross_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_ap_account_id,
            debit=payment.gross_amount,
            credit=Decimal("0"),
            narration=f"Payment {payment.payment_number} - Payable cleared"
        ))

    # 2. Credit: Bank/Cash (net amount paid)
    if cash_bank_account_id and payment.net_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=cash_bank_account_id,
            debit=Decimal("0"),
            credit=payment.net_amount,
            narration=f"Payment {payment.payment_number} - Money paid to vendor"
        ))

    # 3. Credit: TDS Payable (if TDS deducted)
    if settings.default_tds_payable_account_id and payment.tds_amount > 0:
        entries.append(LedgerEntry(
            **common_fields,
            account_id=settings.default_tds_payable_account_id,
            debit=Decimal("0"),
            credit=payment.tds_amount,
            narration=f"Payment {payment.payment_number} - TDS withheld"
        ))

    for entry in entries:
        db.add(entry)

    payment.is_posted = True

    return entries


async def post_payment(db: AsyncSession, payment: Payment, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Post ledger entries for a payment based on its type.
    """
    if payment.is_posted:
        raise ValueError(f"Payment {payment.payment_number} is already posted")

    if payment.payment_type == PaymentType.RECEIPT:
        return await post_receipt(db, payment, settings)
    elif payment.payment_type == PaymentType.PAYMENT:
        return await post_payment_to_vendor(db, payment, settings)
    else:
        raise ValueError(f"Unknown payment type: {payment.payment_type}")


async def reverse_invoice_posting(db: AsyncSession, invoice: Invoice, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Reverse ledger entries for an invoice (for cancellation).
    """
    if not invoice.is_posted:
        raise ValueError(f"Invoice {invoice.invoice_number} is not posted")

    # Get original entries
    result = await db.execute(
        select(LedgerEntry).where(
            LedgerEntry.reference_type == ReferenceType.INVOICE,
            LedgerEntry.reference_id == invoice.id
        )
    )
    original_entries = result.scalars().all()

    fy_start = settings.financial_year_start_month or 4
    financial_year = get_financial_year(invoice.invoice_date, fy_start)
    voucher_number = await generate_voucher_number(db, ReferenceType.INVOICE, financial_year)

    reversal_entries: List[LedgerEntry] = []

    for entry in original_entries:
        reversal = LedgerEntry(
            entry_date=date.today(),
            voucher_number=voucher_number,
            account_id=entry.account_id,
            debit=entry.credit,
            credit=entry.debit,
            reference_type=ReferenceType.INVOICE,
            reference_id=invoice.id,
            narration=f"Reversal: {entry.narration}",
            client_id=entry.client_id,
            vendor_id=entry.vendor_id,
            branch_id=entry.branch_id,
            financial_year=financial_year
        )
        db.add(reversal)
        reversal_entries.append(reversal)

    invoice.is_posted = False

    return reversal_entries


async def reverse_payment_posting(db: AsyncSession, payment: Payment, settings: CompanySettings) -> List[LedgerEntry]:
    """
    Reverse ledger entries for a payment (for cancellation).
    """
    if not payment.is_posted:
        raise ValueError(f"Payment {payment.payment_number} is not posted")

    # Get original entries
    result = await db.execute(
        select(LedgerEntry).where(
            LedgerEntry.reference_type == ReferenceType.PAYMENT,
            LedgerEntry.reference_id == payment.id
        )
    )
    original_entries = result.scalars().all()

    fy_start = settings.financial_year_start_month or 4
    financial_year = get_financial_year(payment.payment_date, fy_start)
    voucher_number = await generate_voucher_number(db, ReferenceType.PAYMENT, financial_year)

    reversal_entries: List[LedgerEntry] = []

    for entry in original_entries:
        reversal = LedgerEntry(
            entry_date=date.today(),
            voucher_number=voucher_number,
            account_id=entry.account_id,
            debit=entry.credit,
            credit=entry.debit,
            reference_type=ReferenceType.PAYMENT,
            reference_id=payment.id,
            narration=f"Reversal: {entry.narration}",
            client_id=entry.client_id,
            vendor_id=entry.vendor_id,
            branch_id=entry.branch_id,
            financial_year=financial_year
        )
        db.add(reversal)
        reversal_entries.append(reversal)

    payment.is_posted = False

    return reversal_entries


async def should_post_on_create(db: AsyncSession) -> bool:
    """Check if ledger posting should happen on create (vs on send)."""
    settings = await get_company_settings(db)
    if settings:
        return settings.ledger_posting_on == "ON_CREATE"
    return False


async def should_post_on_send(db: AsyncSession) -> bool:
    """Check if ledger posting should happen on send."""
    settings = await get_company_settings(db)
    if settings:
        return settings.ledger_posting_on == "ON_SENT"
    return True  # Default behavior
