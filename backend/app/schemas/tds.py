from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal

from app.models.tds_challan import TDSType
from app.models.tds_return import ReturnStatus


# TDS Challan Entry Schemas
class TDSChallanEntryBase(BaseModel):
    invoice_id: int
    party_name: str
    party_pan: Optional[str] = None
    invoice_number: str
    invoice_date: date
    base_amount: Decimal
    tds_rate: Decimal
    tds_section: str
    tds_amount: Decimal
    penalty: Decimal = Decimal("0")
    interest: Decimal = Decimal("0")


class TDSChallanEntryCreate(TDSChallanEntryBase):
    pass


class TDSChallanEntryResponse(TDSChallanEntryBase):
    id: int
    challan_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# TDS Challan Schemas
class TDSChallanBase(BaseModel):
    challan_number: str
    bsr_code: str
    financial_year: str
    month: int
    quarter: int
    tds_type: TDSType
    payment_date: date
    transaction_id: Optional[str] = None
    branch_id: Optional[int] = None
    notes: Optional[str] = None


class TDSChallanCreate(TDSChallanBase):
    entries: List[TDSChallanEntryCreate]
    penalty: Decimal = Decimal("0")
    interest: Decimal = Decimal("0")


class TDSChallanUpdate(BaseModel):
    challan_number: Optional[str] = None
    bsr_code: Optional[str] = None
    payment_date: Optional[date] = None
    transaction_id: Optional[str] = None
    penalty: Optional[Decimal] = None
    interest: Optional[Decimal] = None
    notes: Optional[str] = None


class TDSChallanResponse(TDSChallanBase):
    id: int
    tds_amount: Decimal
    penalty: Decimal
    interest: Decimal
    total_amount: Decimal
    challan_file_path: Optional[str] = None
    challan_filename: Optional[str] = None
    entries: List[TDSChallanEntryResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TDSChallanListResponse(BaseModel):
    id: int
    challan_number: str
    bsr_code: str
    financial_year: str
    month: int
    quarter: int
    tds_type: TDSType
    tds_amount: Decimal
    penalty: Decimal
    interest: Decimal
    total_amount: Decimal
    payment_date: date
    challan_filename: Optional[str] = None
    branch_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# TDS Return Schemas
class TDSReturnBase(BaseModel):
    financial_year: str
    quarter: int
    tds_type: TDSType
    branch_id: Optional[int] = None


class TDSReturnCreate(TDSReturnBase):
    pass


class TDSReturnUpdate(BaseModel):
    status: Optional[ReturnStatus] = None
    filed_date: Optional[date] = None
    acknowledgment_number: Optional[str] = None


class TDSReturnResponse(TDSReturnBase):
    id: int
    return_file_path: Optional[str] = None
    return_filename: Optional[str] = None
    status: ReturnStatus
    filed_date: Optional[date] = None
    acknowledgment_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# TDS Sheet Data Schemas (for the main TDS sheet view)
class MonthData(BaseModel):
    tds_payable: Optional[Decimal] = None  # Sum of TDS from challans
    tds_paid: Optional[Decimal] = None  # Sum of total_amount from challans
    penalty: Optional[Decimal] = None
    interest: Optional[Decimal] = None
    challan_count: int = 0
    has_challan_files: bool = False
    tds_deducted: Optional[Decimal] = None  # Sum of TDS from invoices
    has_pending: bool = False  # Whether there are unpaid invoices with TDS


class QuarterData(BaseModel):
    quarter: int
    return_status: Optional[ReturnStatus] = None
    has_return_file: bool = False
    return_id: Optional[int] = None


class TDSSheetRow(BaseModel):
    row_type: str  # TDS_Payable, TDS_Paid, Penalty, Interest, Challan, TDS_Return, TDS_Deducted
    months: dict  # Month number (4-12, 1-3) -> value or status
    total: Optional[Decimal] = None


class TDSSheetResponse(BaseModel):
    financial_year: str
    tds_type: TDSType
    branch_id: Optional[int] = None
    month_data: dict  # Month number -> MonthData
    quarter_data: dict  # Quarter number -> QuarterData
    totals: dict  # Row type -> total value


# Pending TDS Transaction (for generate modal)
class PendingTDSTransaction(BaseModel):
    invoice_id: int
    invoice_number: str
    invoice_date: date
    party_name: str
    party_pan: Optional[str] = None
    base_amount: Decimal  # Taxable amount
    tds_rate: Decimal
    tds_section: str
    tds_amount: Decimal

    class Config:
        from_attributes = True


class PendingTDSResponse(BaseModel):
    transactions: List[PendingTDSTransaction]
    total_tds: Decimal
    count: int


# TDS Return Export Data
class TDSReturnExportEntry(BaseModel):
    vendor_name: str
    pan: Optional[str]
    base_amount: Decimal
    tds: Decimal
    penalty: Decimal
    interest: Decimal
    tds_payable: Decimal
    payment_date: Optional[date]
    challan_no: Optional[str]
    bsr_code: Optional[str]
    payment: Optional[Decimal]
    invoice_date: date
    invoice_number: str
    section_name: str
    tds_percent: Decimal


class TDSReturnExportResponse(BaseModel):
    financial_year: str
    quarter: int
    tds_type: TDSType
    entries: List[TDSReturnExportEntry]
    total_tds: Decimal
    total_penalty: Decimal
    total_interest: Decimal
    total_payable: Decimal
