"""
用户邮件地址管理模型
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
from uuid import UUID
from enum import Enum

from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Index, CheckConstraint, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship

from app.models.base import Base, BaseModel, AuditMixin


class EmailAddressType(str, Enum):
    """邮件地址类型"""
    primary = "primary"      # 主要地址
    work = "work"           # 工作地址  
    personal = "personal"   # 个人地址
    temporary = "temporary" # 临时地址
    custom = "custom"       # 自定义地址


class EmailAddressStatus(str, Enum):
    """邮件地址状态"""
    active = "active"           # 激活中
    inactive = "inactive"       # 已停用
    pending = "pending"         # 待激活
    suspended = "suspended"     # 已暂停
    expired = "expired"         # 已过期


class EmailAddress(Base, BaseModel):
    """用户邮件地址模型"""
    
    __tablename__ = "email_addresses"
    
    # 关联字段
    user_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("profiles.auth_user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID"
    )
    
    # 邮件地址信息
    email_address = Column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
        comment="完整邮件地址"
    )
    
    local_part = Column(
        String(64),
        nullable=False,
        index=True,
        comment="邮件地址本地部分 (@ 前面)"
    )
    
    domain = Column(
        String(100),
        nullable=False,
        index=True,
        comment="邮件域名"
    )
    
    # 地址属性
    address_type = Column(
        SAEnum(EmailAddressType, name="email_address_type", native_enum=True),
        nullable=False,
        default=EmailAddressType.primary,
        comment="地址类型"
    )
    
    alias = Column(
        String(50),
        nullable=True,
        comment="地址别名"
    )
    
    description = Column(
        String(200),
        nullable=True,
        comment="地址描述"
    )
    
    # 状态管理
    status = Column(
        SAEnum(EmailAddressStatus, name="email_address_status", native_enum=True),
        nullable=False,
        default=EmailAddressStatus.active,
        index=True,
        comment="地址状态"
    )
    
    is_default = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="是否为默认地址"
    )
    
    # 使用统计
    total_emails_received = Column(
        Integer,
        nullable=False,
        default=0,
        comment="接收邮件总数"
    )
    
    last_email_received_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后接收邮件时间"
    )
    
    # 配置选项
    config = Column(
        JSONB,
        nullable=False,
        server_default="'{}'::jsonb",
        comment="地址配置选项"
    )
    
    # 有效期管理
    expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="地址过期时间"
    )
    
    # 安全选项
    allowed_senders = Column(
        JSONB,
        nullable=False,
        server_default="'[]'::jsonb",
        comment="允许的发件人列表"
    )
    
    # 关系定义
    profile = relationship(
        "Profile",
        back_populates="email_addresses"
    )
    
    # 注释掉这个关系，因为Invoice模型中没有email_address_id字段
    # invoices = relationship(
    #     "Invoice", 
    #     back_populates="email_address",
    #     lazy="dynamic"
    # )
    
    # 表约束
    __table_args__ = (
        # 索引
        Index('idx_email_addresses_user_status', 'user_id', 'status'),
        Index('idx_email_addresses_type', 'address_type'),
        Index('idx_email_addresses_domain', 'domain'),
        Index('idx_email_addresses_config_gin', 'config', postgresql_using='gin'),
        
        # 约束
        CheckConstraint(
            "email_address ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'",
            name='valid_email_format'
        ),
        CheckConstraint(
            "address_type IN ('primary', 'work', 'personal', 'temporary', 'custom')",
            name='valid_address_type'
        ),
        CheckConstraint(
            "status IN ('active', 'inactive', 'pending', 'suspended', 'expired')",
            name='valid_status'
        ),
        CheckConstraint(
            "total_emails_received >= 0",
            name='non_negative_email_count'
        ),
    )
    
    # 属性方法
    @property
    def is_active(self) -> bool:
        """检查地址是否激活"""
        if self.status != EmailAddressStatus.active.value:
            return False
        if self.expires_at and self.expires_at <= datetime.now(timezone.utc):
            return False
        return True
    
    @property
    def is_expired(self) -> bool:
        """检查地址是否过期"""
        if not self.expires_at:
            return False
        return self.expires_at <= datetime.now(timezone.utc)
    
    @property
    def display_name(self) -> str:
        """获取显示名称"""
        if self.alias:
            return f"{self.alias} ({self.email_address})"
        return self.email_address
    
    @property
    def usage_stats(self) -> Dict[str, Any]:
        """获取使用统计"""
        return {
            "total_emails": self.total_emails_received,
            "last_received": self.last_email_received_at.isoformat() if self.last_email_received_at else None,
            "days_since_last": (
                (datetime.now(timezone.utc) - self.last_email_received_at).days
                if self.last_email_received_at else None
            )
        }
    
    # 业务方法
    def increment_email_count(self) -> None:
        """增加邮件接收计数"""
        self.total_emails_received += 1
        self.last_email_received_at = datetime.now(timezone.utc)
    
    def add_allowed_sender(self, sender_email: str) -> None:
        """添加允许的发件人"""
        senders = self.allowed_senders or []
        if sender_email not in senders:
            senders.append(sender_email)
            self.allowed_senders = senders
    
    def remove_allowed_sender(self, sender_email: str) -> None:
        """移除允许的发件人"""
        senders = self.allowed_senders or []
        if sender_email in senders:
            senders.remove(sender_email)
            self.allowed_senders = senders
    
    def is_sender_allowed(self, sender_email: str) -> bool:
        """检查发件人是否被允许"""
        if not self.allowed_senders:
            return True  # 空列表表示允许所有发件人
        return sender_email in self.allowed_senders
    
    def update_config(self, updates: Dict[str, Any]) -> None:
        """更新配置"""
        from app.utils.dict_utils import deep_merge
        self.config = deep_merge(self.config, updates)
    
    def deactivate(self, reason: str = None) -> None:
        """停用地址"""
        self.status = EmailAddressStatus.inactive.value
        if reason:
            self.update_config({"deactivation_reason": reason, "deactivated_at": datetime.now(timezone.utc).isoformat()})
    
    def suspend(self, reason: str = None, until: datetime = None) -> None:
        """暂停地址"""
        self.status = EmailAddressStatus.suspended.value
        config_updates = {"suspension_reason": reason, "suspended_at": datetime.now(timezone.utc).isoformat()}
        if until:
            config_updates["suspended_until"] = until.isoformat()
        self.update_config(config_updates)
    
    def reactivate(self) -> None:
        """重新激活地址"""
        self.status = EmailAddressStatus.active.value
        # 清理暂停/停用相关配置
        config = self.config.copy()
        for key in ["deactivation_reason", "deactivated_at", "suspension_reason", "suspended_at", "suspended_until"]:
            config.pop(key, None)
        config["reactivated_at"] = datetime.now(timezone.utc).isoformat()
        self.config = config
    
    def __repr__(self) -> str:
        """对象表示"""
        return f"<EmailAddress(id={self.id}, email={self.email_address}, type={self.address_type}, status={self.status})>"


# 为了支持现有的Invoice模型，我们需要添加反向关系
# 在invoice.py中添加:
# email_address = relationship("EmailAddress", back_populates="invoices")