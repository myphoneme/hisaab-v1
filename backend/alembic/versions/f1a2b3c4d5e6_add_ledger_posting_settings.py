"""Add ledger posting settings and default accounts

Revision ID: f1a2b3c4d5e6
Revises: e8f7a3d6b9c4
Create Date: 2025-12-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'g2h3i4j5k6l7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ledger posting configuration to company_settings
    op.add_column('company_settings', sa.Column('ledger_posting_on', sa.String(20), nullable=False, server_default='ON_SENT'))

    # Add default account ID columns to company_settings
    op.add_column('company_settings', sa.Column('default_sales_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_purchase_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_ar_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_ap_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_cash_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_bank_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_cgst_output_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_sgst_output_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_igst_output_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_cgst_input_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_sgst_input_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_igst_input_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_tds_receivable_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_tds_payable_account_id', sa.Integer(), nullable=True))
    op.add_column('company_settings', sa.Column('default_round_off_account_id', sa.Integer(), nullable=True))

    # Add foreign key constraints
    op.create_foreign_key('fk_settings_sales_account', 'company_settings', 'chart_of_accounts', ['default_sales_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_purchase_account', 'company_settings', 'chart_of_accounts', ['default_purchase_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_ar_account', 'company_settings', 'chart_of_accounts', ['default_ar_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_ap_account', 'company_settings', 'chart_of_accounts', ['default_ap_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_cash_account', 'company_settings', 'chart_of_accounts', ['default_cash_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_bank_account', 'company_settings', 'chart_of_accounts', ['default_bank_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_cgst_output_account', 'company_settings', 'chart_of_accounts', ['default_cgst_output_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_sgst_output_account', 'company_settings', 'chart_of_accounts', ['default_sgst_output_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_igst_output_account', 'company_settings', 'chart_of_accounts', ['default_igst_output_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_cgst_input_account', 'company_settings', 'chart_of_accounts', ['default_cgst_input_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_sgst_input_account', 'company_settings', 'chart_of_accounts', ['default_sgst_input_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_igst_input_account', 'company_settings', 'chart_of_accounts', ['default_igst_input_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_tds_receivable_account', 'company_settings', 'chart_of_accounts', ['default_tds_receivable_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_tds_payable_account', 'company_settings', 'chart_of_accounts', ['default_tds_payable_account_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_settings_round_off_account', 'company_settings', 'chart_of_accounts', ['default_round_off_account_id'], ['id'], ondelete='SET NULL')

    # Add is_posted field to invoices table
    op.add_column('invoices', sa.Column('is_posted', sa.Boolean(), nullable=False, server_default='0'))

    # Add is_posted field to payments table
    op.add_column('payments', sa.Column('is_posted', sa.Boolean(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Remove is_posted from payments
    op.drop_column('payments', 'is_posted')

    # Remove is_posted from invoices
    op.drop_column('invoices', 'is_posted')

    # Remove foreign key constraints from company_settings
    op.drop_constraint('fk_settings_round_off_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_tds_payable_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_tds_receivable_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_igst_input_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_sgst_input_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_cgst_input_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_igst_output_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_sgst_output_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_cgst_output_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_bank_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_cash_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_ap_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_ar_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_purchase_account', 'company_settings', type_='foreignkey')
    op.drop_constraint('fk_settings_sales_account', 'company_settings', type_='foreignkey')

    # Remove default account columns from company_settings
    op.drop_column('company_settings', 'default_round_off_account_id')
    op.drop_column('company_settings', 'default_tds_payable_account_id')
    op.drop_column('company_settings', 'default_tds_receivable_account_id')
    op.drop_column('company_settings', 'default_igst_input_account_id')
    op.drop_column('company_settings', 'default_sgst_input_account_id')
    op.drop_column('company_settings', 'default_cgst_input_account_id')
    op.drop_column('company_settings', 'default_igst_output_account_id')
    op.drop_column('company_settings', 'default_sgst_output_account_id')
    op.drop_column('company_settings', 'default_cgst_output_account_id')
    op.drop_column('company_settings', 'default_bank_account_id')
    op.drop_column('company_settings', 'default_cash_account_id')
    op.drop_column('company_settings', 'default_ap_account_id')
    op.drop_column('company_settings', 'default_ar_account_id')
    op.drop_column('company_settings', 'default_purchase_account_id')
    op.drop_column('company_settings', 'default_sales_account_id')
    op.drop_column('company_settings', 'ledger_posting_on')
