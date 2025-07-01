"""
模型示例

展示如何使用基类创建符合 Supabase 最佳实践的模型。
"""

from typing import Optional, List
from datetime import datetime
from enum import Enum

from sqlalchemy import Column, String, Text, Boolean, Integer, Numeric, ForeignKey, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import Base, UserOwnedMixin, TimestampMixin, AuditMixin


class InvoiceStatus(str, Enum):
    """发票状态枚举"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class Invoice(Base, UserOwnedMixin, TimestampMixin):
    """
    发票模型示例
    
    展示 Supabase 最佳实践：
    1. 继承 Base 获得 UUID 主键和时间戳
    2. 使用 UserOwnedMixin 支持 RLS
    3. 使用 JSONB 存储灵活数据
    4. 使用枚举类型
    5. 添加适当的索引
    """
    
    # 基本信息
    invoice_number = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
        comment="发票号码"
    )
    
    # 使用 JSONB 存储发票详情（Supabase 推荐）
    invoice_data = Column(
        JSONB,
        nullable=False,
        server_default="'{}'::jsonb",
        comment="发票详细数据"
    )
    
    # 状态字段
    status = Column(
        String(20),
        nullable=False,
        default=InvoiceStatus.PENDING.value,
        index=True,
        comment="处理状态"
    )
    
    # 金额字段（使用 NUMERIC 类型确保精度）
    amount = Column(
        Numeric(12, 2),
        nullable=False,
        comment="发票金额"
    )
    
    # 标签数组（PostgreSQL 特性）
    tags = Column(
        ARRAY(String),
        server_default="'{}'::text[]",
        comment="标签列表"
    )
    
    # 关联字段
    email_task_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("email_processing_task.id"),
        nullable=True,
        index=True,
        comment="关联的邮件任务 ID"
    )
    
    # 文件路径
    file_path = Column(
        String(500),
        nullable=True,
        comment="文件存储路径"
    )
    
    # 使用 GIN 索引优化 JSONB 查询（Supabase 推荐）
    __table_args__ = (
        Index('idx_invoice_data_gin', 'invoice_data', postgresql_using='gin'),
        Index('idx_tags_gin', 'tags', postgresql_using='gin'),
        # 复合索引
        Index('idx_user_status', 'user_id', 'status'),
        # 检查约束
        CheckConstraint('amount >= 0', name='check_amount_positive'),
    )
    
    # 关系定义
    email_task = relationship("EmailProcessingTask", back_populates="invoices")
    
    # 计算属性
    @property
    def is_processed(self) -> bool:
        """是否已处理完成"""
        return self.status == InvoiceStatus.COMPLETED.value
    
    @property
    def seller_name(self) -> Optional[str]:
        """从 JSONB 中提取卖方名称"""
        return self.invoice_data.get("seller", {}).get("name")
    
    # 业务方法
    def update_status(self, new_status: InvoiceStatus) -> None:
        """更新状态并记录时间"""
        self.status = new_status.value
        if new_status == InvoiceStatus.PROCESSING:
            self.started_at = datetime.utcnow()
        elif new_status == InvoiceStatus.COMPLETED:
            self.completed_at = datetime.utcnow()


class UserProfile(Base, AuditMixin):
    """
    用户配置文件模型
    
    展示如何扩展 Supabase auth.users
    """
    
    # 关联到 Supabase Auth
    auth_user_id = Column(
        PGUUID(as_uuid=True),
        # ForeignKey("auth.users.id"),
        unique=True,
        nullable=False,
        index=True,
        comment="Supabase Auth 用户 ID"
    )
    
    # 用户信息
    display_name = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    
    # 偏好设置（JSONB）
    preferences = Column(
        JSONB,
        server_default="'{}'::jsonb",
        nullable=False,
        comment="用户偏好设置"
    )
    
    # 统计信息
    total_invoices = Column(
        Integer,
        server_default="0",
        nullable=False,
        comment="发票总数"
    )
    
    # 订阅状态
    is_premium = Column(
        Boolean,
        server_default="false",
        nullable=False,
        comment="是否为高级用户"
    )
    
    # 使用部分索引（PostgreSQL 特性）
    __table_args__ = (
        # 只为高级用户创建索引
        Index('idx_premium_users', 'auth_user_id', 
              postgresql_where='is_premium = true'),
    )


# 创建数据库视图的示例（Supabase 推荐用于复杂查询）
INVOICE_SUMMARY_VIEW = """
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
    i.user_id,
    DATE_TRUNC('month', i.created_at) as month,
    COUNT(*) as invoice_count,
    SUM(i.amount) as total_amount,
    COUNT(*) FILTER (WHERE i.status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE i.status = 'failed') as failed_count
FROM invoice i
WHERE i.deleted_at IS NULL
GROUP BY i.user_id, DATE_TRUNC('month', i.created_at);
"""

# Row Level Security (RLS) 策略示例
RLS_POLICIES = """
-- 启用 RLS
ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- Invoice 表的 RLS 策略
CREATE POLICY "Users can view own invoices" ON invoice
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoice
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoice
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoice
    FOR DELETE USING (auth.uid() = user_id);

-- UserProfile 表的 RLS 策略
CREATE POLICY "Users can view own profile" ON user_profile
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile" ON user_profile
    FOR UPDATE USING (auth.uid() = auth_user_id);
"""