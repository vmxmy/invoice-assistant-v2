"""add invoice ocr fields

Revision ID: add_invoice_ocr_fields
Revises: 
Create Date: 2025-01-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_invoice_ocr_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 添加新字段
    op.add_column('invoices', sa.Column('file_name', sa.String(255), nullable=True, comment='原始文件名'))
    op.add_column('invoices', sa.Column('ocr_confidence_score', sa.Numeric(4, 3), nullable=True, comment='OCR识别置信度（0-1）'))
    
    # 重命名字段（如果需要）
    op.alter_column('invoices', 'seller_tax_id', new_column_name='seller_tax_number')
    op.alter_column('invoices', 'buyer_tax_id', new_column_name='buyer_tax_number')
    op.alter_column('invoices', 'amount', new_column_name='amount_without_tax')
    
    # 添加新的状态值到枚举类型
    op.execute("ALTER TYPE invoice_status_enum ADD VALUE IF NOT EXISTS 'active'")


def downgrade() -> None:
    # 删除字段
    op.drop_column('invoices', 'ocr_confidence_score')
    op.drop_column('invoices', 'file_name')
    
    # 恢复原字段名
    op.alter_column('invoices', 'seller_tax_number', new_column_name='seller_tax_id')
    op.alter_column('invoices', 'buyer_tax_number', new_column_name='buyer_tax_id')
    op.alter_column('invoices', 'amount_without_tax', new_column_name='amount')
    
    # 注意：PostgreSQL不支持从枚举类型中删除值