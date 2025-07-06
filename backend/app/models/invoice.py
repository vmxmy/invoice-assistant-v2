"""
发票模型

系统核心业务模型，存储发票原始信息和 OCR 提取的结构化数据。
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, date, timezone
from decimal import Decimal, InvalidOperation
from enum import Enum
from uuid import UUID

from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, Date, DateTime,
    ForeignKey, Index, CheckConstraint, UniqueConstraint, text, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID, JSONB, ARRAY
from sqlalchemy.orm import relationship, foreign

from app.models.base import Base, BaseModel, UserOwnedMixin, TimestampMixin, AuditMixin


class InvoiceStatus(str, Enum):
    """发票状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class ProcessingStatus(str, Enum):
    """处理状态"""
    WAITING = "WAITING"
    OCR_PROCESSING = "OCR_PROCESSING"
    OCR_COMPLETED = "OCR_COMPLETED"
    OCR_FAILED = "OCR_FAILED"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class InvoiceSource(str, Enum):
    """发票来源"""
    EMAIL = "email"
    UPLOAD = "upload"
    API = "api"


class Invoice(Base, BaseModel, UserOwnedMixin, TimestampMixin, AuditMixin):
    """发票模型"""
    
    __tablename__ = "invoices"
    
    # 关联字段
    email_task_id = Column(
        PGUUID(as_uuid=True),
        ForeignKey("email_processing_tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联的邮件任务 ID"
    )
    
    # 核心字段
    invoice_number = Column(
        String(100),
        nullable=False,
        comment="发票号码"
    )
    
    invoice_code = Column(
        String(50),
        nullable=True,
        comment="发票代码"
    )
    
    invoice_type = Column(
        String(50),
        nullable=True,
        comment="发票类型"
    )
    
    # 状态管理
    status = Column(
        SAEnum(InvoiceStatus, name="invoice_status_enum", native_enum=True),
        nullable=False,
        server_default=InvoiceStatus.PENDING.value,
        index=True,
        comment="发票状态"
    )
    
    processing_status = Column(
        SAEnum(ProcessingStatus, name="processing_status_enum", native_enum=True),
        nullable=True,
        server_default=ProcessingStatus.WAITING.value,
        comment="处理状态"
    )
    
    # 金额信息
    amount = Column(
        Numeric(12, 2),
        nullable=False,
        server_default=text("0"),
        comment="金额（不含税）"
    )
    
    tax_amount = Column(
        Numeric(12, 2),
        nullable=True,
        server_default=text("0"),
        comment="税额"
    )
    
    total_amount = Column(
        Numeric(12, 2),
        nullable=True,
        server_default=text("0"),
        comment="价税合计"
    )
    
    currency = Column(
        String(3),
        nullable=False,
        server_default=text("'CNY'"),
        comment="币种"
    )
    
    # 日期信息
    invoice_date = Column(
        Date,
        nullable=False,
        index=True,
        comment="开票日期"
    )
    
    # 交易方信息
    seller_name = Column(
        String(200),
        nullable=True,
        index=True,
        comment="销售方名称"
    )
    
    seller_tax_id = Column(
        String(50),
        nullable=True,
        comment="销售方纳税人识别号"
    )
    
    buyer_name = Column(
        String(200),
        nullable=True,
        comment="购买方名称"
    )
    
    buyer_tax_id = Column(
        String(50),
        nullable=True,
        comment="购买方纳税人识别号"
    )
    
    # OCR 数据
    extracted_data = Column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
        comment="OCR 提取的完整数据"
    )
    
    # 文件信息
    file_path = Column(
        String(500),
        nullable=True,
        comment="文件存储路径"
    )
    
    file_url = Column(
        String(500),
        nullable=True,
        comment="文件访问 URL"
    )
    
    file_size = Column(
        Integer,
        nullable=True,
        comment="文件大小（字节）"
    )
    
    file_hash = Column(
        String(64),
        nullable=True,
        comment="文件哈希值"
    )
    
    # 来源信息
    source = Column(
        SAEnum(InvoiceSource, name="invoice_source_enum", native_enum=True),
        nullable=False,
        server_default=InvoiceSource.EMAIL.value,
        comment="发票来源"
    )
    
    source_metadata = Column(
        JSONB,
        nullable=True,
        server_default=text("'{}'::jsonb"),
        comment="来源元数据"
    )
    
    # 验证信息
    is_verified = Column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        comment="是否已验证"
    )
    
    verified_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="验证时间"
    )
    
    verified_by = Column(
        PGUUID(as_uuid=True),
        nullable=True,
        comment="验证人"
    )
    
    verification_notes = Column(
        Text,
        nullable=True,
        comment="验证备注"
    )
    
    # 标签和分类
    tags = Column(
        ARRAY(String),
        nullable=False,
        server_default=text("'{}'::text[]"),
        comment="标签"
    )
    
    category = Column(
        String(50),
        nullable=True,
        comment="分类"
    )
    
    # 关系 (由于移除了外键约束，需要使用 foreign() 注解)
    profile = relationship(
        "Profile",
        primaryjoin="foreign(Invoice.user_id) == Profile.auth_user_id",
        back_populates="invoices",
        uselist=False,
        lazy="joined"
    )
    email_task = relationship("EmailProcessingTask", back_populates="invoices")
    
    # 约束和索引
    __table_args__ = (
        UniqueConstraint('invoice_number', 'user_id', name='uk_invoice_number_user'),
        CheckConstraint('amount >= 0', name='chk_amount_positive'),
        CheckConstraint('tax_amount >= 0', name='chk_tax_amount_positive'),
        CheckConstraint('total_amount >= 0', name='chk_total_amount_positive'),
        Index('idx_invoices_user_status', 'user_id', 'status',
              postgresql_where='deleted_at IS NULL'),
        Index('idx_invoices_user_date', 'user_id', 'invoice_date',
              postgresql_where='deleted_at IS NULL'),
        Index('idx_invoices_extracted_data_gin', 'extracted_data',
              postgresql_using='gin'),
        Index('idx_invoices_tags_gin', 'tags',
              postgresql_using='gin'),
    )
    
    # 属性方法
    @property
    def is_processed(self) -> bool:
        """是否已处理"""
        return self.status == InvoiceStatus.COMPLETED.value
    
    @property
    def needs_review(self) -> bool:
        """是否需要人工审核"""
        return self.processing_status == ProcessingStatus.MANUAL_REVIEW.value
    
    @property
    def ocr_confidence(self) -> Optional[float]:
        """OCR 整体置信度"""
        scores = self.extracted_data.get("confidence_scores", {})
        return scores.get("overall")
    
    @property
    def items(self) -> List[Dict[str, Any]]:
        """获取明细项目"""
        structured = self.extracted_data.get("structured_data", {})
        return structured.get("items", [])
    
    # 业务方法
    def update_from_ocr(self, ocr_result: Dict[str, Any]) -> None:
        """从 OCR 结果更新发票信息"""
        self.extracted_data = ocr_result
        
        # 提取结构化数据
        structured = ocr_result.get("structured_data", {})
        main_info = structured.get("main_info", {})
        buyer_info = structured.get("buyer_info", {})
        seller_info = structured.get("seller_info", {})
        summary = structured.get("summary", {})
        
        # 更新基本字段
        if main_info.get("invoice_code"):
            self.invoice_code = main_info.get("invoice_code")
        if main_info.get("invoice_number"):
            self.invoice_number = main_info.get("invoice_number")
        
        # 安全的日期转换
        invoice_date_str = main_info.get("invoice_date")
        if invoice_date_str:
            try:
                self.invoice_date = datetime.strptime(invoice_date_str, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                # 保持原值或记录错误
                pass
        
        # 安全的金额转换
        if summary.get("amount") is not None:
            try:
                self.amount = Decimal(str(summary["amount"]))
            except (InvalidOperation, ValueError, TypeError):
                # 保持原值
                pass
        
        if summary.get("tax_amount") is not None:
            try:
                self.tax_amount = Decimal(str(summary["tax_amount"]))
            except (InvalidOperation, ValueError, TypeError):
                pass
                
        if summary.get("total_amount") is not None:
            try:
                self.total_amount = Decimal(str(summary["total_amount"]))
            except (InvalidOperation, ValueError, TypeError):
                pass
        
        # 更新交易方信息
        if buyer_info.get("name"):
            self.buyer_name = buyer_info.get("name")
        if buyer_info.get("tax_id"):
            self.buyer_tax_id = buyer_info.get("tax_id")
        if seller_info.get("name"):
            self.seller_name = seller_info.get("name")
        if seller_info.get("tax_id"):
            self.seller_tax_id = seller_info.get("tax_id")
        
        # 更新状态
        self.processing_status = ProcessingStatus.OCR_COMPLETED.value
        self.status = InvoiceStatus.COMPLETED.value
    
    def mark_as_verified(self, user_id: UUID, notes: Optional[str] = None) -> None:
        """标记为已验证"""
        self.is_verified = True
        self.verified_at = datetime.now(timezone.utc)
        self.verified_by = user_id
        if notes:
            self.verification_notes = notes
    
    def add_tags(self, tags: List[str]) -> None:
        """添加标签"""
        current_tags = set(self.tags or [])
        current_tags.update(tags)
        self.tags = list(current_tags)
    
    def remove_tags(self, tags: List[str]) -> None:
        """移除标签"""
        current_tags = set(self.tags or [])
        for tag in tags:
            current_tags.discard(tag)
        self.tags = list(current_tags)
    
    def __repr__(self) -> str:
        """对象表示"""
        return f"<Invoice(id={self.id}, invoice_number={self.invoice_number}, amount={self.total_amount})>"