from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Optional

from app.models.ledger import ChartOfAccount
from app.models.settings import CompanySettings


# Default Chart of Accounts structure (using string values)
DEFAULT_ACCOUNTS = [
    # Assets (1000-1999)
    {
        "code": "1000",
        "name": "Cash",
        "account_type": "ASSET",
        "account_group": "CASH_BANK",
        "description": "Cash in hand",
        "setting_field": "default_cash_account_id"
    },
    {
        "code": "1010",
        "name": "Bank Account",
        "account_type": "ASSET",
        "account_group": "CASH_BANK",
        "description": "Bank account balance",
        "setting_field": "default_bank_account_id"
    },
    {
        "code": "1100",
        "name": "Accounts Receivable",
        "account_type": "ASSET",
        "account_group": "ACCOUNTS_RECEIVABLE",
        "description": "Amount receivable from customers",
        "setting_field": "default_ar_account_id"
    },
    {
        "code": "1200",
        "name": "CGST Input",
        "account_type": "ASSET",
        "account_group": "OTHER_ASSETS",
        "description": "Central GST paid on purchases",
        "setting_field": "default_cgst_input_account_id"
    },
    {
        "code": "1210",
        "name": "SGST Input",
        "account_type": "ASSET",
        "account_group": "OTHER_ASSETS",
        "description": "State GST paid on purchases",
        "setting_field": "default_sgst_input_account_id"
    },
    {
        "code": "1220",
        "name": "IGST Input",
        "account_type": "ASSET",
        "account_group": "OTHER_ASSETS",
        "description": "Integrated GST paid on purchases",
        "setting_field": "default_igst_input_account_id"
    },
    {
        "code": "1300",
        "name": "TDS Receivable",
        "account_type": "ASSET",
        "account_group": "OTHER_ASSETS",
        "description": "TDS deducted by customers",
        "setting_field": "default_tds_receivable_account_id"
    },

    # Liabilities (2000-2999)
    {
        "code": "2100",
        "name": "Accounts Payable",
        "account_type": "LIABILITY",
        "account_group": "ACCOUNTS_PAYABLE",
        "description": "Amount payable to vendors",
        "setting_field": "default_ap_account_id"
    },
    {
        "code": "2200",
        "name": "CGST Output",
        "account_type": "LIABILITY",
        "account_group": "DUTIES_TAXES",
        "description": "Central GST collected on sales",
        "setting_field": "default_cgst_output_account_id"
    },
    {
        "code": "2210",
        "name": "SGST Output",
        "account_type": "LIABILITY",
        "account_group": "DUTIES_TAXES",
        "description": "State GST collected on sales",
        "setting_field": "default_sgst_output_account_id"
    },
    {
        "code": "2220",
        "name": "IGST Output",
        "account_type": "LIABILITY",
        "account_group": "DUTIES_TAXES",
        "description": "Integrated GST collected on sales",
        "setting_field": "default_igst_output_account_id"
    },
    {
        "code": "2300",
        "name": "TDS Payable",
        "account_type": "LIABILITY",
        "account_group": "DUTIES_TAXES",
        "description": "TDS to be deposited with government",
        "setting_field": "default_tds_payable_account_id"
    },

    # Equity (3000-3999)
    {
        "code": "3000",
        "name": "Capital Account",
        "account_type": "EQUITY",
        "account_group": "CAPITAL",
        "description": "Owner's capital",
        "setting_field": None
    },
    {
        "code": "3100",
        "name": "Retained Earnings",
        "account_type": "EQUITY",
        "account_group": "RESERVES",
        "description": "Accumulated profits",
        "setting_field": None
    },

    # Revenue (4000-4999)
    {
        "code": "4000",
        "name": "Sales Revenue",
        "account_type": "REVENUE",
        "account_group": "SALES",
        "description": "Revenue from sales",
        "setting_field": "default_sales_account_id"
    },
    {
        "code": "4100",
        "name": "Other Income",
        "account_type": "REVENUE",
        "account_group": "OTHER_INCOME",
        "description": "Miscellaneous income",
        "setting_field": None
    },

    # Expenses (5000-5999)
    {
        "code": "5000",
        "name": "Purchase Expense",
        "account_type": "EXPENSE",
        "account_group": "PURCHASE",
        "description": "Cost of goods purchased",
        "setting_field": "default_purchase_account_id"
    },
    {
        "code": "5100",
        "name": "Direct Expenses",
        "account_type": "EXPENSE",
        "account_group": "DIRECT_EXPENSES",
        "description": "Direct business expenses",
        "setting_field": None
    },
    {
        "code": "5900",
        "name": "Round Off",
        "account_type": "EXPENSE",
        "account_group": "INDIRECT_EXPENSES",
        "description": "Rounding off differences",
        "setting_field": "default_round_off_account_id"
    },
]


async def seed_default_accounts(db: AsyncSession) -> Dict[str, int]:
    """
    Seed default chart of accounts and update company settings with default account IDs.

    Args:
        db: Async database session

    Returns:
        Dictionary mapping account codes to their IDs
    """
    account_ids: Dict[str, int] = {}
    settings_updates: Dict[str, int] = {}

    for account_data in DEFAULT_ACCOUNTS:
        # Check if account already exists
        result = await db.execute(
            select(ChartOfAccount).where(ChartOfAccount.code == account_data["code"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            account_ids[account_data["code"]] = existing.id
            if account_data.get("setting_field"):
                settings_updates[account_data["setting_field"]] = existing.id
            continue

        # Create new account
        account = ChartOfAccount(
            code=account_data["code"],
            name=account_data["name"],
            account_type=account_data["account_type"],
            account_group=account_data["account_group"],
            description=account_data.get("description"),
            is_active=True,
            is_system=True  # Mark as system account - cannot be deleted
        )
        db.add(account)
        await db.flush()  # Get the ID without committing

        account_ids[account_data["code"]] = account.id

        # Map to company settings field
        if account_data.get("setting_field"):
            settings_updates[account_data["setting_field"]] = account.id

    # Update company settings with default account IDs
    if settings_updates:
        result = await db.execute(select(CompanySettings).limit(1))
        company_settings = result.scalar_one_or_none()

        if company_settings:
            for field, account_id in settings_updates.items():
                # Only update if not already set
                if getattr(company_settings, field) is None:
                    setattr(company_settings, field, account_id)

    await db.commit()

    return account_ids


async def check_accounts_seeded(db: AsyncSession) -> bool:
    """
    Check if default accounts have been seeded.

    Args:
        db: Async database session

    Returns:
        True if accounts exist, False otherwise
    """
    # Check for a few key accounts
    key_codes = ["1000", "1100", "2100", "4000", "5000"]
    result = await db.execute(
        select(ChartOfAccount).where(ChartOfAccount.code.in_(key_codes))
    )
    accounts = result.scalars().all()

    return len(accounts) >= len(key_codes)
