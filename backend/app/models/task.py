"""
邮件处理任务模型

跟踪邮件处理的异步任务状态，支持任务重试和监控。
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from uuid import UUID
from enum import Enum

from sqlalchemy import (
    Column, String, Text, Integer, Numeric, DateTime, ForeignKey, Index, CheckConstraint, text, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB
from sqlalchemy.orm import relationship, foreign

from app.models.base import Base, BaseModel, UserOwnedMixin, TimestampMixin, AuditMixin


class TaskType(str, Enum):
    """任务类型"""
    EMAIL_INVOICE = "email_invoice"
    BATCH_IMPORT = "batch_import"
    OCR_RETRY = "ocr_retry"


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class EmailProcessingTask(Base, BaseModel, UserOwnedMixin, TimestampMixin, AuditMixin):
    """邮件处理任务模型"""
    
    __tablename__ = "email_processing_tasks"
    
    # 任务信息
    task_type = Column(
        SAEnum(TaskType, name="task_type_enum", native_enum=True),
        nullable=False,
        server_default=TaskType.EMAIL_INVOICE.value,
        comment="任务类型"
    )
    
    task_id = Column(
        String(100),
        nullable=True,
        index=True,
        comment="任务 ID"
    )
    
    # 状态管理
    status = Column(
        SAEnum(TaskStatus, name="task_status_enum", native_enum=True),
        nullable=False,
        server_default=TaskStatus.PENDING.value,
        index=True,
        comment="任务状态"
    )
    
    # 任务数据
    task_data = Column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
        comment="任务输入数据"
    )
    
    result_data = Column(
        JSONB,
        nullable=True,
        server_default=text("'{}'::jsonb"),
        comment="任务结果数据"
    )
    
    # 错误处理
    error_message = Column(
        Text,
        nullable=True,
        comment="错误消息"
    )
    
    error_details = Column(
        JSONB,
        nullable=True,
        comment="错误详情"
    )
    
    retry_count = Column(
        Integer,
        nullable=False,
        server_default=text("0"),
        comment="重试次数"
    )
    
    max_retries = Column(
        Integer,
        nullable=False,
        server_default=text("3"),
        comment="最大重试次数"
    )
    
    next_retry_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="下次重试时间"
    )
    
    # 邮件信息
    email_message_id = Column(
        String(200),
        nullable=True,
        comment="邮件消息 ID"
    )
    
    email_from = Column(
        String(200),
        nullable=True,
        comment="发件人"
    )
    
    email_subject = Column(
        String(500),
        nullable=True,
        comment="邮件主题"
    )
    
    email_received_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="邮件接收时间"
    )
    
    # 处理统计
    attachments_count = Column(
        Integer,
        nullable=True,
        server_default=text("0"),
        comment="附件数量"
    )
    
    processed_count = Column(
        Integer,
        nullable=True,
        server_default=text("0"),
        comment="已处理数量"
    )
    
    failed_count = Column(
        Integer,
        nullable=True,
        server_default=text("0"),
        comment="失败数量"
    )
    
    invoices_created = Column(
        Integer,
        nullable=True,
        server_default=text("0"),
        comment="创建的发票数"
    )
    
    # 执行信息
    processing_time_seconds = Column(
        Numeric(10, 3),
        nullable=True,
        comment="处理时间（秒）"
    )
    
    # 关系 (由于移除了外键约束，需要使用 foreign() 注解)
    profile = relationship(
        "Profile",
        primaryjoin="foreign(EmailProcessingTask.user_id) == Profile.auth_user_id",
        back_populates="email_tasks",
        uselist=False,
        lazy="joined"
    )
    invoices = relationship("Invoice", back_populates="email_task", lazy="dynamic")
    
    # 约束和索引
    __table_args__ = (
        CheckConstraint('retry_count >= 0', name='chk_retry_count'),
        CheckConstraint('processed_count >= 0', name='chk_processed_count'),
        CheckConstraint('failed_count >= 0', name='chk_failed_count'),
        CheckConstraint('invoices_created >= 0', name='chk_invoices_created'),
        Index('idx_email_tasks_user_status', 'user_id', 'status',
              postgresql_where='deleted_at IS NULL'),
        Index('idx_email_tasks_retry', 'status', 'next_retry_at',
              postgresql_where="status = 'failed' AND retry_count < max_retries AND deleted_at IS NULL"),
        Index('idx_email_tasks_task_data_gin', 'task_data',
              postgresql_using='gin'),
    )
    
    # 属性方法
    @property
    def is_completed(self) -> bool:
        """是否已完成"""
        return self.status == TaskStatus.COMPLETED.value
    
    @property
    def is_failed(self) -> bool:
        """是否失败"""
        return self.status == TaskStatus.FAILED.value
    
    @property
    def can_retry(self) -> bool:
        """是否可以重试"""
        return (
            self.status == TaskStatus.FAILED.value and
            self.retry_count < self.max_retries
        )
    
    @property
    def success_rate(self) -> Optional[float]:
        """成功率"""
        if self.processed_count == 0:
            return None
        return (self.processed_count - self.failed_count) / self.processed_count
    
    # 业务方法
    def start_processing(self, task_id: Optional[str] = None) -> None:
        """开始处理"""
        self.status = TaskStatus.PROCESSING.value
        self.started_at = datetime.now(timezone.utc)
        if task_id:
            self.task_id = task_id
    
    def complete_processing(self, result: Dict[str, Any]) -> None:
        """完成处理"""
        self.status = TaskStatus.COMPLETED.value
        self.completed_at = datetime.now(timezone.utc)
        self.result_data = result
        
        # 计算处理时间
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.processing_time_seconds = delta.total_seconds()
        
        # 更新统计信息
        summary = result.get("summary", {})
        self.processed_count = summary.get("processed", 0)
        self.failed_count = summary.get("failed", 0)
        self.invoices_created = summary.get("invoices_created", 0)
    
    def fail_processing(self, error: Exception, details: Optional[Dict] = None) -> None:
        """标记处理失败"""
        self.status = TaskStatus.FAILED.value
        self.completed_at = datetime.now(timezone.utc)
        self.error_message = str(error)
        
        if details:
            self.error_details = details
        else:
            self.error_details = {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        # 计算处理时间
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.processing_time_seconds = delta.total_seconds()
    
    def schedule_retry(self, delay_seconds: int = 300) -> None:
        """安排重试"""
        if not self.can_retry:
            raise ValueError("Task cannot be retried")
        
        self.retry_count += 1
        self.status = TaskStatus.RETRYING.value
        self.next_retry_at = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
    
    def cancel(self) -> None:
        """取消任务"""
        if self.status in [TaskStatus.COMPLETED.value, TaskStatus.CANCELLED.value]:
            raise ValueError("Cannot cancel completed or already cancelled task")
        
        self.status = TaskStatus.CANCELLED.value
        self.completed_at = datetime.now(timezone.utc)
    
    def add_invoice(self, invoice_id: UUID) -> None:
        """添加创建的发票 ID"""
        invoices = self.result_data.get("invoices", [])
        invoices.append({"id": str(invoice_id)})
        self.result_data["invoices"] = invoices
        self.invoices_created = len(invoices)
    
    def __repr__(self) -> str:
        """对象表示"""
        return f"<EmailProcessingTask(id={self.id}, status={self.status}, email_from={self.email_from})>"