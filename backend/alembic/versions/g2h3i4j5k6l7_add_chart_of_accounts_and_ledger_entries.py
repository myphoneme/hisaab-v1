"""Add chart_of_accounts and ledger_entries tables

Revision ID: g2h3i4j5k6l7
Revises: f1a2b3c4d5e6
Create Date: 2025-12-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'g2h3i4j5k6l7'
down_revision: Union[str, None] = 'e8f7a3d6b9c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types if they don't exist
    accounttype = postgresql.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', name='accounttype', create_type=False)
    accountgroup = postgresql.ENUM(
        'CASH_BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'FIXED_ASSETS', 'OTHER_ASSETS',
        'ACCOUNTS_PAYABLE', 'DUTIES_TAXES', 'LOANS', 'OTHER_LIABILITIES',
        'CAPITAL', 'RESERVES',
        'SALES', 'OTHER_INCOME',
        'PURCHASE', 'DIRECT_EXPENSES', 'INDIRECT_EXPENSES',
        name='accountgroup', create_type=False
    )
    referencetype = postgresql.ENUM('INVOICE', 'PAYMENT', 'JOURNAL', 'OPENING', name='referencetype', create_type=False)

    # Create enums first (if not exists)
    connection = op.get_bind()
    accounttype.create(connection, checkfirst=True)
    accountgroup.create(connection, checkfirst=True)
    referencetype.create(connection, checkfirst=True)

    # Create chart_of_accounts table
    op.create_table('chart_of_accounts',
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('account_type', accounttype, nullable=False),
        sa.Column('account_group', accountgroup, nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['parent_id'], ['chart_of_accounts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chart_of_accounts_id'), 'chart_of_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_chart_of_accounts_code'), 'chart_of_accounts', ['code'], unique=True)

    # Create ledger_entries table
    op.create_table('ledger_entries',
        sa.Column('entry_date', sa.Date(), nullable=False),
        sa.Column('voucher_number', sa.String(length=50), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('debit', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('credit', sa.Numeric(precision=15, scale=2), nullable=False, server_default='0'),
        sa.Column('reference_type', referencetype, nullable=False),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('narration', sa.Text(), nullable=True),
        sa.Column('client_id', sa.Integer(), nullable=True),
        sa.Column('vendor_id', sa.Integer(), nullable=True),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('financial_year', sa.String(length=10), nullable=False),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['account_id'], ['chart_of_accounts.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ledger_entries_id'), 'ledger_entries', ['id'], unique=False)
    op.create_index(op.f('ix_ledger_entries_entry_date'), 'ledger_entries', ['entry_date'], unique=False)
    op.create_index(op.f('ix_ledger_entries_voucher_number'), 'ledger_entries', ['voucher_number'], unique=False)
    op.create_index(op.f('ix_ledger_entries_branch_id'), 'ledger_entries', ['branch_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ledger_entries_branch_id'), table_name='ledger_entries')
    op.drop_index(op.f('ix_ledger_entries_voucher_number'), table_name='ledger_entries')
    op.drop_index(op.f('ix_ledger_entries_entry_date'), table_name='ledger_entries')
    op.drop_index(op.f('ix_ledger_entries_id'), table_name='ledger_entries')
    op.drop_table('ledger_entries')

    op.drop_index(op.f('ix_chart_of_accounts_code'), table_name='chart_of_accounts')
    op.drop_index(op.f('ix_chart_of_accounts_id'), table_name='chart_of_accounts')
    op.drop_table('chart_of_accounts')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS referencetype')
    op.execute('DROP TYPE IF EXISTS accountgroup')
    op.execute('DROP TYPE IF EXISTS accounttype')
