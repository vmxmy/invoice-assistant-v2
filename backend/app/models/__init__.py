"""
数据模型模块

包含所有的 SQLAlchemy 数据模型定义。
"""

from app.models.base import Base, BaseModel, TimestampMixin, UserOwnedMixin, AuditMixin
from app.models.profile import Profile
from app.models.invoice import Invoice, InvoiceStatus, ProcessingStatus, InvoiceSource
from app.models.task import EmailProcessingTask, TaskType, TaskStatus
from app.models.email_account import EmailAccount
from app.models.email_scan_job import EmailScanJob
from app.models.email_index import EmailIndex, EmailSyncState

__all__ = [
    # 基础类
    "Base",
    "BaseModel",
    "TimestampMixin",
    "UserOwnedMixin", 
    "AuditMixin",
    
    # 模型类
    "Profile",
    "Invoice",
    "EmailProcessingTask",
    "EmailAccount",
    "EmailScanJob",
    "EmailIndex",
    "EmailSyncState",
    
    # 枚举类
    "InvoiceStatus",
    "ProcessingStatus",
    "InvoiceSource",
    "TaskType",
    "TaskStatus",
]