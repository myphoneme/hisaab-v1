"""add invoice client_po and billing_schedule links

Revision ID: n9o0p1q2r3s4
Revises: m8n9o0p1q2r3
Create Date: 2024-12-05 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n9o0p1q2r3s4'
down_revision: Union[str, None] = 'm8n9o0p1q2r3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add client_po_id to invoices table
    op.add_column('invoices', sa.Column('client_po_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_invoices_client_po_id',
        'invoices', 'client_pos',
        ['client_po_id'], ['id']
    )
    op.create_index('ix_invoices_client_po_id', 'invoices', ['client_po_id'])

    # Add billing_schedule_id to invoices table
    op.add_column('invoices', sa.Column('billing_schedule_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_invoices_billing_schedule_id',
        'invoices', 'billing_schedules',
        ['billing_schedule_id'], ['id']
    )
    op.create_index('ix_invoices_billing_schedule_id', 'invoices', ['billing_schedule_id'])


def downgrade() -> None:
    op.drop_index('ix_invoices_billing_schedule_id', table_name='invoices')
    op.drop_constraint('fk_invoices_billing_schedule_id', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'billing_schedule_id')

    op.drop_index('ix_invoices_client_po_id', table_name='invoices')
    op.drop_constraint('fk_invoices_client_po_id', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'client_po_id')
