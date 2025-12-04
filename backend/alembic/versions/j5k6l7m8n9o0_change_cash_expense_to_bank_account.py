"""change cash expense account to bank account

Revision ID: j5k6l7m8n9o0
Revises: i4j5k6l7m8n9
Create Date: 2024-12-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j5k6l7m8n9o0'
down_revision: Union[str, None] = 'i4j5k6l7m8n9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear existing cash_expenses data (if any) since account_id references will become invalid
    op.execute("DELETE FROM cash_expenses")

    # Drop old foreign key and index
    op.drop_index('ix_cash_expenses_account_id', table_name='cash_expenses')
    op.drop_constraint('cash_expenses_account_id_fkey', 'cash_expenses', type_='foreignkey')

    # Rename column from account_id to bank_account_id
    op.alter_column('cash_expenses', 'account_id', new_column_name='bank_account_id')

    # Add new foreign key to bank_accounts
    op.create_foreign_key(
        'cash_expenses_bank_account_id_fkey',
        'cash_expenses',
        'bank_accounts',
        ['bank_account_id'],
        ['id']
    )

    # Create new index
    op.create_index('ix_cash_expenses_bank_account_id', 'cash_expenses', ['bank_account_id'])

    # Add transaction_ref column for storing UPI UTR, Bank Ref, Cheque No, etc.
    op.add_column('cash_expenses', sa.Column('transaction_ref', sa.String(100), nullable=True))
    op.create_index('ix_cash_expenses_transaction_ref', 'cash_expenses', ['transaction_ref'])


def downgrade() -> None:
    # Clear existing cash_expenses data since bank_account_id references will become invalid
    op.execute("DELETE FROM cash_expenses")

    # Drop transaction_ref column and index
    op.drop_index('ix_cash_expenses_transaction_ref', table_name='cash_expenses')
    op.drop_column('cash_expenses', 'transaction_ref')

    # Drop new foreign key and index
    op.drop_index('ix_cash_expenses_bank_account_id', table_name='cash_expenses')
    op.drop_constraint('cash_expenses_bank_account_id_fkey', 'cash_expenses', type_='foreignkey')

    # Rename column back
    op.alter_column('cash_expenses', 'bank_account_id', new_column_name='account_id')

    # Add old foreign key to chart_of_accounts
    op.create_foreign_key(
        'cash_expenses_account_id_fkey',
        'cash_expenses',
        'chart_of_accounts',
        ['account_id'],
        ['id']
    )

    # Create old index
    op.create_index('ix_cash_expenses_account_id', 'cash_expenses', ['account_id'])
