"""邮箱扫描任务模型"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base, BaseModel


class EmailScanJob(Base, BaseModel):
    """邮箱扫描任务模型
    
    记录邮箱扫描任务的执行情况和结果
    """
    __tablename__ = "email_scan_jobs"
    
    # 基础字段  
    # id 已由 BaseModel 提供，包含了 server_default=text("gen_random_uuid()")
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    email_account_id = Column(UUID(as_uuid=True), ForeignKey("email_accounts.id"), nullable=False)
    
    # 任务信息
    job_id = Column(String(36), unique=True, nullable=False, comment="任务唯一标识")
    job_type = Column(String(50), default="manual", comment="任务类型: manual(手动), scheduled(定时)")
    
    # 任务状态
    status = Column(String(50), default="pending", nullable=False, comment="任务状态: pending, running, completed, failed, cancelled")
    progress = Column(Integer, default=0, comment="任务进度(0-100)")
    current_step = Column(String(200), comment="当前执行步骤")
    
    # 扫描参数
    scan_params = Column(JSON, default=dict, comment="扫描参数")
    # 包含: 
    # - date_from: 开始日期
    # - date_to: 结束日期
    # - folders: 要扫描的文件夹
    # - subject_keywords: 主题关键词
    # - sender_filters: 发件人过滤
    # - attachment_types: 附件类型过滤
    
    # 扫描结果
    total_emails = Column(Integer, default=0, comment="总邮件数")
    scanned_emails = Column(Integer, default=0, comment="已扫描邮件数")
    matched_emails = Column(Integer, default=0, comment="符合条件的邮件数")
    downloaded_attachments = Column(Integer, default=0, comment="下载的附件数")
    processed_invoices = Column(Integer, default=0, comment="处理的发票数")
    
    # 结果详情
    scan_results = Column(JSON, default=dict, comment="扫描结果详情")
    # 包含:
    # - emails: 扫描到的邮件列表
    # - attachments: 下载的附件列表
    # - invoices: 识别的发票列表
    # - errors: 错误信息列表
    
    # 错误信息
    error_message = Column(Text, comment="错误信息")
    error_details = Column(JSON, comment="错误详情")
    
    # 时间信息
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    # created_at 和 updated_at 已由 BaseModel 提供
    
    # 关系 - 暂时注释掉以解决循环依赖问题
    # email_account = relationship("EmailAccount", back_populates="scan_jobs")
    
    def __repr__(self):
        return f"<EmailScanJob(id={self.id}, job_id={self.job_id}, status={self.status})>"
    
    @property
    def duration_seconds(self) -> Optional[int]:
        """计算任务执行时长（秒）"""
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds())
        return None
    
    @property
    def is_running(self) -> bool:
        """是否正在运行"""
        return self.status == "running"
    
    @property
    def is_completed(self) -> bool:
        """是否已完成"""
        return self.status in ["completed", "failed", "cancelled"]
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "id": self.id,
            "job_id": self.job_id,
            "user_id": self.user_id,
            "email_account_id": self.email_account_id,
            "job_type": self.job_type,
            "status": self.status,
            "progress": self.progress,
            "current_step": self.current_step,
            "scan_params": self.scan_params,
            "total_emails": self.total_emails,
            "scanned_emails": self.scanned_emails,
            "matched_emails": self.matched_emails,
            "downloaded_attachments": self.downloaded_attachments,
            "processed_invoices": self.processed_invoices,
            "scan_results": self.scan_results,
            "error_message": self.error_message,
            "error_details": self.error_details,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self.duration_seconds,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }