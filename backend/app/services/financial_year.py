"""
Financial Year Utility Functions

Provides utilities for financial year calculations based on configurable FY start month.
Default financial year starts in April (month 4).
"""

from datetime import date, datetime
from typing import Tuple, List
import calendar


def get_financial_year(date_obj: date, fy_start_month: int = 4) -> str:
    """
    Get financial year string (e.g., '2024-25') for a given date.

    Args:
        date_obj: The date to get the financial year for
        fy_start_month: Month when financial year starts (1-12), default is 4 (April)

    Returns:
        Financial year string in format 'YYYY-YY'

    Example:
        >>> get_financial_year(date(2024, 5, 15), 4)  # May 2024
        '2024-25'
        >>> get_financial_year(date(2024, 3, 15), 4)  # March 2024
        '2023-24'
    """
    year = date_obj.year
    month = date_obj.month

    if month >= fy_start_month:
        # Current month is on or after FY start month
        return f"{year}-{str(year + 1)[-2:]}"
    else:
        # Current month is before FY start month, so it's part of previous year's FY
        return f"{year - 1}-{str(year)[-2:]}"


def get_financial_year_dates(fy_string: str, fy_start_month: int = 4) -> Tuple[date, date]:
    """
    Get start and end dates for a financial year string.

    Args:
        fy_string: Financial year string (e.g., '2024-25')
        fy_start_month: Month when financial year starts (1-12), default is 4 (April)

    Returns:
        Tuple of (start_date, end_date) for the financial year

    Example:
        >>> get_financial_year_dates('2024-25', 4)
        (date(2024, 4, 1), date(2025, 3, 31))
    """
    # Parse the FY string
    start_year = int(fy_string.split('-')[0])
    end_year = start_year + 1

    # FY starts on the 1st of the start month
    start_date = date(start_year, fy_start_month, 1)

    # FY ends on the last day of the month before the start month in the next year
    if fy_start_month == 1:
        # If FY starts in January, it ends in December
        end_month = 12
        end_year_for_end_date = start_year
    else:
        # FY ends in the month before the start month of next year
        end_month = fy_start_month - 1
        end_year_for_end_date = end_year

    # Get the last day of the end month
    last_day = calendar.monthrange(end_year_for_end_date, end_month)[1]
    end_date = date(end_year_for_end_date, end_month, last_day)

    return start_date, end_date


def get_current_financial_year(fy_start_month: int = 4) -> str:
    """
    Get current financial year string.

    Args:
        fy_start_month: Month when financial year starts (1-12), default is 4 (April)

    Returns:
        Current financial year string in format 'YYYY-YY'

    Example:
        >>> # If today is May 15, 2024
        >>> get_current_financial_year(4)
        '2024-25'
    """
    return get_financial_year(datetime.now().date(), fy_start_month)


def list_financial_years(start_year: int, end_year: int, fy_start_month: int = 4) -> List[str]:
    """
    Generate list of financial year strings for a range of years.

    Args:
        start_year: Starting year (inclusive)
        end_year: Ending year (inclusive)
        fy_start_month: Month when financial year starts (1-12), default is 4 (April)

    Returns:
        List of financial year strings

    Example:
        >>> list_financial_years(2020, 2023, 4)
        ['2020-21', '2021-22', '2022-23', '2023-24']
    """
    return [f"{year}-{str(year + 1)[-2:]}" for year in range(start_year, end_year + 1)]


def parse_financial_year(fy_string: str) -> Tuple[int, int]:
    """
    Parse a financial year string into start and end years.

    Args:
        fy_string: Financial year string (e.g., '2024-25')

    Returns:
        Tuple of (start_year, end_year)

    Example:
        >>> parse_financial_year('2024-25')
        (2024, 2025)
    """
    start_year = int(fy_string.split('-')[0])

    # Handle both 2-digit and 4-digit end year formats
    end_part = fy_string.split('-')[1]
    if len(end_part) == 2:
        # 2-digit format (e.g., '2024-25')
        end_year = start_year + 1
    else:
        # 4-digit format (e.g., '2024-2025')
        end_year = int(end_part)

    return start_year, end_year


def is_date_in_financial_year(check_date: date, fy_string: str, fy_start_month: int = 4) -> bool:
    """
    Check if a date falls within a given financial year.

    Args:
        check_date: Date to check
        fy_string: Financial year string (e.g., '2024-25')
        fy_start_month: Month when financial year starts (1-12), default is 4 (April)

    Returns:
        True if the date is in the financial year, False otherwise

    Example:
        >>> is_date_in_financial_year(date(2024, 5, 15), '2024-25', 4)
        True
        >>> is_date_in_financial_year(date(2024, 3, 15), '2024-25', 4)
        False
    """
    start_date, end_date = get_financial_year_dates(fy_string, fy_start_month)
    return start_date <= check_date <= end_date


def get_financial_quarter(date_obj: date, fy_start_month: int = 4) -> Tuple[str, int]:
    """
    Get the financial quarter for a given date.

    Args:
        date_obj: The date to get the quarter for
        fy_start_month: Month when financial year starts (1-12), default is 4 (April)

    Returns:
        Tuple of (financial_year, quarter_number)
        Quarter number is 1-4 (Q1, Q2, Q3, Q4)

    Example:
        >>> get_financial_quarter(date(2024, 5, 15), 4)  # May is Q1 of FY 2024-25
        ('2024-25', 1)
        >>> get_financial_quarter(date(2024, 10, 15), 4)  # October is Q3 of FY 2024-25
        ('2024-25', 3)
    """
    fy = get_financial_year(date_obj, fy_start_month)

    # Calculate month offset from FY start
    month = date_obj.month
    if month >= fy_start_month:
        month_offset = month - fy_start_month
    else:
        month_offset = (12 - fy_start_month) + month

    # Determine quarter (0-based month offset / 3 + 1)
    quarter = (month_offset // 3) + 1

    return fy, quarter
