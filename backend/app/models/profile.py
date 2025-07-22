"""
用户档案模型

扩展 Supabase Auth 用户信息，存储用户个性化设置和业务数据。
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, date, timezone
from uuid import UUID

from sqlalchemy import Column, String, Text, Boolean, Integer, Date, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship, foreign

from app.models.base import Base, BaseModel, AuditMixin


class Profile(Base, BaseModel, AuditMixin):
    """用户档案模型"""
    
    __tablename__ = "profiles"
    
    # 关联字段
    auth_user_id = Column(
        PGUUID(as_uuid=True),
        # ForeignKey("auth.users.id", ondelete="CASCADE"),  # 注释掉以避免测试环境问题
        unique=True,
        nullable=False,
        index=True,
        comment="Supabase Auth 用户 ID"
    )
    
    # 基本信息
    display_name = Column(String(100), nullable=True, comment="显示名称")
    avatar_url = Column(String(500), nullable=True, comment="头像 URL")
    bio = Column(Text, nullable=True, comment="个人简介")
    
    # 配置信息
    preferences = Column(
        JSONB,
        nullable=False,
        server_default="'{}'::jsonb",
        comment="用户偏好设置"
    )
    
    email_config = Column(
        JSONB,
        nullable=False,
        server_default="'{}'::jsonb",
        comment="邮件处理配置"
    )
    
    # 统计信息
    total_invoices = Column(
        Integer,
        nullable=False,
        server_default="0",
        comment="发票总数"
    )
    
    last_invoice_date = Column(
        Date,
        nullable=True,
        comment="最后发票日期"
    )
    
    # 账户状态
    is_active = Column(
        Boolean,
        nullable=False,
        server_default="true",
        index=True,
        comment="是否激活"
    )
    
    is_premium = Column(
        Boolean,
        nullable=False,
        server_default="false",
        comment="是否高级用户"
    )
    
    premium_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="高级用户过期时间"
    )
    
    # 关系 (由于移除了外键约束，需要使用 foreign() 注解)
    invoices = relationship(
        "Invoice",
        primaryjoin="Profile.auth_user_id == foreign(Invoice.user_id)",
        back_populates="profile",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    email_tasks = relationship(
        "EmailProcessingTask",
        primaryjoin="Profile.auth_user_id == foreign(EmailProcessingTask.user_id)",
        back_populates="profile", 
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    # email_addresses = relationship(
    #     "EmailAddress",
    #     primaryjoin="Profile.auth_user_id == foreign(EmailAddress.user_id)",
    #     back_populates="profile",
    #     lazy="dynamic",
    #     cascade="all, delete-orphan"
    # )
    # email_accounts = relationship(
    #     "EmailAccount",
    #     primaryjoin="Profile.auth_user_id == foreign(EmailAccount.user_id)",
    #     back_populates="profile",
    #     lazy="dynamic",
    #     cascade="all, delete-orphan"
    # )
    
    # 索引定义
    __table_args__ = (
        Index('idx_profiles_is_active', 'is_active', 
              postgresql_where='deleted_at IS NULL'),
        Index('idx_profiles_preferences_gin', 'preferences',
              postgresql_using='gin'),
        Index('idx_profiles_email_config_gin', 'email_config',
              postgresql_using='gin'),
    )
    
    # 属性方法
    @property
    def is_premium_active(self) -> bool:
        """检查高级用户是否有效"""
        if not self.is_premium:
            return False
        if not self.premium_expires_at:
            return True
        return self.premium_expires_at > datetime.now(timezone.utc)
    
    @property
    def forward_email(self) -> Optional[str]:
        """获取主要转发邮箱"""
        addresses = self.email_config.get("forward_addresses", [])
        for addr in addresses:
            if addr.get("is_active"):
                return addr.get("email")
        return None
    
    @property
    def notification_settings(self) -> Dict[str, bool]:
        """获取通知设置"""
        return self.preferences.get("notifications", {})
    
    # 业务方法
    def update_preferences(self, updates: Dict[str, Any]) -> None:
        """更新偏好设置（深度合并）"""
        from app.utils.dict_utils import deep_merge
        self.preferences = deep_merge(self.preferences, updates)
    
    def add_forward_email(self, email: str) -> None:
        """添加转发邮箱"""
        addresses = self.email_config.get("forward_addresses", [])
        addresses.append({
            "email": email,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        self.email_config["forward_addresses"] = addresses
    
    def increment_invoice_count(self) -> None:
        """增加发票计数"""
        self.total_invoices += 1
        self.last_invoice_date = date.today()
    
    def __repr__(self) -> str:
        """对象表示"""
        return f"<Profile(id={self.id}, auth_user_id={self.auth_user_id}, display_name={self.display_name})>"