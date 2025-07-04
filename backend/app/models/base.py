"""
基础模型类

定义所有数据模型的基类，符合 Supabase 最佳实践。
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import Column, DateTime, Integer, func, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import declarative_base, declared_attr, Session

# 创建基类
Base = declarative_base()


class BaseModel:
    """
    所有模型的基础混入类
    
    提供通用字段和方法，符合 Supabase 最佳实践。
    """
    
    @declared_attr
    def __tablename__(cls):
        """
        自动生成表名（使用下划线命名）
        例如：UserProfile -> user_profile
        """
        import re
        name = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', cls.__name__)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', name).lower()
    
    # 主键：使用 UUID（Supabase 推荐）
    id = Column(
        PGUUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        comment="主键 UUID"
    )
    
    # 时间戳字段（带时区）
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    
    # 软删除字段（Supabase 推荐模式）
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="删除时间（软删除）"
    )
    
    # 元数据字段（JSONB 类型）
    metadata = Column(
        JSONB,
        server_default=text("'{}'::jsonb"),
        nullable=False,
        comment="扩展元数据"
    )
    
    def __repr__(self) -> str:
        """对象字符串表示"""
        return f"<{self.__class__.__name__}(id={self.id})>"
    
    def to_dict(self, exclude: Optional[set] = None) -> Dict[str, Any]:
        """
        转换为字典
        
        Args:
            exclude: 要排除的字段集合
            
        Returns:
            模型数据字典
        """
        exclude = exclude or set()
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
            if column.name not in exclude
        }
    
    @classmethod
    def exists(cls, session: Session, **kwargs) -> bool:
        """
        检查记录是否存在
        
        Args:
            session: 数据库会话
            **kwargs: 查询条件
            
        Returns:
            是否存在
        """
        return session.query(
            session.query(cls).filter_by(**kwargs).exists()
        ).scalar()
    
    def soft_delete(self) -> None:
        """软删除"""
        self.deleted_at = datetime.now(timezone.utc)
    
    def restore(self) -> None:
        """恢复软删除的记录"""
        self.deleted_at = None
    
    @property
    def is_deleted(self) -> bool:
        """是否已删除"""
        return self.deleted_at is not None


class TimestampMixin:
    """
    时间戳混入类
    
    为需要更细粒度时间追踪的模型提供额外的时间戳字段。
    """
    
    # 处理时间戳
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="开始处理时间"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="完成时间"
    )
    
    # 最后活动时间
    last_activity_at = Column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="最后活动时间"
    )


class UserOwnedMixin:
    """
    用户所有权混入类
    
    为需要用户所有权的模型提供 user_id 字段。
    用于支持 Supabase Row Level Security (RLS)。
    """
    
    @declared_attr
    def user_id(cls):
        """用户 ID（关联到 Supabase auth.users）"""
        return Column(
            PGUUID(as_uuid=True),
            # 注意：在实际使用时，需要确保 auth schema 存在
            ForeignKey("auth.users.id"),
            nullable=False,
            index=True,
            comment="所属用户 ID"
        )


class AuditMixin:
    """
    审计混入类
    
    为需要审计追踪的模型提供审计字段。
    """
    
    @declared_attr
    def created_by(cls):
        """创建者 ID"""
        return Column(
            PGUUID(as_uuid=True),
            nullable=True,
            comment="创建者 ID"
        )
    
    @declared_attr  
    def updated_by(cls):
        """最后更新者 ID"""
        return Column(
            PGUUID(as_uuid=True),
            nullable=True,
            comment="最后更新者 ID"
        )
    
    # 版本号（用于乐观锁）
    version = Column(
        Integer,
        nullable=False,
        server_default="1",
        comment="版本号"
    )


# Supabase 特定的查询过滤器
class SoftDeleteQuery:
    """软删除查询过滤器"""
    
    @staticmethod
    def filter_active(query):
        """过滤未删除的记录"""
        return query.filter(BaseModel.deleted_at.is_(None))
    
    @staticmethod
    def filter_deleted(query):
        """过滤已删除的记录"""
        return query.filter(BaseModel.deleted_at.isnot(None))