"""
Fulfillment Service for Client PO -> Invoice workflow

Handles:
- Creating proforma invoices (PI) from billing schedules
- Creating invoices from billing schedules
- Updating billing schedule status
- Updating ClientPO fulfillment amounts
"""
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.client_po import ClientPO, ClientPOStatus
from app.models.billing_schedule import BillingSchedule, ScheduleStatus
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.proforma_invoice import ProformaInvoice, ProformaInvoiceItem, PIStatus
from app.models.client import Client
from app.services.number_generator import generate_invoice_number, generate_pi_number


async def update_schedule_status(
    db: AsyncSession,
    schedule_id: int,
    new_status: ScheduleStatus,
    invoice_id: int = None
) -> BillingSchedule:
    """Update a billing schedule's status and optionally link to invoice."""
    result = await db.execute(
        select(BillingSchedule).where(BillingSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise ValueError(f"Schedule {schedule_id} not found")

    schedule.status = new_status
    if invoice_id:
        schedule.invoice_id = invoice_id

    return schedule


async def update_po_fulfillment(db: AsyncSession, client_po_id: int) -> ClientPO:
    """
    Recalculate and update ClientPO fulfillment amounts.
    Based on the total amount of linked invoices that are not cancelled.
    """
    result = await db.execute(
        select(ClientPO)
        .options(selectinload(ClientPO.invoices))
        .where(ClientPO.id == client_po_id)
    )
    client_po = result.scalar_one_or_none()

    if not client_po:
        raise ValueError(f"ClientPO {client_po_id} not found")

    # Sum up invoiced amounts from non-cancelled invoices
    invoiced_amount = Decimal('0')
    for invoice in client_po.invoices:
        if invoice.status != InvoiceStatus.CANCELLED:
            invoiced_amount += invoice.total_amount

    client_po.invoiced_amount = invoiced_amount
    client_po.remaining_amount = client_po.total_amount - invoiced_amount

    # Update PO status based on fulfillment
    if invoiced_amount == Decimal('0'):
        if client_po.status not in [ClientPOStatus.DRAFT, ClientPOStatus.CANCELLED, ClientPOStatus.EXPIRED]:
            client_po.status = ClientPOStatus.ACTIVE
    elif invoiced_amount >= client_po.total_amount:
        client_po.status = ClientPOStatus.COMPLETED
    else:
        client_po.status = ClientPOStatus.PARTIAL

    return client_po


async def create_invoice_from_schedule(
    db: AsyncSession,
    schedule_id: int,
    invoice_date: date = None,
    due_date: date = None,
    bank_account_id: int = None,
    notes: str = None
) -> Invoice:
    """
    Create a SALES invoice from a billing schedule.

    This will:
    1. Get the billing schedule and its parent ClientPO
    2. Create a SALES invoice with the schedule amounts
    3. Update the schedule status to INVOICED
    4. Update the ClientPO fulfillment amounts
    """
    # Get schedule with parent PO
    result = await db.execute(
        select(BillingSchedule)
        .options(
            selectinload(BillingSchedule.client_po).selectinload(ClientPO.client),
            selectinload(BillingSchedule.client_po).selectinload(ClientPO.branch),
            selectinload(BillingSchedule.client_po).selectinload(ClientPO.items)
        )
        .where(BillingSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise ValueError(f"Schedule {schedule_id} not found")

    if schedule.status != ScheduleStatus.PENDING:
        raise ValueError(f"Schedule {schedule_id} is not in PENDING status (current: {schedule.status.value})")

    client_po = schedule.client_po
    if not client_po:
        raise ValueError(f"Schedule {schedule_id} has no linked ClientPO")

    # Use provided dates or defaults
    if invoice_date is None:
        invoice_date = date.today()
    if due_date is None:
        due_date = schedule.due_date

    # Generate invoice number
    invoice_number = await generate_invoice_number(db, InvoiceType.SALES.value)

    # Calculate GST split
    is_igst = client_po.is_igst
    gst_amount = schedule.gst_amount

    if is_igst:
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = gst_amount
    else:
        cgst_amount = gst_amount / 2
        sgst_amount = gst_amount / 2
        igst_amount = Decimal('0')

    # Create invoice
    invoice = Invoice(
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        invoice_type=InvoiceType.SALES,
        client_id=client_po.client_id,
        branch_id=client_po.branch_id,
        bank_account_id=bank_account_id,
        client_po_id=client_po.id,
        billing_schedule_id=schedule.id,
        place_of_supply=client_po.place_of_supply or "",
        place_of_supply_code=client_po.place_of_supply_code or "",
        is_igst=is_igst,
        reverse_charge=False,
        subtotal=schedule.amount,
        discount_percent=Decimal('0'),
        discount_amount=Decimal('0'),
        taxable_amount=schedule.amount,
        cgst_amount=cgst_amount,
        sgst_amount=sgst_amount,
        igst_amount=igst_amount,
        cess_amount=Decimal('0'),
        round_off=Decimal('0'),
        total_amount=schedule.total_amount,
        tds_applicable=False,
        tds_rate=Decimal('0'),
        tds_amount=Decimal('0'),
        tcs_applicable=False,
        tcs_rate=Decimal('0'),
        tcs_amount=Decimal('0'),
        amount_after_tds=schedule.total_amount,
        amount_due=schedule.total_amount,
        amount_paid=Decimal('0'),
        due_date=due_date,
        notes=notes or schedule.notes,
        status=InvoiceStatus.DRAFT,
        is_posted=False,
    )

    # Create invoice item from schedule
    # Determine GST rate from the schedule amounts
    if schedule.amount > 0:
        gst_rate = (schedule.gst_amount / schedule.amount * 100).quantize(Decimal('0.01'))
    else:
        gst_rate = Decimal('18')

    description = schedule.description or f"Invoice for {client_po.subject or client_po.internal_number}"

    invoice_item = InvoiceItem(
        serial_no=1,
        description=description,
        hsn_sac=client_po.items[0].hsn_sac if client_po.items else None,
        quantity=Decimal('1'),
        unit="NOS",
        rate=schedule.amount,
        amount=schedule.amount,
        discount_percent=Decimal('0'),
        discount_amount=Decimal('0'),
        taxable_amount=schedule.amount,
        gst_rate=gst_rate,
        cgst_rate=gst_rate / 2 if not is_igst else Decimal('0'),
        cgst_amount=cgst_amount,
        sgst_rate=gst_rate / 2 if not is_igst else Decimal('0'),
        sgst_amount=sgst_amount,
        igst_rate=gst_rate if is_igst else Decimal('0'),
        igst_amount=igst_amount,
        cess_rate=Decimal('0'),
        cess_amount=Decimal('0'),
        total_amount=schedule.total_amount,
    )
    invoice.items.append(invoice_item)

    db.add(invoice)
    await db.flush()  # Get the invoice ID

    # Update schedule status
    schedule.status = ScheduleStatus.INVOICED
    schedule.invoice_id = invoice.id

    # Update PO fulfillment
    await update_po_fulfillment(db, client_po.id)

    return invoice


async def create_pi_from_schedule(
    db: AsyncSession,
    schedule_id: int,
    pi_date: date = None,
    due_date: date = None,
    bank_account_id: int = None,
    notes: str = None
) -> ProformaInvoice:
    """
    Create a Proforma Invoice (PI) from a billing schedule.

    This will:
    1. Get the billing schedule and its parent ClientPO
    2. Create a Proforma Invoice with the schedule amounts
    3. Update the schedule status to PI_RAISED
    """
    # Get schedule with parent PO
    result = await db.execute(
        select(BillingSchedule)
        .options(
            selectinload(BillingSchedule.client_po).selectinload(ClientPO.client),
            selectinload(BillingSchedule.client_po).selectinload(ClientPO.branch),
            selectinload(BillingSchedule.client_po).selectinload(ClientPO.items)
        )
        .where(BillingSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise ValueError(f"Schedule {schedule_id} not found")

    if schedule.status != ScheduleStatus.PENDING:
        raise ValueError(f"Schedule {schedule_id} is not in PENDING status (current: {schedule.status.value})")

    client_po = schedule.client_po
    if not client_po:
        raise ValueError(f"Schedule {schedule_id} has no linked ClientPO")

    # Use provided dates or defaults
    if pi_date is None:
        pi_date = date.today()
    if due_date is None:
        due_date = schedule.due_date

    # Generate PI number
    pi_number = await generate_pi_number(db, pi_date)

    # Calculate GST split
    is_igst = client_po.is_igst
    gst_amount = schedule.gst_amount

    if is_igst:
        cgst_amount = Decimal('0')
        sgst_amount = Decimal('0')
        igst_amount = gst_amount
    else:
        cgst_amount = gst_amount / 2
        sgst_amount = gst_amount / 2
        igst_amount = Decimal('0')

    # Determine GST rate from the schedule amounts
    if schedule.amount > 0:
        gst_rate = (schedule.gst_amount / schedule.amount * 100).quantize(Decimal('0.01'))
    else:
        gst_rate = Decimal('18')

    # Create Proforma Invoice
    pi = ProformaInvoice(
        pi_number=pi_number,
        pi_date=pi_date,
        due_date=due_date,
        valid_until=due_date,
        client_id=client_po.client_id,
        branch_id=client_po.branch_id,
        bank_account_id=bank_account_id,
        billing_schedule_id=schedule.id,
        place_of_supply=client_po.place_of_supply or "",
        place_of_supply_code=client_po.place_of_supply_code or "",
        is_igst=is_igst,
        reverse_charge=False,
        subtotal=schedule.amount,
        discount_percent=Decimal('0'),
        discount_amount=Decimal('0'),
        taxable_amount=schedule.amount,
        cgst_amount=cgst_amount,
        sgst_amount=sgst_amount,
        igst_amount=igst_amount,
        cess_amount=Decimal('0'),
        round_off=Decimal('0'),
        total_amount=schedule.total_amount,
        tds_applicable=False,
        tds_rate=Decimal('0'),
        tds_amount=Decimal('0'),
        tcs_applicable=False,
        tcs_rate=Decimal('0'),
        tcs_amount=Decimal('0'),
        amount_after_tds=schedule.total_amount,  # Set to total_amount since TDS is not applicable
        notes=notes or schedule.notes,
        status=PIStatus.DRAFT,
    )

    # Create PI item from schedule
    description = schedule.description or f"Proforma Invoice for {client_po.subject or client_po.internal_number}"

    pi_item = ProformaInvoiceItem(
        serial_no=1,
        description=description,
        hsn_sac=client_po.items[0].hsn_sac if client_po.items else None,
        quantity=Decimal('1'),
        unit="NOS",
        rate=schedule.amount,
        amount=schedule.amount,
        discount_percent=Decimal('0'),
        discount_amount=Decimal('0'),
        taxable_amount=schedule.amount,
        gst_rate=gst_rate,
        cgst_rate=gst_rate / 2 if not is_igst else Decimal('0'),
        cgst_amount=cgst_amount,
        sgst_rate=gst_rate / 2 if not is_igst else Decimal('0'),
        sgst_amount=sgst_amount,
        igst_rate=gst_rate if is_igst else Decimal('0'),
        igst_amount=igst_amount,
        cess_rate=Decimal('0'),
        cess_amount=Decimal('0'),
        total_amount=schedule.total_amount,
    )
    pi.items.append(pi_item)

    db.add(pi)
    await db.flush()  # Get the PI ID

    # Update schedule status to PI_RAISED
    schedule.status = ScheduleStatus.PI_RAISED
    schedule.proforma_invoice_id = pi.id

    return pi
