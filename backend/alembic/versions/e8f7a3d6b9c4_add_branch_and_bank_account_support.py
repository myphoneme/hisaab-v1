"""Add branch and bank account support

Revision ID: e8f7a3d6b9c4
Revises: d0bab93b5252
Create Date: 2025-11-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8f7a3d6b9c4'
down_revision: Union[str, None] = 'd0bab93b5252'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create branches table
    op.create_table('branches',
        sa.Column('branch_name', sa.String(length=255), nullable=False),
        sa.Column('branch_code', sa.String(length=50), nullable=False),
        sa.Column('gstin', sa.String(length=15), nullable=False),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('state_code', sa.String(length=2), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('pincode', sa.String(length=6), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=15), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_head_office', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_branches_id'), 'branches', ['id'], unique=False)
    op.create_index(op.f('ix_branches_gstin'), 'branches', ['gstin'], unique=True)
    op.create_index(op.f('ix_branches_branch_code'), 'branches', ['branch_code'], unique=True)
    op.create_index(op.f('ix_branches_branch_name'), 'branches', ['branch_name'], unique=False)

    # Create bank_accounts table
    op.create_table('bank_accounts',
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=False),
        sa.Column('bank_name', sa.String(length=255), nullable=False),
        sa.Column('account_number', sa.String(length=50), nullable=False),
        sa.Column('ifsc_code', sa.String(length=11), nullable=False),
        sa.Column('branch_name', sa.String(length=255), nullable=True),
        sa.Column('account_type', sa.Enum('SAVINGS', 'CURRENT', 'OVERDRAFT', 'CASH_CREDIT', name='accounttype'), nullable=False, server_default='CURRENT'),
        sa.Column('upi_id', sa.String(length=100), nullable=True),
        sa.Column('swift_code', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_bank_accounts_id'), 'bank_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_bank_accounts_branch_id'), 'bank_accounts', ['branch_id'], unique=False)

    # Add branch_id to invoices table
    op.add_column('invoices', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_invoices_branch_id', 'invoices', 'branches', ['branch_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_invoices_branch_id'), 'invoices', ['branch_id'], unique=False)

    # Add branch_id and bank_account_id to payments table
    op.add_column('payments', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.add_column('payments', sa.Column('bank_account_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_payments_branch_id', 'payments', 'branches', ['branch_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_payments_bank_account_id', 'payments', 'bank_accounts', ['bank_account_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_payments_branch_id'), 'payments', ['branch_id'], unique=False)
    op.create_index(op.f('ix_payments_bank_account_id'), 'payments', ['bank_account_id'], unique=False)

    # Add branch_id to purchase_orders table
    op.add_column('purchase_orders', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_purchase_orders_branch_id', 'purchase_orders', 'branches', ['branch_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_purchase_orders_branch_id'), 'purchase_orders', ['branch_id'], unique=False)

    # Add branch_id to ledger_entries table (if it exists)
    # Check if ledger_entries table exists before adding the column
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if 'ledger_entries' in inspector.get_table_names():
        op.add_column('ledger_entries', sa.Column('branch_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_ledger_entries_branch_id', 'ledger_entries', 'branches', ['branch_id'], ['id'], ondelete='SET NULL')
        op.create_index(op.f('ix_ledger_entries_branch_id'), 'ledger_entries', ['branch_id'], unique=False)


def downgrade() -> None:
    # Check if ledger_entries table exists before dropping the column
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if 'ledger_entries' in inspector.get_table_names():
        op.drop_index(op.f('ix_ledger_entries_branch_id'), table_name='ledger_entries')
        op.drop_constraint('fk_ledger_entries_branch_id', 'ledger_entries', type_='foreignkey')
        op.drop_column('ledger_entries', 'branch_id')

    # Remove branch_id from purchase_orders
    op.drop_index(op.f('ix_purchase_orders_branch_id'), table_name='purchase_orders')
    op.drop_constraint('fk_purchase_orders_branch_id', 'purchase_orders', type_='foreignkey')
    op.drop_column('purchase_orders', 'branch_id')

    # Remove branch_id and bank_account_id from payments
    op.drop_index(op.f('ix_payments_bank_account_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_branch_id'), table_name='payments')
    op.drop_constraint('fk_payments_bank_account_id', 'payments', type_='foreignkey')
    op.drop_constraint('fk_payments_branch_id', 'payments', type_='foreignkey')
    op.drop_column('payments', 'bank_account_id')
    op.drop_column('payments', 'branch_id')

    # Remove branch_id from invoices
    op.drop_index(op.f('ix_invoices_branch_id'), table_name='invoices')
    op.drop_constraint('fk_invoices_branch_id', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'branch_id')

    # Drop bank_accounts table
    op.drop_index(op.f('ix_bank_accounts_branch_id'), table_name='bank_accounts')
    op.drop_index(op.f('ix_bank_accounts_id'), table_name='bank_accounts')
    op.drop_table('bank_accounts')

    # Drop accounttype enum
    sa.Enum(name='accounttype').drop(op.get_bind(), checkfirst=True)

    # Drop branches table
    op.drop_index(op.f('ix_branches_branch_name'), table_name='branches')
    op.drop_index(op.f('ix_branches_branch_code'), table_name='branches')
    op.drop_index(op.f('ix_branches_gstin'), table_name='branches')
    op.drop_index(op.f('ix_branches_id'), table_name='branches')
    op.drop_table('branches')
