"""add client PO and billing schedule tables

Revision ID: m8n9o0p1q2r3
Revises: l7m8n9o0p1q2
Create Date: 2024-12-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'm8n9o0p1q2r3'
down_revision: Union[str, None] = 'l7m8n9o0p1q2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create client_pos table
    op.create_table(
        'client_pos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('internal_number', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('client_po_number', sa.String(100), nullable=True),
        sa.Column('client_po_date', sa.Date(), nullable=True),
        sa.Column('received_date', sa.Date(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('valid_from', sa.Date(), nullable=False),
        sa.Column('valid_until', sa.Date(), nullable=True),
        sa.Column('billing_frequency', sa.Enum('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'MILESTONE', name='billingfrequency'), nullable=False, server_default='ONE_TIME'),
        sa.Column('place_of_supply', sa.String(100), nullable=True),
        sa.Column('place_of_supply_code', sa.String(2), nullable=True),
        sa.Column('is_igst', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('subtotal', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('taxable_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('cgst_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('sgst_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('igst_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('invoiced_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('remaining_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('DRAFT', 'ACTIVE', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'EXPIRED', name='clientpostatus'), nullable=False, server_default='DRAFT'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_client_pos_client_id', 'client_pos', ['client_id'])
    op.create_index('ix_client_pos_status', 'client_pos', ['status'])
    op.create_index('ix_client_pos_received_date', 'client_pos', ['received_date'])

    # Create client_po_items table
    op.create_table(
        'client_po_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_po_id', sa.Integer(), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=True),
        sa.Column('serial_no', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('hsn_sac', sa.String(8), nullable=True),
        sa.Column('quantity', sa.Numeric(15, 3), nullable=False, server_default='1'),
        sa.Column('unit', sa.String(20), nullable=False, server_default='NOS'),
        sa.Column('rate', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('gst_rate', sa.Numeric(5, 2), nullable=False, server_default='18'),
        sa.Column('cgst_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('sgst_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('igst_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('invoiced_quantity', sa.Numeric(15, 3), nullable=False, server_default='0'),
        sa.Column('remaining_quantity', sa.Numeric(15, 3), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_po_id'], ['client_pos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_client_po_items_client_po_id', 'client_po_items', ['client_po_id'])

    # Create billing_schedules table (without PI/Invoice FK for now - will be added in a later migration)
    op.create_table(
        'billing_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_po_id', sa.Integer(), nullable=False),
        sa.Column('installment_number', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('gst_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(15, 2), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('PENDING', 'PI_RAISED', 'INVOICED', 'CANCELLED', name='schedulestatus'), nullable=False, server_default='PENDING'),
        sa.Column('proforma_invoice_id', sa.Integer(), nullable=True),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_po_id'], ['client_pos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_billing_schedules_client_po_id', 'billing_schedules', ['client_po_id'])
    op.create_index('ix_billing_schedules_due_date', 'billing_schedules', ['due_date'])
    op.create_index('ix_billing_schedules_status', 'billing_schedules', ['status'])


def downgrade() -> None:
    op.drop_table('billing_schedules')
    op.drop_table('client_po_items')
    op.drop_table('client_pos')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS schedulestatus')
    op.execute('DROP TYPE IF EXISTS clientpostatus')
    op.execute('DROP TYPE IF EXISTS billingfrequency')
