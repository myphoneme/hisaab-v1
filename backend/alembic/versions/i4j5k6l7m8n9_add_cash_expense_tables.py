"""add cash expense tables

Revision ID: i4j5k6l7m8n9
Revises: h3i4j5k6l7m8
Create Date: 2024-12-03 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i4j5k6l7m8n9'
down_revision: Union[str, None] = 'h3i4j5k6l7m8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create expense_categories table
    op.create_table(
        'expense_categories',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('code', sa.String(50), nullable=True, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=True, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('budget', sa.Numeric(15, 2), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('status', sa.String(50), default='ACTIVE', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create cash_expenses table
    op.create_table(
        'cash_expenses',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('expense_number', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('transaction_date', sa.Date(), nullable=False, index=True),
        sa.Column('expense_category_id', sa.Integer(), sa.ForeignKey('expense_categories.id'), nullable=True),
        sa.Column('account_id', sa.Integer(), sa.ForeignKey('chart_of_accounts.id'), nullable=False),
        sa.Column('project_id', sa.Integer(), sa.ForeignKey('projects.id'), nullable=True),
        sa.Column('branch_id', sa.Integer(), sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('amount', sa.Numeric(15, 2), nullable=False),
        sa.Column('transaction_type', sa.String(10), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('financial_year', sa.String(10), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create indexes
    op.create_index('ix_cash_expenses_expense_category_id', 'cash_expenses', ['expense_category_id'])
    op.create_index('ix_cash_expenses_account_id', 'cash_expenses', ['account_id'])
    op.create_index('ix_cash_expenses_project_id', 'cash_expenses', ['project_id'])
    op.create_index('ix_cash_expenses_branch_id', 'cash_expenses', ['branch_id'])
    op.create_index('ix_cash_expenses_financial_year', 'cash_expenses', ['financial_year'])


def downgrade() -> None:
    op.drop_index('ix_cash_expenses_financial_year', table_name='cash_expenses')
    op.drop_index('ix_cash_expenses_branch_id', table_name='cash_expenses')
    op.drop_index('ix_cash_expenses_project_id', table_name='cash_expenses')
    op.drop_index('ix_cash_expenses_account_id', table_name='cash_expenses')
    op.drop_index('ix_cash_expenses_expense_category_id', table_name='cash_expenses')
    op.drop_table('cash_expenses')
    op.drop_table('projects')
    op.drop_table('expense_categories')
