"""add consumption date field

Revision ID: add_consumption_date
Revises: add_performance_indexes
Create Date: 2025-01-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'add_consumption_date'
down_revision = 'add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade():
    # 添加 consumption_date 字段
    op.add_column('invoices', sa.Column('consumption_date', sa.Date(), nullable=True, comment='消费日期（实际消费/服务发生的日期）'))
    
    # 创建索引
    op.create_index('idx_invoices_consumption_date', 'invoices', ['consumption_date'], unique=False, postgresql_where=text('deleted_at IS NULL'))
    
    # 为现有数据设置默认值
    # 对于火车票，尝试从 extracted_data 中的 departureTime 解析日期
    # 对于其他类型，默认使用 invoice_date
    op.execute("""
        UPDATE invoices 
        SET consumption_date = 
            CASE 
                WHEN invoice_type = '火车票' AND extracted_data->>'departureTime' IS NOT NULL THEN
                    -- 尝试从 departureTime 中提取日期 (格式: "2024年1月15日 14:30")
                    TO_DATE(
                        SUBSTRING(extracted_data->>'departureTime' FROM 1 FOR 11),
                        'YYYY"年"MM"月"DD"日"'
                    )
                ELSE 
                    invoice_date
            END
        WHERE consumption_date IS NULL
    """)


def downgrade():
    # 删除索引
    op.drop_index('idx_invoices_consumption_date', table_name='invoices')
    
    # 删除字段
    op.drop_column('invoices', 'consumption_date')