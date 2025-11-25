from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, datetime
from decimal import Decimal

from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.payment import Payment, PaymentType
from app.models.client import Client
from app.models.vendor import Vendor
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics."""
    today = datetime.now().date()
    month_start = today.replace(day=1)

    # Total Receivables (Sales invoices with amount due > 0)
    receivables_result = await db.execute(
        select(func.sum(Invoice.amount_due))
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.status.not_in([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]))
    )
    total_receivables = receivables_result.scalar() or Decimal('0')

    # Total Payables (Purchase invoices with amount due > 0)
    payables_result = await db.execute(
        select(func.sum(Invoice.amount_due))
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.status.not_in([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]))
    )
    total_payables = payables_result.scalar() or Decimal('0')

    # Revenue this month
    revenue_result = await db.execute(
        select(func.sum(Invoice.total_amount))
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.invoice_date >= month_start)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    revenue_this_month = revenue_result.scalar() or Decimal('0')

    # Expenses this month
    expenses_result = await db.execute(
        select(func.sum(Invoice.total_amount))
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.invoice_date >= month_start)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    expenses_this_month = expenses_result.scalar() or Decimal('0')

    # Pending invoices count
    pending_result = await db.execute(
        select(func.count())
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIAL]))
    )
    pending_invoices = pending_result.scalar() or 0

    # Overdue invoices count
    overdue_result = await db.execute(
        select(func.count())
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.status == InvoiceStatus.OVERDUE)
    )
    overdue_invoices = overdue_result.scalar() or 0

    # GST Liability (Output - Input for current month)
    output_gst_result = await db.execute(
        select(func.sum(Invoice.cgst_amount + Invoice.sgst_amount + Invoice.igst_amount))
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.invoice_date >= month_start)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    output_gst = output_gst_result.scalar() or Decimal('0')

    input_gst_result = await db.execute(
        select(func.sum(Invoice.cgst_amount + Invoice.sgst_amount + Invoice.igst_amount))
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.invoice_date >= month_start)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    input_gst = input_gst_result.scalar() or Decimal('0')

    gst_liability = output_gst - input_gst

    # TDS Liability (TDS deducted this month)
    tds_result = await db.execute(
        select(func.sum(Invoice.tds_amount))
        .where(Invoice.invoice_date >= month_start)
        .where(Invoice.tds_applicable == True)
    )
    tds_liability = tds_result.scalar() or Decimal('0')

    return {
        "total_receivables": float(total_receivables),
        "total_payables": float(total_payables),
        "revenue_this_month": float(revenue_this_month),
        "expenses_this_month": float(expenses_this_month),
        "pending_invoices": pending_invoices,
        "overdue_invoices": overdue_invoices,
        "gst_liability": float(gst_liability),
        "tds_liability": float(tds_liability),
    }


@router.get("/gst-summary")
async def get_gst_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get GST summary for a period."""
    # Output GST (Sales)
    output_result = await db.execute(
        select(
            func.sum(Invoice.taxable_amount).label('taxable'),
            func.sum(Invoice.cgst_amount).label('cgst'),
            func.sum(Invoice.sgst_amount).label('sgst'),
            func.sum(Invoice.igst_amount).label('igst'),
            func.sum(Invoice.cess_amount).label('cess'),
        )
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.invoice_date >= from_date)
        .where(Invoice.invoice_date <= to_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    output = output_result.one()

    # Input GST (Purchase)
    input_result = await db.execute(
        select(
            func.sum(Invoice.taxable_amount).label('taxable'),
            func.sum(Invoice.cgst_amount).label('cgst'),
            func.sum(Invoice.sgst_amount).label('sgst'),
            func.sum(Invoice.igst_amount).label('igst'),
            func.sum(Invoice.cess_amount).label('cess'),
        )
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.invoice_date >= from_date)
        .where(Invoice.invoice_date <= to_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    input_tax = input_result.one()

    return {
        "period": f"{from_date} to {to_date}",
        "output_tax": {
            "taxable_amount": float(output.taxable or 0),
            "cgst": float(output.cgst or 0),
            "sgst": float(output.sgst or 0),
            "igst": float(output.igst or 0),
            "cess": float(output.cess or 0),
            "total": float((output.cgst or 0) + (output.sgst or 0) + (output.igst or 0) + (output.cess or 0)),
        },
        "input_tax": {
            "taxable_amount": float(input_tax.taxable or 0),
            "cgst": float(input_tax.cgst or 0),
            "sgst": float(input_tax.sgst or 0),
            "igst": float(input_tax.igst or 0),
            "cess": float(input_tax.cess or 0),
            "total": float((input_tax.cgst or 0) + (input_tax.sgst or 0) + (input_tax.igst or 0) + (input_tax.cess or 0)),
        },
        "net_liability": {
            "cgst": float((output.cgst or 0) - (input_tax.cgst or 0)),
            "sgst": float((output.sgst or 0) - (input_tax.sgst or 0)),
            "igst": float((output.igst or 0) - (input_tax.igst or 0)),
            "cess": float((output.cess or 0) - (input_tax.cess or 0)),
        }
    }


@router.get("/tds-summary")
async def get_tds_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get TDS summary for a period."""
    result = await db.execute(
        select(
            Invoice.tds_section,
            func.count().label('count'),
            func.sum(Invoice.taxable_amount).label('payment_amount'),
            func.sum(Invoice.tds_amount).label('tds_amount'),
        )
        .where(Invoice.tds_applicable == True)
        .where(Invoice.invoice_date >= from_date)
        .where(Invoice.invoice_date <= to_date)
        .group_by(Invoice.tds_section)
    )
    rows = result.all()

    summary = []
    for row in rows:
        summary.append({
            "section": row.tds_section or "N/A",
            "deductee_count": row.count,
            "total_payment": float(row.payment_amount or 0),
            "total_tds": float(row.tds_amount or 0),
        })

    return {
        "period": f"{from_date} to {to_date}",
        "summary": summary,
        "total_tds": sum(s['total_tds'] for s in summary),
    }


@router.get("/aging")
async def get_aging_report(
    report_type: str = Query("receivables", enum=["receivables", "payables"]),
    as_on_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aging report for receivables or payables."""
    if not as_on_date:
        as_on_date = datetime.now().date()

    invoice_type = InvoiceType.SALES if report_type == "receivables" else InvoiceType.PURCHASE

    result = await db.execute(
        select(Invoice)
        .where(Invoice.invoice_type == invoice_type)
        .where(Invoice.amount_due > 0)
        .where(Invoice.status.not_in([InvoiceStatus.CANCELLED, InvoiceStatus.PAID]))
    )
    invoices = result.scalars().all()

    # Categorize by aging buckets
    buckets = {
        "current": Decimal('0'),  # 0-30 days
        "30_60": Decimal('0'),    # 31-60 days
        "60_90": Decimal('0'),    # 61-90 days
        "90_plus": Decimal('0'),  # 90+ days
    }

    details = []
    for inv in invoices:
        days_overdue = (as_on_date - inv.due_date).days

        if days_overdue <= 0:
            bucket = "current"
        elif days_overdue <= 30:
            bucket = "current"
        elif days_overdue <= 60:
            bucket = "30_60"
        elif days_overdue <= 90:
            bucket = "60_90"
        else:
            bucket = "90_plus"

        buckets[bucket] += inv.amount_due

        details.append({
            "invoice_number": inv.invoice_number,
            "invoice_date": str(inv.invoice_date),
            "due_date": str(inv.due_date),
            "days_overdue": max(0, days_overdue),
            "amount_due": float(inv.amount_due),
            "bucket": bucket,
        })

    return {
        "as_on_date": str(as_on_date),
        "report_type": report_type,
        "summary": {
            "current": float(buckets["current"]),
            "30_60_days": float(buckets["30_60"]),
            "60_90_days": float(buckets["60_90"]),
            "90_plus_days": float(buckets["90_plus"]),
            "total": float(sum(buckets.values())),
        },
        "details": details,
    }
