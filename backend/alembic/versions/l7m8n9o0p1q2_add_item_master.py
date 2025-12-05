"""add item master table

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
Create Date: 2024-12-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l7m8n9o0p1q2'
down_revision: Union[str, None] = 'k6l7m8n9o0p1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create items table
    op.create_table(
        'items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('item_type', sa.Enum('GOODS', 'SERVICES', name='itemtype'), nullable=False, server_default='SERVICES'),
        sa.Column('hsn_sac', sa.String(8), nullable=True),
        sa.Column('default_gst_rate', sa.Numeric(5, 2), nullable=False, server_default='18'),
        sa.Column('default_unit', sa.String(20), nullable=False, server_default='NOS'),
        sa.Column('default_rate', sa.Numeric(15, 2), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create indexes
    op.create_index('ix_items_code', 'items', ['code'], unique=True)
    op.create_index('ix_items_name', 'items', ['name'], unique=False)
    op.create_index('ix_items_id', 'items', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_items_id', table_name='items')
    op.drop_index('ix_items_name', table_name='items')
    op.drop_index('ix_items_code', table_name='items')
    op.drop_table('items')

    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS itemtype')
