"""
邮件索引模型
用于本地存储邮件元数据，支持高效搜索
"""
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, UniqueConstraint, Index, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid

from app.models.base import Base, TimestampMixin


class EmailIndex(Base):
    """邮件索引表"""
    
    __tablename__ = "email_index"
    
    # 主键
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 关联字段
    account_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # 邮件标识
    uid = Column(Integer, nullable=False)
    folder_name = Column(String(255), nullable=False, default='INBOX')
    
    # 邮件元数据
    subject = Column(Text)
    from_address = Column(String(255))
    to_address = Column(String(255))
    email_date = Column(DateTime(timezone=True), nullable=False, index=True)
    message_id = Column(String(500))
    
    # 附件信息
    has_attachments = Column(Boolean, default=False)
    attachment_count = Column(Integer, default=0)
    attachment_names = Column(ARRAY(String), default=[])
    
    # 标记
    flags = Column(ARRAY(String), default=[])
    
    # 索引
    __table_args__ = (
        UniqueConstraint('account_id', 'folder_name', 'uid', name='uq_email_index_account_folder_uid'),
        Index('idx_email_index_date', 'account_id', 'email_date'),
        Index('idx_email_index_subject', 'account_id', 'subject'),
    )


class EmailSyncState(Base):
    """邮件同步状态表"""
    
    __tablename__ = "email_sync_state"
    
    # 主键
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 关联字段
    account_id = Column(UUID(as_uuid=True), nullable=False)
    folder_name = Column(String(255), nullable=False, default='INBOX')
    
    # 同步配置
    sync_mode = Column(String(50), nullable=False, default='never_synced')  # never_synced, full_sync_needed, full_sync_in_progress, incremental
    sync_start_date = Column(DateTime(timezone=True))
    
    # 同步状态
    last_sync_uid = Column(Integer, default=0)
    last_full_sync_time = Column(DateTime(timezone=True))
    last_incremental_sync_time = Column(DateTime(timezone=True))
    
    # 统计信息
    total_emails_indexed = Column(Integer, default=0)
    
    # 索引
    __table_args__ = (
        UniqueConstraint('account_id', 'folder_name', name='uq_sync_state_account_folder'),
    )