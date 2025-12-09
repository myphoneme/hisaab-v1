"""add_tds_tables

Revision ID: b7c8d9e0f1g2
Revises: a6cac5aca80d
Create Date: 2025-12-09 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1g2'
down_revision: Union[str, None] = 'a6cac5aca80d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define enum types
tds_type_enum = postgresql.ENUM('PAYABLE', 'RECEIVABLE', name='tdstype', create_type=False)
return_status_enum = postgresql.ENUM('DRAFT', 'FILED', 'REVISED', name='returnstatus', create_type=False)


def upgrade() -> None:
    conn = op.get_bind()

    # Create tdstype enum if not exists
    conn.execute(sa.text("DO $$ BEGIN CREATE TYPE tdstype AS ENUM ('PAYABLE', 'RECEIVABLE'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))

    # Create returnstatus enum if not exists
    conn.execute(sa.text("DO $$ BEGIN CREATE TYPE returnstatus AS ENUM ('DRAFT', 'FILED', 'REVISED'); EXCEPTION WHEN duplicate_object THEN null; END $$;"))

    # Create tds_challans table
    op.create_table(
        'tds_challans',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('challan_number', sa.String(50), nullable=False, index=True),
        sa.Column('bsr_code', sa.String(10), nullable=False),
        sa.Column('financial_year', sa.String(9), nullable=False, index=True),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('quarter', sa.Integer(), nullable=False),
        sa.Column('tds_type', tds_type_enum, nullable=False),
        sa.Column('tds_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('penalty', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('interest', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('transaction_id', sa.String(50), nullable=True),
        sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=True, index=True),
        sa.Column('challan_file_path', sa.String(500), nullable=True),
        sa.Column('challan_filename', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_tds_challans_tds_type', 'tds_challans', ['tds_type'])

    # Create tds_challan_entries table
    op.create_table(
        'tds_challan_entries',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('challan_id', sa.Integer(), sa.ForeignKey('tds_challans.id'), nullable=False, index=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id'), nullable=False, index=True),
        sa.Column('party_name', sa.String(200), nullable=False),
        sa.Column('party_pan', sa.String(10), nullable=True),
        sa.Column('invoice_number', sa.String(50), nullable=False),
        sa.Column('invoice_date', sa.Date(), nullable=False),
        sa.Column('base_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('tds_rate', sa.Numeric(5, 2), nullable=False),
        sa.Column('tds_section', sa.String(10), nullable=False),
        sa.Column('tds_amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('penalty', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('interest', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create tds_returns table
    op.create_table(
        'tds_returns',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('financial_year', sa.String(9), nullable=False, index=True),
        sa.Column('quarter', sa.Integer(), nullable=False),
        sa.Column('tds_type', tds_type_enum, nullable=False),
        sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=True, index=True),
        sa.Column('return_file_path', sa.String(500), nullable=True),
        sa.Column('return_filename', sa.String(255), nullable=True),
        sa.Column('status', return_status_enum, nullable=False, server_default='DRAFT'),
        sa.Column('filed_date', sa.Date(), nullable=True),
        sa.Column('acknowledgment_number', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_tds_returns_tds_type', 'tds_returns', ['tds_type'])

    # Add tds_challan_id to invoices table
    op.add_column('invoices', sa.Column('tds_challan_id', sa.Integer(), nullable=True))
    op.create_index('ix_invoices_tds_challan_id', 'invoices', ['tds_challan_id'])
    op.create_foreign_key('fk_invoices_tds_challan_id', 'invoices', 'tds_challans', ['tds_challan_id'], ['id'])


def downgrade() -> None:
    # Drop foreign key and column from invoices
    op.drop_constraint('fk_invoices_tds_challan_id', 'invoices', type_='foreignkey')
    op.drop_index('ix_invoices_tds_challan_id', 'invoices')
    op.drop_column('invoices', 'tds_challan_id')

    # Drop indexes
    op.drop_index('ix_tds_returns_tds_type', 'tds_returns')
    op.drop_index('ix_tds_challans_tds_type', 'tds_challans')

    # Drop tables
    op.drop_table('tds_returns')
    op.drop_table('tds_challan_entries')
    op.drop_table('tds_challans')

    # Drop enums
    conn = op.get_bind()
    conn.execute(sa.text("DROP TYPE IF EXISTS returnstatus"))
    conn.execute(sa.text("DROP TYPE IF EXISTS tdstype"))
