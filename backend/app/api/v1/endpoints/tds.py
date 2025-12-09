from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from decimal import Decimal
import io
import logging

from app.db.session import get_db
from app.models.user import User
from app.models.invoice import Invoice, InvoiceType
from app.models.client import Client
from app.models.vendor import Vendor
from app.models.tds_challan import TDSChallan, TDSChallanEntry, TDSType
from app.models.tds_return import TDSReturn, ReturnStatus
from app.core.security import get_current_user
from app.core.config import settings
from app.schemas.tds import (
    TDSChallanCreate,
    TDSChallanUpdate,
    TDSChallanResponse,
    TDSChallanListResponse,
    TDSReturnCreate,
    TDSReturnUpdate,
    TDSReturnResponse,
    TDSSheetResponse,
    PendingTDSTransaction,
    PendingTDSResponse,
    MonthData,
    QuarterData,
    TDSReturnExportEntry,
    TDSReturnExportResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def get_quarter_for_month(month: int) -> int:
    """Get quarter number (1-4) for a given month (1-12, April=4)."""
    if month >= 4 and month <= 6:
        return 1  # Q1: April-June
    elif month >= 7 and month <= 9:
        return 2  # Q2: July-September
    elif month >= 10 and month <= 12:
        return 3  # Q3: October-December
    else:  # 1, 2, 3 (Jan, Feb, Mar)
        return 4  # Q4: January-March


def get_fy_dates(financial_year: str, month: int) -> tuple:
    """Get start and end dates for a month within a financial year."""
    # FY format: "2024-2025"
    start_year, end_year = financial_year.split("-")
    start_year = int(start_year)
    end_year = int(end_year)

    # Months 4-12 are in start_year, months 1-3 are in end_year
    if month >= 4:
        year = start_year
    else:
        year = end_year

    # Get first and last day of month
    import calendar
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    return first_day, last_day


def get_fy_start_end(financial_year: str) -> tuple:
    """Get start and end dates for a financial year."""
    start_year, end_year = financial_year.split("-")
    start_year = int(start_year)
    end_year = int(end_year)

    fy_start = date(start_year, 4, 1)  # April 1
    fy_end = date(end_year, 3, 31)  # March 31

    return fy_start, fy_end


@router.get("/sheet")
async def get_tds_sheet(
    financial_year: str,
    tds_type: TDSType,
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get TDS sheet data for a financial year."""
    try:
        fy_start, fy_end = get_fy_start_end(financial_year)

        # Initialize month data (April=4 to March=3)
        month_data = {}
        for m in [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]:
            month_data[m] = {
                "tds_payable": Decimal("0"),
                "tds_paid": Decimal("0"),
                "penalty": Decimal("0"),
                "interest": Decimal("0"),
                "challan_count": 0,
                "has_challan_files": False,
                "tds_deducted": Decimal("0"),
                "has_pending": False,
            }

        # Get all challans for the FY
        challan_query = (
            select(TDSChallan)
            .options(selectinload(TDSChallan.entries))
            .where(TDSChallan.financial_year == financial_year)
            .where(TDSChallan.tds_type == tds_type)
        )
        if branch_id:
            challan_query = challan_query.where(TDSChallan.branch_id == branch_id)

        result = await db.execute(challan_query)
        challans = result.scalars().all()

        for challan in challans:
            m = challan.month
            if m in month_data:
                month_data[m]["tds_payable"] += challan.tds_amount
                month_data[m]["tds_paid"] += challan.total_amount
                month_data[m]["penalty"] += challan.penalty
                month_data[m]["interest"] += challan.interest
                month_data[m]["challan_count"] += 1
                if challan.challan_filename:
                    month_data[m]["has_challan_files"] = True

        # Get TDS deducted from invoices (not yet linked to challan)
        invoice_type = InvoiceType.PURCHASE if tds_type == TDSType.PAYABLE else InvoiceType.SALES

        for m in [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]:
            first_day, last_day = get_fy_dates(financial_year, m)

            # Total TDS from invoices in this month
            tds_query = (
                select(func.sum(Invoice.tds_amount))
                .where(Invoice.invoice_type == invoice_type)
                .where(Invoice.tds_applicable == True)
                .where(Invoice.invoice_date >= first_day)
                .where(Invoice.invoice_date <= last_day)
            )
            if branch_id:
                tds_query = tds_query.where(Invoice.branch_id == branch_id)

            result = await db.execute(tds_query)
            total_tds = result.scalar() or Decimal("0")
            month_data[m]["tds_deducted"] = total_tds

            # Check for pending invoices (TDS applicable but not linked to challan)
            pending_query = (
                select(func.count())
                .where(Invoice.invoice_type == invoice_type)
                .where(Invoice.tds_applicable == True)
                .where(Invoice.tds_challan_id.is_(None))
                .where(Invoice.invoice_date >= first_day)
                .where(Invoice.invoice_date <= last_day)
            )
            if branch_id:
                pending_query = pending_query.where(Invoice.branch_id == branch_id)

            result = await db.execute(pending_query)
            pending_count = result.scalar() or 0
            month_data[m]["has_pending"] = pending_count > 0

        # Get quarterly return data
        quarter_data = {}
        for q in [1, 2, 3, 4]:
            return_query = (
                select(TDSReturn)
                .where(TDSReturn.financial_year == financial_year)
                .where(TDSReturn.quarter == q)
                .where(TDSReturn.tds_type == tds_type)
            )
            if branch_id:
                return_query = return_query.where(TDSReturn.branch_id == branch_id)

            result = await db.execute(return_query)
            tds_return = result.scalar_one_or_none()

            quarter_data[q] = {
                "quarter": q,
                "return_status": tds_return.status if tds_return else None,
                "has_return_file": bool(tds_return and tds_return.return_filename),
                "return_id": tds_return.id if tds_return else None,
            }

        # Calculate totals
        totals = {
            "tds_payable": sum(month_data[m]["tds_payable"] for m in month_data),
            "tds_paid": sum(month_data[m]["tds_paid"] for m in month_data),
            "penalty": sum(month_data[m]["penalty"] for m in month_data),
            "interest": sum(month_data[m]["interest"] for m in month_data),
            "tds_deducted": sum(month_data[m]["tds_deducted"] for m in month_data),
        }

        return {
            "financial_year": financial_year,
            "tds_type": tds_type,
            "branch_id": branch_id,
            "month_data": month_data,
            "quarter_data": quarter_data,
            "totals": totals,
        }
    except Exception as e:
        logger.error(f"Error getting TDS sheet: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/pending/{financial_year}/{month}")
async def get_pending_tds(
    financial_year: str,
    month: int,
    tds_type: TDSType,
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get pending TDS transactions for a month (not yet linked to challan)."""
    try:
        first_day, last_day = get_fy_dates(financial_year, month)
        invoice_type = InvoiceType.PURCHASE if tds_type == TDSType.PAYABLE else InvoiceType.SALES

        query = (
            select(Invoice)
            .options(
                selectinload(Invoice.vendor),
                selectinload(Invoice.client),
            )
            .where(Invoice.invoice_type == invoice_type)
            .where(Invoice.tds_applicable == True)
            .where(Invoice.tds_challan_id.is_(None))
            .where(Invoice.invoice_date >= first_day)
            .where(Invoice.invoice_date <= last_day)
        )
        if branch_id:
            query = query.where(Invoice.branch_id == branch_id)

        result = await db.execute(query)
        invoices = result.scalars().all()

        transactions = []
        total_tds = Decimal("0")

        for inv in invoices:
            # Get party name and PAN
            if tds_type == TDSType.PAYABLE:
                party_name = inv.vendor.name if inv.vendor else "Unknown"
                party_pan = inv.vendor.pan if inv.vendor else None
            else:
                party_name = inv.client.name if inv.client else "Unknown"
                party_pan = inv.client.pan if inv.client else None

            transactions.append({
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.invoice_date,
                "party_name": party_name,
                "party_pan": party_pan,
                "base_amount": inv.taxable_amount,
                "tds_rate": inv.tds_rate,
                "tds_section": inv.tds_section or "194C",
                "tds_amount": inv.tds_amount,
            })
            total_tds += inv.tds_amount

        return {
            "transactions": transactions,
            "total_tds": total_tds,
            "count": len(transactions),
        }
    except Exception as e:
        logger.error(f"Error getting pending TDS: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/challan", status_code=status.HTTP_201_CREATED)
async def create_challan(
    challan_data: TDSChallanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new TDS challan with selected invoices."""
    try:
        # Calculate TDS amount from entries
        tds_amount = sum(entry.tds_amount for entry in challan_data.entries)
        penalty = challan_data.penalty
        interest = challan_data.interest
        total_amount = tds_amount + penalty + interest

        # Create challan
        challan = TDSChallan(
            challan_number=challan_data.challan_number,
            bsr_code=challan_data.bsr_code,
            financial_year=challan_data.financial_year,
            month=challan_data.month,
            quarter=get_quarter_for_month(challan_data.month),
            tds_type=challan_data.tds_type,
            tds_amount=tds_amount,
            penalty=penalty,
            interest=interest,
            total_amount=total_amount,
            payment_date=challan_data.payment_date,
            transaction_id=challan_data.transaction_id,
            branch_id=challan_data.branch_id,
            notes=challan_data.notes,
        )
        db.add(challan)
        await db.flush()

        # Create entries and update invoices
        for entry_data in challan_data.entries:
            entry = TDSChallanEntry(
                challan_id=challan.id,
                invoice_id=entry_data.invoice_id,
                party_name=entry_data.party_name,
                party_pan=entry_data.party_pan,
                invoice_number=entry_data.invoice_number,
                invoice_date=entry_data.invoice_date,
                base_amount=entry_data.base_amount,
                tds_rate=entry_data.tds_rate,
                tds_section=entry_data.tds_section,
                tds_amount=entry_data.tds_amount,
                penalty=entry_data.penalty,
                interest=entry_data.interest,
            )
            db.add(entry)

            # Update invoice to link to challan
            result = await db.execute(
                select(Invoice).where(Invoice.id == entry_data.invoice_id)
            )
            invoice = result.scalar_one_or_none()
            if invoice:
                invoice.tds_challan_id = challan.id

        await db.commit()
        await db.refresh(challan)

        # Load entries for response
        result = await db.execute(
            select(TDSChallan)
            .options(selectinload(TDSChallan.entries))
            .where(TDSChallan.id == challan.id)
        )
        challan = result.scalar_one()

        return challan
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating challan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/challan/{challan_id}")
async def get_challan(
    challan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get challan details with entries."""
    result = await db.execute(
        select(TDSChallan)
        .options(selectinload(TDSChallan.entries))
        .where(TDSChallan.id == challan_id)
    )
    challan = result.scalar_one_or_none()

    if not challan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challan not found"
        )

    return challan


@router.put("/challan/{challan_id}")
async def update_challan(
    challan_id: int,
    challan_data: TDSChallanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update challan (add penalty, interest, etc.)."""
    result = await db.execute(
        select(TDSChallan).where(TDSChallan.id == challan_id)
    )
    challan = result.scalar_one_or_none()

    if not challan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challan not found"
        )

    # Update fields
    if challan_data.challan_number is not None:
        challan.challan_number = challan_data.challan_number
    if challan_data.bsr_code is not None:
        challan.bsr_code = challan_data.bsr_code
    if challan_data.payment_date is not None:
        challan.payment_date = challan_data.payment_date
    if challan_data.transaction_id is not None:
        challan.transaction_id = challan_data.transaction_id
    if challan_data.penalty is not None:
        challan.penalty = challan_data.penalty
    if challan_data.interest is not None:
        challan.interest = challan_data.interest
    if challan_data.notes is not None:
        challan.notes = challan_data.notes

    # Recalculate total
    challan.total_amount = challan.tds_amount + challan.penalty + challan.interest

    await db.commit()
    await db.refresh(challan)

    return challan


@router.post("/challan/{challan_id}/upload")
async def upload_challan_file(
    challan_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload challan PDF."""
    result = await db.execute(
        select(TDSChallan).where(TDSChallan.id == challan_id)
    )
    challan = result.scalar_one_or_none()

    if not challan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challan not found"
        )

    # Validate file type
    if not file.content_type in ["application/pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    # Read file content
    content = await file.read()

    # Save file
    import os
    from pathlib import Path

    upload_dir = Path(settings.UPLOAD_DIR) / "tds_challans"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"challan_{challan_id}_{timestamp}.pdf"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Update challan
    challan.challan_file_path = str(file_path)
    challan.challan_filename = file.filename

    await db.commit()

    return {"message": "Challan uploaded successfully", "filename": file.filename}


@router.get("/challan/{challan_id}/download")
async def download_challan_file(
    challan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download challan PDF."""
    result = await db.execute(
        select(TDSChallan).where(TDSChallan.id == challan_id)
    )
    challan = result.scalar_one_or_none()

    if not challan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challan not found"
        )

    if not challan.challan_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No file uploaded for this challan"
        )

    from pathlib import Path
    file_path = Path(challan.challan_file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )

    return FileResponse(
        path=str(file_path),
        filename=challan.challan_filename or f"challan_{challan_id}.pdf",
        media_type="application/pdf"
    )


@router.get("/challans")
async def list_challans(
    financial_year: str,
    tds_type: TDSType,
    month: Optional[int] = None,
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all challans with filters."""
    query = (
        select(TDSChallan)
        .where(TDSChallan.financial_year == financial_year)
        .where(TDSChallan.tds_type == tds_type)
        .order_by(TDSChallan.payment_date.desc())
    )

    if month:
        query = query.where(TDSChallan.month == month)
    if branch_id:
        query = query.where(TDSChallan.branch_id == branch_id)

    result = await db.execute(query)
    challans = result.scalars().all()

    return challans


# TDS Return endpoints

@router.get("/return/{financial_year}/{quarter}")
async def get_tds_return(
    financial_year: str,
    quarter: int,
    tds_type: TDSType,
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get or create TDS return for a quarter."""
    query = (
        select(TDSReturn)
        .where(TDSReturn.financial_year == financial_year)
        .where(TDSReturn.quarter == quarter)
        .where(TDSReturn.tds_type == tds_type)
    )
    if branch_id:
        query = query.where(TDSReturn.branch_id == branch_id)

    result = await db.execute(query)
    tds_return = result.scalar_one_or_none()

    if not tds_return:
        # Create a draft return
        tds_return = TDSReturn(
            financial_year=financial_year,
            quarter=quarter,
            tds_type=tds_type,
            branch_id=branch_id,
            status=ReturnStatus.DRAFT,
        )
        db.add(tds_return)
        await db.commit()
        await db.refresh(tds_return)

    return tds_return


@router.put("/return/{return_id}")
async def update_tds_return(
    return_id: int,
    return_data: TDSReturnUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update TDS return (mark as filed, etc.)."""
    result = await db.execute(
        select(TDSReturn).where(TDSReturn.id == return_id)
    )
    tds_return = result.scalar_one_or_none()

    if not tds_return:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Return not found"
        )

    if return_data.status is not None:
        tds_return.status = return_data.status
    if return_data.filed_date is not None:
        tds_return.filed_date = return_data.filed_date
    if return_data.acknowledgment_number is not None:
        tds_return.acknowledgment_number = return_data.acknowledgment_number

    await db.commit()
    await db.refresh(tds_return)

    return tds_return


@router.post("/return/{return_id}/upload")
async def upload_return_file(
    return_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload filed return document."""
    result = await db.execute(
        select(TDSReturn).where(TDSReturn.id == return_id)
    )
    tds_return = result.scalar_one_or_none()

    if not tds_return:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Return not found"
        )

    # Read file content
    content = await file.read()

    # Save file
    import os
    from pathlib import Path

    upload_dir = Path(settings.UPLOAD_DIR) / "tds_returns"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    ext = file.filename.split(".")[-1] if "." in file.filename else "xlsx"
    filename = f"return_{return_id}_{timestamp}.{ext}"
    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        f.write(content)

    # Update return
    tds_return.return_file_path = str(file_path)
    tds_return.return_filename = file.filename

    await db.commit()

    return {"message": "Return file uploaded successfully", "filename": file.filename}


@router.get("/return/{return_id}/download")
async def download_return_file(
    return_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download return file."""
    result = await db.execute(
        select(TDSReturn).where(TDSReturn.id == return_id)
    )
    tds_return = result.scalar_one_or_none()

    if not tds_return:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Return not found"
        )

    if not tds_return.return_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No file uploaded for this return"
        )

    from pathlib import Path
    file_path = Path(tds_return.return_file_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server"
        )

    return FileResponse(
        path=str(file_path),
        filename=tds_return.return_filename or f"return_{return_id}.xlsx",
    )


@router.get("/return/{financial_year}/{quarter}/export")
async def export_tds_return(
    financial_year: str,
    quarter: int,
    tds_type: TDSType,
    branch_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export quarterly TDS return data as Excel."""
    try:
        # Get quarter months
        quarter_months = {
            1: [4, 5, 6],
            2: [7, 8, 9],
            3: [10, 11, 12],
            4: [1, 2, 3],
        }
        months = quarter_months.get(quarter, [])

        # Get all challans for the quarter
        query = (
            select(TDSChallan)
            .options(selectinload(TDSChallan.entries))
            .where(TDSChallan.financial_year == financial_year)
            .where(TDSChallan.tds_type == tds_type)
            .where(TDSChallan.month.in_(months))
        )
        if branch_id:
            query = query.where(TDSChallan.branch_id == branch_id)

        result = await db.execute(query)
        challans = result.scalars().all()

        entries = []
        total_tds = Decimal("0")
        total_penalty = Decimal("0")
        total_interest = Decimal("0")
        total_payable = Decimal("0")

        for challan in challans:
            for entry in challan.entries:
                tds_payable = entry.tds_amount + entry.penalty + entry.interest
                entries.append({
                    "vendor_name": entry.party_name,
                    "pan": entry.party_pan,
                    "base_amount": entry.base_amount,
                    "tds": entry.tds_amount,
                    "penalty": entry.penalty,
                    "interest": entry.interest,
                    "tds_payable": tds_payable,
                    "payment_date": challan.payment_date,
                    "challan_no": challan.challan_number,
                    "bsr_code": challan.bsr_code,
                    "payment": challan.total_amount,
                    "invoice_date": entry.invoice_date,
                    "invoice_number": entry.invoice_number,
                    "section_name": entry.tds_section,
                    "tds_percent": entry.tds_rate,
                })
                total_tds += entry.tds_amount
                total_penalty += entry.penalty
                total_interest += entry.interest
                total_payable += tds_payable

        return {
            "financial_year": financial_year,
            "quarter": quarter,
            "tds_type": tds_type,
            "entries": entries,
            "total_tds": total_tds,
            "total_penalty": total_penalty,
            "total_interest": total_interest,
            "total_payable": total_payable,
        }
    except Exception as e:
        logger.error(f"Error exporting TDS return: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
