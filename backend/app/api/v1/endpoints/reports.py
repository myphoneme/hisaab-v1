from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload
from datetime import date, datetime, timedelta
from decimal import Decimal
import io

from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.payment import Payment, PaymentType
from app.models.client import Client
from app.models.vendor import Vendor
from app.models.user import User
from app.models.settings import CompanySettings
from app.core.security import get_current_user

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard_stats(
    branch_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics with optional branch and date filtering."""
    today = datetime.now().date()
    month_start = today.replace(day=1)

    # Use provided dates or default to current month
    start_date = from_date if from_date else month_start
    end_date = to_date if to_date else today

    # Total Receivables (Sales invoices with amount due > 0)
    receivables_query = (
        select(func.sum(Invoice.amount_due))
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.status.not_in([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]))
    )
    if branch_id:
        receivables_query = receivables_query.where(Invoice.branch_id == branch_id)
    # Filter by invoice date if date range is provided
    if from_date:
        receivables_query = receivables_query.where(Invoice.invoice_date >= start_date)
    if to_date:
        receivables_query = receivables_query.where(Invoice.invoice_date <= end_date)
    receivables_result = await db.execute(receivables_query)
    total_receivables = receivables_result.scalar() or Decimal('0')

    # Total Payables (Purchase invoices with amount due > 0)
    payables_query = (
        select(func.sum(Invoice.amount_due))
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.status.not_in([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]))
    )
    if branch_id:
        payables_query = payables_query.where(Invoice.branch_id == branch_id)
    # Filter by invoice date if date range is provided
    if from_date:
        payables_query = payables_query.where(Invoice.invoice_date >= start_date)
    if to_date:
        payables_query = payables_query.where(Invoice.invoice_date <= end_date)
    payables_result = await db.execute(payables_query)
    total_payables = payables_result.scalar() or Decimal('0')

    # Revenue for period
    revenue_query = (
        select(func.sum(Invoice.total_amount))
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.invoice_date >= start_date)
        .where(Invoice.invoice_date <= end_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    if branch_id:
        revenue_query = revenue_query.where(Invoice.branch_id == branch_id)
    revenue_result = await db.execute(revenue_query)
    revenue_this_month = revenue_result.scalar() or Decimal('0')

    # Expenses for period
    expenses_query = (
        select(func.sum(Invoice.total_amount))
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.invoice_date >= start_date)
        .where(Invoice.invoice_date <= end_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    if branch_id:
        expenses_query = expenses_query.where(Invoice.branch_id == branch_id)
    expenses_result = await db.execute(expenses_query)
    expenses_this_month = expenses_result.scalar() or Decimal('0')

    # Pending invoices count
    pending_query = (
        select(func.count())
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIAL]))
    )
    if branch_id:
        pending_query = pending_query.where(Invoice.branch_id == branch_id)
    if from_date:
        pending_query = pending_query.where(Invoice.invoice_date >= start_date)
    if to_date:
        pending_query = pending_query.where(Invoice.invoice_date <= end_date)
    pending_result = await db.execute(pending_query)
    pending_invoices = pending_result.scalar() or 0

    # Overdue invoices count
    overdue_query = (
        select(func.count())
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.status == InvoiceStatus.OVERDUE)
    )
    if branch_id:
        overdue_query = overdue_query.where(Invoice.branch_id == branch_id)
    if from_date:
        overdue_query = overdue_query.where(Invoice.invoice_date >= start_date)
    if to_date:
        overdue_query = overdue_query.where(Invoice.invoice_date <= end_date)
    overdue_result = await db.execute(overdue_query)
    overdue_invoices = overdue_result.scalar() or 0

    # GST Liability (Output - Input for current period)
    output_gst_query = (
        select(func.sum(Invoice.cgst_amount + Invoice.sgst_amount + Invoice.igst_amount))
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.invoice_date >= start_date)
        .where(Invoice.invoice_date <= end_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    if branch_id:
        output_gst_query = output_gst_query.where(Invoice.branch_id == branch_id)
    output_gst_result = await db.execute(output_gst_query)
    output_gst = output_gst_result.scalar() or Decimal('0')

    input_gst_query = (
        select(func.sum(Invoice.cgst_amount + Invoice.sgst_amount + Invoice.igst_amount))
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.invoice_date >= start_date)
        .where(Invoice.invoice_date <= end_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    if branch_id:
        input_gst_query = input_gst_query.where(Invoice.branch_id == branch_id)
    input_gst_result = await db.execute(input_gst_query)
    input_gst = input_gst_result.scalar() or Decimal('0')

    gst_liability = output_gst - input_gst

    # TDS Liability (TDS deducted in period)
    tds_query = (
        select(func.sum(Invoice.tds_amount))
        .where(Invoice.invoice_date >= start_date)
        .where(Invoice.invoice_date <= end_date)
        .where(Invoice.tds_applicable == True)
    )
    if branch_id:
        tds_query = tds_query.where(Invoice.branch_id == branch_id)
    tds_result = await db.execute(tds_query)
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


@router.get("/gstr-1")
async def get_gstr1_report(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get GSTR-1 report format for the period."""
    # Get all sales invoices and credit notes for the period
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items), selectinload(Invoice.client))
        .where(Invoice.invoice_type.in_([InvoiceType.SALES, InvoiceType.CREDIT_NOTE]))
        .where(Invoice.invoice_date >= from_date)
        .where(Invoice.invoice_date <= to_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    invoices = result.scalars().all()

    # B2B Supplies (with GSTIN)
    b2b_supplies = []
    # B2C Large (> 2.5 lakh)
    b2c_large = []
    # B2C Small (< 2.5 lakh)
    b2c_small_summary = {}
    # Credit/Debit Notes
    credit_debit_notes = []
    # HSN Summary
    hsn_summary = {}

    for inv in invoices:
        client = inv.client

        # Skip if no client (shouldn't happen for sales)
        if not client:
            continue

        if inv.invoice_type == InvoiceType.CREDIT_NOTE:
            # Credit Notes
            credit_debit_notes.append({
                "note_type": "C",  # C for Credit Note
                "note_number": inv.invoice_number,
                "note_date": str(inv.invoice_date),
                "invoice_number": "",  # Original invoice number
                "invoice_date": "",
                "party_name": client.name,
                "gstin": client.gstin or "",
                "place_of_supply": inv.place_of_supply,
                "taxable_value": float(inv.taxable_amount),
                "cgst": float(inv.cgst_amount),
                "sgst": float(inv.sgst_amount),
                "igst": float(inv.igst_amount),
                "cess": float(inv.cess_amount),
            })
            continue

        # For regular sales invoices
        if client.gstin and client.client_type in ['B2B', 'B2G']:
            # B2B Supply (registered)
            b2b_supplies.append({
                "invoice_number": inv.invoice_number,
                "invoice_date": str(inv.invoice_date),
                "party_name": client.name,
                "gstin": client.gstin,
                "place_of_supply": inv.place_of_supply,
                "reverse_charge": "Y" if inv.reverse_charge else "N",
                "invoice_type": "Regular",
                "taxable_value": float(inv.taxable_amount),
                "cgst": float(inv.cgst_amount),
                "sgst": float(inv.sgst_amount),
                "igst": float(inv.igst_amount),
                "cess": float(inv.cess_amount),
                "total_value": float(inv.total_amount),
            })
        elif inv.total_amount > Decimal('250000'):
            # B2C Large (> 2.5 lakh)
            b2c_large.append({
                "invoice_number": inv.invoice_number,
                "invoice_date": str(inv.invoice_date),
                "place_of_supply": inv.place_of_supply,
                "taxable_value": float(inv.taxable_amount),
                "cgst": float(inv.cgst_amount),
                "sgst": float(inv.sgst_amount),
                "igst": float(inv.igst_amount),
                "cess": float(inv.cess_amount),
                "total_value": float(inv.total_amount),
            })
        else:
            # B2C Small (< 2.5 lakh) - summarized by state and rate
            key = (inv.place_of_supply, "CGST/SGST" if not inv.is_igst else "IGST")
            if key not in b2c_small_summary:
                b2c_small_summary[key] = {
                    "place_of_supply": inv.place_of_supply,
                    "type": key[1],
                    "taxable_value": Decimal('0'),
                    "cgst": Decimal('0'),
                    "sgst": Decimal('0'),
                    "igst": Decimal('0'),
                    "cess": Decimal('0'),
                }
            b2c_small_summary[key]["taxable_value"] += inv.taxable_amount
            b2c_small_summary[key]["cgst"] += inv.cgst_amount
            b2c_small_summary[key]["sgst"] += inv.sgst_amount
            b2c_small_summary[key]["igst"] += inv.igst_amount
            b2c_small_summary[key]["cess"] += inv.cess_amount

        # HSN Summary
        for item in inv.items:
            hsn = item.hsn_sac or "N/A"
            gst_rate = item.gst_rate
            key = (hsn, float(gst_rate))

            if key not in hsn_summary:
                hsn_summary[key] = {
                    "hsn_code": hsn,
                    "uqc": item.unit,
                    "quantity": Decimal('0'),
                    "taxable_value": Decimal('0'),
                    "cgst": Decimal('0'),
                    "sgst": Decimal('0'),
                    "igst": Decimal('0'),
                    "cess": Decimal('0'),
                    "rate": float(gst_rate),
                }
            hsn_summary[key]["quantity"] += item.quantity
            hsn_summary[key]["taxable_value"] += item.taxable_amount
            hsn_summary[key]["cgst"] += item.cgst_amount
            hsn_summary[key]["sgst"] += item.sgst_amount
            hsn_summary[key]["igst"] += item.igst_amount
            hsn_summary[key]["cess"] += item.cess_amount

    # Convert b2c_small_summary and hsn_summary to lists
    b2c_small = [
        {
            **v,
            "taxable_value": float(v["taxable_value"]),
            "cgst": float(v["cgst"]),
            "sgst": float(v["sgst"]),
            "igst": float(v["igst"]),
            "cess": float(v["cess"]),
        }
        for v in b2c_small_summary.values()
    ]

    hsn_list = [
        {
            **v,
            "quantity": float(v["quantity"]),
            "taxable_value": float(v["taxable_value"]),
            "cgst": float(v["cgst"]),
            "sgst": float(v["sgst"]),
            "igst": float(v["igst"]),
            "cess": float(v["cess"]),
        }
        for v in hsn_summary.values()
    ]

    return {
        "period": f"{from_date} to {to_date}",
        "gstin": "",  # Should be fetched from company settings
        "legal_name": "",  # Should be fetched from company settings
        "b2b_supplies": b2b_supplies,
        "b2c_large": b2c_large,
        "b2c_small": b2c_small,
        "credit_debit_notes": credit_debit_notes,
        "hsn_summary": hsn_list,
        "document_summary": {
            "total_invoices": len([inv for inv in invoices if inv.invoice_type == InvoiceType.SALES]),
            "total_credit_notes": len([inv for inv in invoices if inv.invoice_type == InvoiceType.CREDIT_NOTE]),
            "cancelled": 0,
        }
    }


@router.get("/gstr-3b")
async def get_gstr3b_report(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get GSTR-3B report format for the period."""
    # Outward Supplies (Sales)
    sales_result = await db.execute(
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
    sales = sales_result.one()

    # Inward Supplies liable to reverse charge
    reverse_charge_result = await db.execute(
        select(
            func.sum(Invoice.taxable_amount).label('taxable'),
            func.sum(Invoice.cgst_amount).label('cgst'),
            func.sum(Invoice.sgst_amount).label('sgst'),
            func.sum(Invoice.igst_amount).label('igst'),
            func.sum(Invoice.cess_amount).label('cess'),
        )
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.reverse_charge == True)
        .where(Invoice.invoice_date >= from_date)
        .where(Invoice.invoice_date <= to_date)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
    )
    reverse_charge = reverse_charge_result.one()

    # Eligible ITC (Input Tax Credit) - from purchases
    purchase_result = await db.execute(
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
    purchases = purchase_result.one()

    return {
        "period": f"{from_date} to {to_date}",
        "gstin": "",  # Should be fetched from company settings
        "legal_name": "",  # Should be fetched from company settings
        "section_3_1": {
            "description": "Outward taxable supplies (other than zero rated, nil rated and exempted)",
            "taxable_value": float(sales.taxable or 0),
            "cgst": float(sales.cgst or 0),
            "sgst": float(sales.sgst or 0),
            "igst": float(sales.igst or 0),
            "cess": float(sales.cess or 0),
        },
        "section_3_2": {
            "description": "Outward taxable supplies (zero rated)",
            "taxable_value": 0,
            "cgst": 0,
            "sgst": 0,
            "igst": 0,
            "cess": 0,
        },
        "section_4": {
            "description": "Inward supplies liable to reverse charge",
            "taxable_value": float(reverse_charge.taxable or 0),
            "cgst": float(reverse_charge.cgst or 0),
            "sgst": float(reverse_charge.sgst or 0),
            "igst": float(reverse_charge.igst or 0),
            "cess": float(reverse_charge.cess or 0),
        },
        "section_4_itc": {
            "description": "Eligible ITC",
            "import_of_goods": {"igst": 0, "cess": 0},
            "import_of_services": {"igst": 0, "cess": 0},
            "inputs": {
                "cgst": float(purchases.cgst or 0),
                "sgst": float(purchases.sgst or 0),
                "igst": float(purchases.igst or 0),
                "cess": float(purchases.cess or 0),
            },
            "capital_goods": {"cgst": 0, "sgst": 0, "igst": 0, "cess": 0},
            "itc_reversed": {"cgst": 0, "sgst": 0, "igst": 0, "cess": 0},
            "net_itc_available": {
                "cgst": float(purchases.cgst or 0),
                "sgst": float(purchases.sgst or 0),
                "igst": float(purchases.igst or 0),
                "cess": float(purchases.cess or 0),
            },
        },
        "section_5_exempt": {
            "description": "Values of exempt, nil-rated and non-GST supplies",
            "inter_state": 0,
            "intra_state": 0,
        },
        "section_6_net_tax": {
            "description": "Net tax liability",
            "cgst": float((sales.cgst or 0) - (purchases.cgst or 0)),
            "sgst": float((sales.sgst or 0) - (purchases.sgst or 0)),
            "igst": float((sales.igst or 0) - (purchases.igst or 0)),
            "cess": float((sales.cess or 0) - (purchases.cess or 0)),
        },
    }


@router.get("/profit-loss")
async def get_profit_loss(
    from_date: date = Query(...),
    to_date: date = Query(...),
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get Profit & Loss statement for a period."""
    from app.models.ledger import LedgerEntry, ChartOfAccount

    # Build base query with date filter
    base_where = [
        LedgerEntry.entry_date >= from_date,
        LedgerEntry.entry_date <= to_date,
    ]
    if branch_id:
        base_where.append(LedgerEntry.branch_id == branch_id)

    # Revenue (Credit balance in REVENUE accounts)
    revenue_result = await db.execute(
        select(
            ChartOfAccount.name.label('account_name'),
            ChartOfAccount.code.label('account_code'),
            func.sum(LedgerEntry.credit - LedgerEntry.debit).label('amount')
        )
        .join(ChartOfAccount, LedgerEntry.account_id == ChartOfAccount.id)
        .where(ChartOfAccount.account_type == 'REVENUE')
        .where(*base_where)
        .group_by(ChartOfAccount.id, ChartOfAccount.name, ChartOfAccount.code)
        .having(func.sum(LedgerEntry.credit - LedgerEntry.debit) != 0)
    )
    revenue_items = revenue_result.all()
    total_revenue = sum(float(r.amount or 0) for r in revenue_items)

    # Cost of Goods Sold (Debit balance in EXPENSE accounts with group 'COGS' or 'Cost of Goods Sold')
    cogs_result = await db.execute(
        select(
            ChartOfAccount.name.label('account_name'),
            ChartOfAccount.code.label('account_code'),
            func.sum(LedgerEntry.debit - LedgerEntry.credit).label('amount')
        )
        .join(ChartOfAccount, LedgerEntry.account_id == ChartOfAccount.id)
        .where(ChartOfAccount.account_type == 'EXPENSE')
        .where(ChartOfAccount.account_group.in_(['COGS', 'Cost of Goods Sold', 'Purchase']))
        .where(*base_where)
        .group_by(ChartOfAccount.id, ChartOfAccount.name, ChartOfAccount.code)
        .having(func.sum(LedgerEntry.debit - LedgerEntry.credit) != 0)
    )
    cogs_items = cogs_result.all()
    total_cogs = sum(float(r.amount or 0) for r in cogs_items)

    # Operating Expenses (Debit balance in EXPENSE accounts excluding COGS)
    expenses_result = await db.execute(
        select(
            ChartOfAccount.name.label('account_name'),
            ChartOfAccount.code.label('account_code'),
            func.sum(LedgerEntry.debit - LedgerEntry.credit).label('amount')
        )
        .join(ChartOfAccount, LedgerEntry.account_id == ChartOfAccount.id)
        .where(ChartOfAccount.account_type == 'EXPENSE')
        .where(~ChartOfAccount.account_group.in_(['COGS', 'Cost of Goods Sold', 'Purchase']))
        .where(*base_where)
        .group_by(ChartOfAccount.id, ChartOfAccount.name, ChartOfAccount.code)
        .having(func.sum(LedgerEntry.debit - LedgerEntry.credit) != 0)
    )
    expense_items = expenses_result.all()
    total_expenses = sum(float(r.amount or 0) for r in expense_items)

    # Calculate summary
    gross_profit = total_revenue - total_cogs
    operating_profit = gross_profit - total_expenses
    net_profit = operating_profit  # Add other income/expenses if needed

    return {
        "period": f"{from_date} to {to_date}",
        "branch_id": branch_id,
        "revenue": {
            "items": [
                {"account_code": r.account_code, "account_name": r.account_name, "amount": float(r.amount or 0)}
                for r in revenue_items
            ],
            "total": total_revenue,
        },
        "cost_of_goods_sold": {
            "items": [
                {"account_code": r.account_code, "account_name": r.account_name, "amount": float(r.amount or 0)}
                for r in cogs_items
            ],
            "total": total_cogs,
        },
        "gross_profit": gross_profit,
        "operating_expenses": {
            "items": [
                {"account_code": r.account_code, "account_name": r.account_name, "amount": float(r.amount or 0)}
                for r in expense_items
            ],
            "total": total_expenses,
        },
        "operating_profit": operating_profit,
        "net_profit": net_profit,
    }


@router.get("/balance-sheet")
async def get_balance_sheet(
    as_on_date: date = Query(...),
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get Balance Sheet as on a specific date."""
    from app.models.ledger import LedgerEntry, ChartOfAccount

    # Build base query with date filter (all entries up to as_on_date)
    base_where = [LedgerEntry.entry_date <= as_on_date]
    if branch_id:
        base_where.append(LedgerEntry.branch_id == branch_id)

    # Assets (Debit balance)
    assets_result = await db.execute(
        select(
            ChartOfAccount.name.label('account_name'),
            ChartOfAccount.code.label('account_code'),
            ChartOfAccount.account_group,
            func.sum(LedgerEntry.debit - LedgerEntry.credit).label('amount')
        )
        .join(ChartOfAccount, LedgerEntry.account_id == ChartOfAccount.id)
        .where(ChartOfAccount.account_type == 'ASSET')
        .where(*base_where)
        .group_by(ChartOfAccount.id, ChartOfAccount.name, ChartOfAccount.code, ChartOfAccount.account_group)
        .having(func.sum(LedgerEntry.debit - LedgerEntry.credit) != 0)
    )
    asset_items = assets_result.all()

    # Group assets by category
    current_assets = [a for a in asset_items if a.account_group in ['Current Assets', 'Bank', 'Cash', 'Receivables', 'Inventory']]
    fixed_assets = [a for a in asset_items if a.account_group in ['Fixed Assets', 'Property', 'Equipment']]
    other_assets = [a for a in asset_items if a not in current_assets and a not in fixed_assets]

    total_current_assets = sum(float(a.amount or 0) for a in current_assets)
    total_fixed_assets = sum(float(a.amount or 0) for a in fixed_assets)
    total_other_assets = sum(float(a.amount or 0) for a in other_assets)
    total_assets = total_current_assets + total_fixed_assets + total_other_assets

    # Liabilities (Credit balance)
    liabilities_result = await db.execute(
        select(
            ChartOfAccount.name.label('account_name'),
            ChartOfAccount.code.label('account_code'),
            ChartOfAccount.account_group,
            func.sum(LedgerEntry.credit - LedgerEntry.debit).label('amount')
        )
        .join(ChartOfAccount, LedgerEntry.account_id == ChartOfAccount.id)
        .where(ChartOfAccount.account_type == 'LIABILITY')
        .where(*base_where)
        .group_by(ChartOfAccount.id, ChartOfAccount.name, ChartOfAccount.code, ChartOfAccount.account_group)
        .having(func.sum(LedgerEntry.credit - LedgerEntry.debit) != 0)
    )
    liability_items = liabilities_result.all()

    # Group liabilities
    current_liabilities = [l for l in liability_items if l.account_group in ['Current Liabilities', 'Payables', 'Short Term Loans']]
    long_term_liabilities = [l for l in liability_items if l.account_group in ['Long Term Liabilities', 'Loans']]
    other_liabilities = [l for l in liability_items if l not in current_liabilities and l not in long_term_liabilities]

    total_current_liabilities = sum(float(l.amount or 0) for l in current_liabilities)
    total_long_term_liabilities = sum(float(l.amount or 0) for l in long_term_liabilities)
    total_other_liabilities = sum(float(l.amount or 0) for l in other_liabilities)
    total_liabilities = total_current_liabilities + total_long_term_liabilities + total_other_liabilities

    # Equity (Credit balance)
    equity_result = await db.execute(
        select(
            ChartOfAccount.name.label('account_name'),
            ChartOfAccount.code.label('account_code'),
            func.sum(LedgerEntry.credit - LedgerEntry.debit).label('amount')
        )
        .join(ChartOfAccount, LedgerEntry.account_id == ChartOfAccount.id)
        .where(ChartOfAccount.account_type == 'EQUITY')
        .where(*base_where)
        .group_by(ChartOfAccount.id, ChartOfAccount.name, ChartOfAccount.code)
        .having(func.sum(LedgerEntry.credit - LedgerEntry.debit) != 0)
    )
    equity_items = equity_result.all()
    total_equity = sum(float(e.amount or 0) for e in equity_items)

    # Calculate retained earnings (Revenue - Expenses for all time)
    retained_earnings_result = await db.execute(
        select(
            func.sum(
                case(
                    (ChartOfAccount.account_type == 'REVENUE', LedgerEntry.credit - LedgerEntry.debit),
                    else_=-(LedgerEntry.debit - LedgerEntry.credit)
                )
            )
        )
        .join(ChartOfAccount, LedgerEntry.account_id == ChartOfAccount.id)
        .where(ChartOfAccount.account_type.in_(['REVENUE', 'EXPENSE']))
        .where(*base_where)
    )
    retained_earnings = float(retained_earnings_result.scalar() or 0)

    total_equity_with_retained = total_equity + retained_earnings

    return {
        "as_on_date": str(as_on_date),
        "branch_id": branch_id,
        "assets": {
            "current_assets": {
                "items": [{"account_code": a.account_code, "account_name": a.account_name, "amount": float(a.amount or 0)} for a in current_assets],
                "total": total_current_assets,
            },
            "fixed_assets": {
                "items": [{"account_code": a.account_code, "account_name": a.account_name, "amount": float(a.amount or 0)} for a in fixed_assets],
                "total": total_fixed_assets,
            },
            "other_assets": {
                "items": [{"account_code": a.account_code, "account_name": a.account_name, "amount": float(a.amount or 0)} for a in other_assets],
                "total": total_other_assets,
            },
            "total": total_assets,
        },
        "liabilities": {
            "current_liabilities": {
                "items": [{"account_code": l.account_code, "account_name": l.account_name, "amount": float(l.amount or 0)} for l in current_liabilities],
                "total": total_current_liabilities,
            },
            "long_term_liabilities": {
                "items": [{"account_code": l.account_code, "account_name": l.account_name, "amount": float(l.amount or 0)} for l in long_term_liabilities],
                "total": total_long_term_liabilities,
            },
            "other_liabilities": {
                "items": [{"account_code": l.account_code, "account_name": l.account_name, "amount": float(l.amount or 0)} for l in other_liabilities],
                "total": total_other_liabilities,
            },
            "total": total_liabilities,
        },
        "equity": {
            "items": [{"account_code": e.account_code, "account_name": e.account_name, "amount": float(e.amount or 0)} for e in equity_items],
            "retained_earnings": retained_earnings,
            "total": total_equity_with_retained,
        },
        "total_liabilities_and_equity": total_liabilities + total_equity_with_retained,
        "balanced": abs(total_assets - (total_liabilities + total_equity_with_retained)) < 0.01,
    }


@router.get("/recent-invoices")
async def get_recent_invoices(
    limit: int = Query(5, ge=1, le=20),
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent invoices for dashboard."""
    query = (
        select(Invoice)
        .options(selectinload(Invoice.client))
        .where(Invoice.invoice_type == InvoiceType.SALES)
        .where(Invoice.status != InvoiceStatus.CANCELLED)
        .order_by(Invoice.invoice_date.desc(), Invoice.created_at.desc())
        .limit(limit)
    )

    if branch_id:
        query = query.where(Invoice.branch_id == branch_id)

    result = await db.execute(query)
    invoices = result.scalars().all()

    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_date": str(inv.invoice_date),
            "client_name": inv.client.name if inv.client else "N/A",
            "total_amount": float(inv.total_amount),
            "amount_due": float(inv.amount_due),
            "due_date": str(inv.due_date) if inv.due_date else None,
            "status": inv.status.value,
        }
        for inv in invoices
    ]


@router.get("/upcoming-payments")
async def get_upcoming_payments(
    limit: int = Query(5, ge=1, le=20),
    days_ahead: int = Query(30, ge=1, le=90),
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming payments due (purchase invoices with outstanding amount)."""
    today = datetime.now().date()
    future_date = today + timedelta(days=days_ahead)

    query = (
        select(Invoice)
        .options(selectinload(Invoice.vendor))
        .where(Invoice.invoice_type == InvoiceType.PURCHASE)
        .where(Invoice.amount_due > 0)
        .where(Invoice.status.not_in([InvoiceStatus.PAID, InvoiceStatus.CANCELLED]))
        .where(Invoice.due_date <= future_date)
        .order_by(Invoice.due_date.asc())
        .limit(limit)
    )

    if branch_id:
        query = query.where(Invoice.branch_id == branch_id)

    result = await db.execute(query)
    invoices = result.scalars().all()

    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_date": str(inv.invoice_date),
            "vendor_name": inv.vendor.name if inv.vendor else "N/A",
            "total_amount": float(inv.total_amount),
            "amount_due": float(inv.amount_due),
            "due_date": str(inv.due_date) if inv.due_date else None,
            "days_until_due": (inv.due_date - today).days if inv.due_date else None,
            "status": inv.status.value,
        }
        for inv in invoices
    ]


@router.get("/party-ledger/{party_type}/{party_id}")
async def get_party_ledger(
    party_type: str,
    party_id: int,
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get party ledger (customer/vendor statement) showing all transactions.

    Args:
        party_type: 'client' or 'vendor'
        party_id: ID of the client or vendor
        from_date: Start date for the statement
        to_date: End date for the statement

    Returns:
        Party details, opening balance, transactions with running balance, and closing balance.
    """
    from app.models.payment import PaymentMode

    # Validate party type
    if party_type not in ['client', 'vendor']:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="party_type must be 'client' or 'vendor'")

    # Fetch party details
    if party_type == 'client':
        party_result = await db.execute(select(Client).where(Client.id == party_id))
        party = party_result.scalar_one_or_none()
        if not party:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Client not found")
        party_info = {
            "id": party.id,
            "name": party.name,
            "gstin": party.gstin,
            "address": f"{party.address}, {party.city}, {party.state} - {party.pincode}",
            "email": party.email,
            "phone": party.phone,
        }
        invoice_type = InvoiceType.SALES
        payment_type = PaymentType.RECEIPT
    else:
        party_result = await db.execute(select(Vendor).where(Vendor.id == party_id))
        party = party_result.scalar_one_or_none()
        if not party:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Vendor not found")
        party_info = {
            "id": party.id,
            "name": party.name,
            "gstin": party.gstin,
            "address": f"{party.address}, {party.city}, {party.state} - {party.pincode}",
            "email": party.email,
            "phone": party.phone,
        }
        invoice_type = InvoiceType.PURCHASE
        payment_type = PaymentType.PAYMENT

    # Calculate opening balance (sum of all transactions before from_date)
    # For clients: Opening = (Invoices total - Payments received) before from_date
    # For vendors: Opening = (Invoices total - Payments made) before from_date

    # Get invoices before from_date
    if party_type == 'client':
        opening_invoices_result = await db.execute(
            select(func.sum(Invoice.total_amount))
            .where(Invoice.client_id == party_id)
            .where(Invoice.invoice_type.in_([InvoiceType.SALES, InvoiceType.DEBIT_NOTE]))
            .where(Invoice.invoice_date < from_date)
            .where(Invoice.status != InvoiceStatus.CANCELLED)
        )
        opening_credit_notes_result = await db.execute(
            select(func.sum(Invoice.total_amount))
            .where(Invoice.client_id == party_id)
            .where(Invoice.invoice_type == InvoiceType.CREDIT_NOTE)
            .where(Invoice.invoice_date < from_date)
            .where(Invoice.status != InvoiceStatus.CANCELLED)
        )
        opening_payments_result = await db.execute(
            select(func.sum(Payment.net_amount))
            .where(Payment.client_id == party_id)
            .where(Payment.payment_type == PaymentType.RECEIPT)
            .where(Payment.payment_date < from_date)
        )
    else:
        opening_invoices_result = await db.execute(
            select(func.sum(Invoice.total_amount))
            .where(Invoice.vendor_id == party_id)
            .where(Invoice.invoice_type.in_([InvoiceType.PURCHASE, InvoiceType.CREDIT_NOTE]))
            .where(Invoice.invoice_date < from_date)
            .where(Invoice.status != InvoiceStatus.CANCELLED)
        )
        opening_credit_notes_result = await db.execute(
            select(func.sum(Invoice.total_amount))
            .where(Invoice.vendor_id == party_id)
            .where(Invoice.invoice_type == InvoiceType.DEBIT_NOTE)
            .where(Invoice.invoice_date < from_date)
            .where(Invoice.status != InvoiceStatus.CANCELLED)
        )
        opening_payments_result = await db.execute(
            select(func.sum(Payment.net_amount))
            .where(Payment.vendor_id == party_id)
            .where(Payment.payment_type == PaymentType.PAYMENT)
            .where(Payment.payment_date < from_date)
        )

    opening_invoices = float(opening_invoices_result.scalar() or 0)
    opening_credit_notes = float(opening_credit_notes_result.scalar() or 0)
    opening_payments = float(opening_payments_result.scalar() or 0)
    opening_balance = opening_invoices - opening_credit_notes - opening_payments

    # Get all transactions within the period
    transactions = []

    # Get invoices in period
    if party_type == 'client':
        invoices_result = await db.execute(
            select(Invoice)
            .where(Invoice.client_id == party_id)
            .where(Invoice.invoice_date >= from_date)
            .where(Invoice.invoice_date <= to_date)
            .where(Invoice.status != InvoiceStatus.CANCELLED)
            .order_by(Invoice.invoice_date, Invoice.id)
        )
    else:
        invoices_result = await db.execute(
            select(Invoice)
            .where(Invoice.vendor_id == party_id)
            .where(Invoice.invoice_date >= from_date)
            .where(Invoice.invoice_date <= to_date)
            .where(Invoice.status != InvoiceStatus.CANCELLED)
            .order_by(Invoice.invoice_date, Invoice.id)
        )

    invoices = invoices_result.scalars().all()

    for inv in invoices:
        # Determine debit/credit based on invoice type and party type
        if party_type == 'client':
            # For client: Sales/Debit Note = Debit (they owe us), Credit Note = Credit (we owe them)
            if inv.invoice_type in [InvoiceType.SALES, InvoiceType.DEBIT_NOTE]:
                debit = float(inv.total_amount)
                credit = 0
                inv_type = "INVOICE" if inv.invoice_type == InvoiceType.SALES else "DEBIT_NOTE"
                description = f"Sales Invoice" if inv.invoice_type == InvoiceType.SALES else "Debit Note"
            else:
                debit = 0
                credit = float(inv.total_amount)
                inv_type = "CREDIT_NOTE"
                description = "Credit Note"
        else:
            # For vendor: Purchase/Credit Note = Credit (we owe them), Debit Note = Debit (they owe us)
            if inv.invoice_type in [InvoiceType.PURCHASE, InvoiceType.CREDIT_NOTE]:
                debit = 0
                credit = float(inv.total_amount)
                inv_type = "INVOICE" if inv.invoice_type == InvoiceType.PURCHASE else "CREDIT_NOTE"
                description = f"Purchase Invoice" if inv.invoice_type == InvoiceType.PURCHASE else "Credit Note"
            else:
                debit = float(inv.total_amount)
                credit = 0
                inv_type = "DEBIT_NOTE"
                description = "Debit Note"

        transactions.append({
            "date": str(inv.invoice_date),
            "voucher_number": inv.invoice_number,
            "type": inv_type,
            "description": description,
            "debit": debit,
            "credit": credit,
            "reference_id": inv.id,
            "sort_key": (inv.invoice_date, 0, inv.id),  # For sorting: invoices before payments on same day
        })

    # Get payments in period
    if party_type == 'client':
        payments_result = await db.execute(
            select(Payment)
            .where(Payment.client_id == party_id)
            .where(Payment.payment_type == PaymentType.RECEIPT)
            .where(Payment.payment_date >= from_date)
            .where(Payment.payment_date <= to_date)
        )
    else:
        payments_result = await db.execute(
            select(Payment)
            .where(Payment.vendor_id == party_id)
            .where(Payment.payment_type == PaymentType.PAYMENT)
            .where(Payment.payment_date >= from_date)
            .where(Payment.payment_date <= to_date)
        )

    payments = payments_result.scalars().all()

    for pmt in payments:
        # For client: Payment received = Credit (they paid us)
        # For vendor: Payment made = Debit (we paid them)
        if party_type == 'client':
            debit = 0
            credit = float(pmt.net_amount)
        else:
            debit = float(pmt.net_amount)
            credit = 0

        # Get payment mode description
        mode_str = pmt.payment_mode.value if pmt.payment_mode else "N/A"
        description = f"Payment via {mode_str}"
        if pmt.reference_number:
            description += f" (Ref: {pmt.reference_number})"

        transactions.append({
            "date": str(pmt.payment_date),
            "voucher_number": pmt.payment_number,
            "type": "PAYMENT",
            "description": description,
            "debit": debit,
            "credit": credit,
            "reference_id": pmt.id,
            "sort_key": (pmt.payment_date, 1, pmt.id),  # Payments after invoices on same day
        })

    # Sort transactions by date, then type (invoices before payments), then id
    transactions.sort(key=lambda x: x["sort_key"])

    # Calculate running balance
    running_balance = opening_balance
    total_debit = 0
    total_credit = 0

    for txn in transactions:
        running_balance = running_balance + txn["debit"] - txn["credit"]
        txn["balance"] = round(running_balance, 2)
        total_debit += txn["debit"]
        total_credit += txn["credit"]
        # Remove the sort_key from output
        del txn["sort_key"]

    closing_balance = opening_balance + total_debit - total_credit

    return {
        "party": party_info,
        "party_type": party_type,
        "period": {"from": str(from_date), "to": str(to_date)},
        "opening_balance": round(opening_balance, 2),
        "transactions": transactions,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "closing_balance": round(closing_balance, 2),
    }


@router.get("/party-ledger/{party_type}/{party_id}/pdf")
async def get_party_ledger_pdf(
    party_type: str,
    party_id: int,
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate PDF for party ledger (customer/vendor statement).
    """
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    # Get ledger data using the same logic
    ledger_data = await get_party_ledger(party_type, party_id, from_date, to_date, db, current_user)

    # Get company settings
    settings_result = await db.execute(select(CompanySettings).where(CompanySettings.is_active == True))
    company = settings_result.scalar_one_or_none()

    # Create PDF buffer
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)

    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=6,
        alignment=1,  # Center
    )
    header_style = ParagraphStyle(
        'CustomHeader',
        parent=styles['Normal'],
        fontSize=10,
        alignment=1,  # Center
    )
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=9,
    )
    bold_style = ParagraphStyle(
        'CustomBold',
        parent=styles['Normal'],
        fontSize=9,
        fontName='Helvetica-Bold',
    )

    elements = []

    # Company Header
    if company:
        elements.append(Paragraph(company.company_name, title_style))
        elements.append(Paragraph(f"{company.address}, {company.city}, {company.state} - {company.pincode}", header_style))
        if company.gstin:
            elements.append(Paragraph(f"GSTIN: {company.gstin} | PAN: {company.pan}", header_style))
        elements.append(Spacer(1, 10*mm))

    # Report Title
    party_label = "Customer" if party_type == "client" else "Vendor"
    elements.append(Paragraph(f"<b>{party_label} Ledger Statement</b>", title_style))
    elements.append(Spacer(1, 5*mm))

    # Party Details
    party = ledger_data["party"]
    party_info_data = [
        ["Party Name:", party["name"], "Period:", f"{from_date.strftime('%d-%b-%Y')} to {to_date.strftime('%d-%b-%Y')}"],
        ["GSTIN:", party.get("gstin") or "N/A", "Phone:", party.get("phone") or "N/A"],
        ["Address:", party.get("address") or "N/A", "Email:", party.get("email") or "N/A"],
    ]
    party_table = Table(party_info_data, colWidths=[60, 170, 50, 140])
    party_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(party_table)
    elements.append(Spacer(1, 8*mm))

    # Opening Balance
    opening_bal = ledger_data["opening_balance"]
    opening_text = f"Opening Balance (as on {from_date.strftime('%d-%b-%Y')}): "
    if opening_bal >= 0:
        opening_text += f"Rs. {abs(opening_bal):,.2f} Dr" if opening_bal > 0 else "Rs. 0.00"
    else:
        opening_text += f"Rs. {abs(opening_bal):,.2f} Cr"
    elements.append(Paragraph(f"<b>{opening_text}</b>", normal_style))
    elements.append(Spacer(1, 3*mm))

    # Transaction Table
    table_data = [["Date", "Voucher No.", "Type", "Description", "Debit (Rs.)", "Credit (Rs.)", "Balance (Rs.)"]]

    for txn in ledger_data["transactions"]:
        balance = txn["balance"]
        balance_str = f"{abs(balance):,.2f} {'Dr' if balance >= 0 else 'Cr'}"
        table_data.append([
            txn["date"],
            txn["voucher_number"],
            txn["type"],
            txn["description"][:30],  # Truncate long descriptions
            f"{txn['debit']:,.2f}" if txn['debit'] > 0 else "",
            f"{txn['credit']:,.2f}" if txn['credit'] > 0 else "",
            balance_str,
        ])

    # Add totals row
    closing = ledger_data["closing_balance"]
    closing_str = f"{abs(closing):,.2f} {'Dr' if closing >= 0 else 'Cr'}"
    table_data.append([
        "", "", "", "Total:",
        f"{ledger_data['total_debit']:,.2f}",
        f"{ledger_data['total_credit']:,.2f}",
        closing_str,
    ])

    col_widths = [55, 70, 55, 100, 65, 65, 70]
    txn_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    txn_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        # Data rows
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (4, 1), (-1, -1), 'RIGHT'),  # Right align numbers
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Center date
        # Totals row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#D9E2F3')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        # Grid
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        # Alternate row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#F2F2F2')]),
    ]))
    elements.append(txn_table)
    elements.append(Spacer(1, 8*mm))

    # Closing Balance Summary
    closing_bal = ledger_data["closing_balance"]
    closing_text = f"Closing Balance (as on {to_date.strftime('%d-%b-%Y')}): "
    if closing_bal >= 0:
        closing_text += f"Rs. {abs(closing_bal):,.2f} Dr" if closing_bal > 0 else "Rs. 0.00"
    else:
        closing_text += f"Rs. {abs(closing_bal):,.2f} Cr"
    elements.append(Paragraph(f"<b>{closing_text}</b>", normal_style))
    elements.append(Spacer(1, 15*mm))

    # Footer
    elements.append(Paragraph(f"Generated on: {datetime.now().strftime('%d-%b-%Y %H:%M')}", normal_style))
    elements.append(Paragraph("This is a computer-generated statement and does not require a signature.", normal_style))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)

    # Generate filename
    party_name_safe = party["name"].replace(" ", "_").replace("/", "_")[:30]
    filename = f"Ledger_{party_name_safe}_{from_date}_{to_date}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
