"""Add performance indexes for invoice statistics

Revision ID: add_performance_indexes
Revises: 
Create Date: 2025-01-11

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_performance_indexes'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add composite index for user_id + deleted_at to speed up base condition queries
    op.create_index(
        'idx_invoices_user_deleted', 
        'invoices', 
        ['user_id', 'deleted_at'],
        postgresql_where='deleted_at IS NULL'
    )
    
    # Add index for total_amount to speed up aggregation queries
    op.create_index(
        'idx_invoices_total_amount',
        'invoices',
        ['total_amount'],
        postgresql_where='deleted_at IS NULL'
    )
    
    # Add composite index for source to speed up distribution queries
    op.create_index(
        'idx_invoices_source',
        'invoices',
        ['source'],
        postgresql_where='deleted_at IS NULL'
    )
    
    # Add composite index for created_at to speed up recent activity queries
    op.create_index(
        'idx_invoices_created_at_desc',
        'invoices',
        [sa.text('created_at DESC')],
        postgresql_where='deleted_at IS NULL'
    )


def downgrade() -> None:
    op.drop_index('idx_invoices_created_at_desc', table_name='invoices')
    op.drop_index('idx_invoices_source', table_name='invoices')
    op.drop_index('idx_invoices_total_amount', table_name='invoices')
    op.drop_index('idx_invoices_user_deleted', table_name='invoices')