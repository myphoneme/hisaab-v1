"""add invoice attachments

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
Create Date: 2024-12-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h3i4j5k6l7m8'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'invoice_attachments',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('stored_filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_invoice_attachments_invoice_id', 'invoice_attachments', ['invoice_id'])


def downgrade() -> None:
    op.drop_index('ix_invoice_attachments_invoice_id', table_name='invoice_attachments')
    op.drop_table('invoice_attachments')
