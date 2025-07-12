"""Add missing invoice columns

Revision ID: add_missing_invoice_columns
Revises: add_performance_indexes
Create Date: 2025-01-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_missing_invoice_columns'
down_revision = 'add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add amount_without_tax column if it doesn't exist
    op.add_column('invoices', sa.Column('amount_without_tax', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False, comment='金额（不含税）'))
    
    # Update amount_without_tax based on existing data
    # If we have total_amount but no amount_without_tax, use total_amount as a fallback
    op.execute("""
        UPDATE invoices 
        SET amount_without_tax = COALESCE(total_amount, 0) 
        WHERE amount_without_tax = 0 AND total_amount IS NOT NULL
    """)


def downgrade() -> None:
    op.drop_column('invoices', 'amount_without_tax')