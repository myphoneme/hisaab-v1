"""add bank account to invoice and create states table

Revision ID: k6l7m8n9o0p1
Revises: j5k6l7m8n9o0
Create Date: 2024-12-04 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'k6l7m8n9o0p1'
down_revision: Union[str, None] = 'j5k6l7m8n9o0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Indian States/UTs with GST codes
INDIAN_STATES = [
    ("01", "Jammu & Kashmir"),
    ("02", "Himachal Pradesh"),
    ("03", "Punjab"),
    ("04", "Chandigarh"),
    ("05", "Uttarakhand"),
    ("06", "Haryana"),
    ("07", "Delhi"),
    ("08", "Rajasthan"),
    ("09", "Uttar Pradesh"),
    ("10", "Bihar"),
    ("11", "Sikkim"),
    ("12", "Arunachal Pradesh"),
    ("13", "Nagaland"),
    ("14", "Manipur"),
    ("15", "Mizoram"),
    ("16", "Tripura"),
    ("17", "Meghalaya"),
    ("18", "Assam"),
    ("19", "West Bengal"),
    ("20", "Jharkhand"),
    ("21", "Odisha"),
    ("22", "Chhattisgarh"),
    ("23", "Madhya Pradesh"),
    ("24", "Gujarat"),
    ("25", "Daman & Diu"),
    ("26", "Dadra & Nagar Haveli"),
    ("27", "Maharashtra"),
    ("28", "Andhra Pradesh (Old)"),
    ("29", "Karnataka"),
    ("30", "Goa"),
    ("31", "Lakshadweep"),
    ("32", "Kerala"),
    ("33", "Tamil Nadu"),
    ("34", "Puducherry"),
    ("35", "Andaman & Nicobar"),
    ("36", "Telangana"),
    ("37", "Andhra Pradesh"),
    ("38", "Ladakh"),
    ("97", "Other Territory"),
    ("99", "Centre Jurisdiction"),
]


def upgrade() -> None:
    # Create states table
    op.create_table(
        'states',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('code', sa.String(2), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Seed states data
    from datetime import datetime
    now = datetime.utcnow()

    states_table = sa.table(
        'states',
        sa.column('code', sa.String),
        sa.column('name', sa.String),
        sa.column('is_active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime),
    )

    op.bulk_insert(states_table, [
        {
            'code': code,
            'name': name,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
        }
        for code, name in INDIAN_STATES
    ])

    # Add bank_account_id to invoices
    op.add_column('invoices', sa.Column('bank_account_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'invoices_bank_account_id_fkey',
        'invoices',
        'bank_accounts',
        ['bank_account_id'],
        ['id']
    )
    op.create_index('ix_invoices_bank_account_id', 'invoices', ['bank_account_id'])


def downgrade() -> None:
    # Remove bank_account_id from invoices
    op.drop_index('ix_invoices_bank_account_id', table_name='invoices')
    op.drop_constraint('invoices_bank_account_id_fkey', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'bank_account_id')

    # Drop states table
    op.drop_table('states')
