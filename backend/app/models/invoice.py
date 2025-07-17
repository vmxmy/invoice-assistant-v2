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
    ACTIVE = "active"
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
    amount_without_tax = Column(
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
    
    consumption_date = Column(
        Date,
        nullable=True,  # 可选字段，但会有默认值
        index=True,
        comment="消费日期（实际消费/服务发生的日期）"
    )
    
    # 交易方信息
    seller_name = Column(
        String(200),
        nullable=True,
        index=True,
        comment="销售方名称"
    )
    
    seller_tax_number = Column(
        String(50),
        nullable=True,
        comment="销售方纳税人识别号"
    )
    
    buyer_name = Column(
        String(200),
        nullable=True,
        comment="购买方名称"
    )
    
    buyer_tax_number = Column(
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
        String(1000),
        nullable=True,
        comment="文件访问 URL"
    )
    
    file_size = Column(
        Integer,
        nullable=True,
        comment="文件大小（字节）"
    )
    
    file_name = Column(
        String(255),
        nullable=True,
        comment="原始文件名"
    )
    
    file_hash = Column(
        String(64),
        nullable=True,
        comment="文件哈希值"
    )
    
    ocr_confidence_score = Column(
        Numeric(4, 3),
        nullable=True,
        comment="OCR识别置信度（0-1）"
    )
    
    # 新增：增强的置信度管理字段
    ocr_field_confidences = Column(
        JSONB,
        nullable=True,
        comment="OCR字段级置信度信息"
    )
    
    ocr_overall_confidence = Column(
        Numeric(4, 3),
        nullable=True,
        comment="OCR整体置信度 (0-1)"
    )
    
    ocr_processing_metadata = Column(
        JSONB,
        nullable=True,
        server_default=text("'{}'::jsonb"),
        comment="OCR处理元数据"
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
    
    # 备注信息
    remarks = Column(
        Text,
        nullable=True,
        comment="备注信息"
    )
    
    # 用户备注
    notes = Column(
        Text,
        nullable=True,
        comment="用户备注"
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
        lazy="select"  # 改为select避免自动JOIN导致重复记录
    )
    email_task = relationship("EmailProcessingTask", back_populates="invoices")
    
    # 约束和索引
    __table_args__ = (
        CheckConstraint('amount >= 0', name='chk_amount_positive'),
        CheckConstraint('tax_amount >= 0', name='chk_tax_amount_positive'),
        CheckConstraint('total_amount >= 0', name='chk_total_amount_positive'),
        Index('uk_invoice_number_user_active', 'invoice_number', 'user_id',
              unique=True, postgresql_where='deleted_at IS NULL'),
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
    def amount(self) -> float:
        """金额（为了API兼容性）"""
        return float(self.amount_without_tax or 0)
    
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
    
    @property
    def confidence_summary(self) -> Dict[str, Any]:
        """获取置信度汇总信息"""
        return {
            "overall": float(self.ocr_overall_confidence or 0),
            "field_count": len(self.ocr_field_confidences or {}),
            "low_confidence_fields": [
                field for field, conf in (self.ocr_field_confidences or {}).items()
                if conf.get("value_confidence", 100) < 80
            ],
            "processing_metadata": self.ocr_processing_metadata or {}
        }
    
    @property
    def requires_manual_review(self) -> bool:
        """是否需要人工审核（基于置信度）"""
        if not self.ocr_overall_confidence:
            return True
        return float(self.ocr_overall_confidence) < 0.85
    
    # 业务方法
    
    def update_from_ocr(self, ocr_result: Dict[str, Any]) -> None:
        """从 OCR 结果更新发票信息 - 仅支持阿里云RecognizeMixedInvoices格式"""
        # 保存原始OCR结果
        self.extracted_data = ocr_result
        
        # 检测并处理阿里云混贴格式
        if self._is_aliyun_mixed_format(ocr_result):
            self._process_aliyun_mixed_ocr(ocr_result)
        else:
            # 不支持的格式
            self.ocr_processing_metadata = {
                "error": "Unsupported OCR format. Only Aliyun RecognizeMixedInvoices format is supported.",
                "raw_keys": list(ocr_result.keys()) if isinstance(ocr_result, dict) else "invalid",
                "service_provider": "Unknown"
            }
    
    def _is_aliyun_mixed_format(self, ocr_result: Dict[str, Any]) -> bool:
        """检测是否为阿里云RecognizeMixedInvoices格式"""
        return (
            "data" in ocr_result and 
            "elements" in ocr_result.get("data", {}) and
            isinstance(ocr_result["data"]["elements"], list)
        )
    
    
    def _process_aliyun_mixed_ocr(self, ocr_result: Dict[str, Any]) -> None:
        """处理阿里云RecognizeMixedInvoices格式的OCR数据"""
        try:
            data = ocr_result.get("data", {})
            elements = data.get("elements", [])
            
            if not elements:
                self.ocr_processing_metadata = {
                    "error": "No invoice elements found in recognition result",
                    "service_provider": "Aliyun_RecognizeMixedInvoices"
                }
                return
            
            # 取第一个识别到的发票
            first_invoice = elements[0]
            invoice_type = first_invoice.get('type', '')
            fields = first_invoice.get('fields', {})
            
            # 根据发票类型处理数据
            if '增值税' in invoice_type or 'VAT' in invoice_type.upper():
                self._map_aliyun_vat_invoice_fields(fields)
                self.invoice_type = "增值税发票"
            elif '火车票' in invoice_type or 'TRAIN' in invoice_type.upper():
                self._map_aliyun_train_ticket_fields(fields)
                self.invoice_type = "火车票"
            else:
                self._map_aliyun_general_invoice_fields(fields)
                self.invoice_type = invoice_type or "通用发票"
            
            # 提取和存储置信度信息
            self._extract_aliyun_mixed_confidences(fields)
            
            # 存储处理元数据
            self.ocr_processing_metadata = {
                "service_provider": "Aliyun_RecognizeMixedInvoices",
                "processing_time": datetime.now(timezone.utc).isoformat(),
                "invoice_type": invoice_type,
                "elements_count": len(elements),
                "recognition_result": "success"
            }
            
        except (KeyError, IndexError, TypeError) as e:
            # 处理格式错误，记录但不中断
            self.ocr_processing_metadata = {
                "error": f"Aliyun Mixed OCR format error: {str(e)}",
                "raw_keys": list(ocr_result.keys()) if isinstance(ocr_result, dict) else "invalid",
                "service_provider": "Aliyun_RecognizeMixedInvoices"
            }
    
    
    def _map_aliyun_vat_invoice_fields(self, fields: Dict[str, Any]) -> None:
        """映射阿里云混贴识别的增值税发票字段"""
        # 基础信息映射
        self.invoice_number = self._get_field_text(fields, "invoiceNumber")
        self.invoice_code = self._get_field_text(fields, "invoiceCode")
        
        # 日期转换
        invoice_date_str = self._get_field_text(fields, "invoiceDate")
        if invoice_date_str:
            self.invoice_date = self._parse_chinese_date(invoice_date_str)
        
        # 金额转换
        self.total_amount = self._safe_decimal(self._get_field_text(fields, "totalAmount"))
        self.tax_amount = self._safe_decimal(self._get_field_text(fields, "invoiceTax"))
        self.amount_without_tax = self._safe_decimal(self._get_field_text(fields, "invoiceAmountPreTax"))
        
        # 交易方信息
        self.seller_name = self._get_field_text(fields, "sellerName")
        self.seller_tax_number = self._get_field_text(fields, "sellerTaxNumber")
        self.buyer_name = self._get_field_text(fields, "purchaserName")
        self.buyer_tax_number = self._get_field_text(fields, "purchaserTaxNumber")
        
        # 备注
        self.remarks = self._get_field_text(fields, "remarks")
    
    def _map_aliyun_train_ticket_fields(self, fields: Dict[str, Any]) -> None:
        """映射阿里云混贴识别的火车票字段"""
        # 使用票号作为发票号
        self.invoice_number = self._get_field_text(fields, "ticketNumber")
        
        # 日期转换
        invoice_date_str = self._get_field_text(fields, "invoiceDate")
        if invoice_date_str:
            self.invoice_date = self._parse_chinese_date(invoice_date_str)
        
        # 使用票价作为总金额
        self.total_amount = self._safe_decimal(self._get_field_text(fields, "fare"))
        self.amount_without_tax = self.total_amount  # 火车票通常不含税
        self.tax_amount = Decimal("0")
        
        # 交易方信息 - 火车票的特殊处理
        self.buyer_name = self._get_field_text(fields, "buyerName")
        self.buyer_tax_number = self._get_field_text(fields, "buyerCreditCode")
        self.seller_name = "中国铁路"  # 默认销售方
    
    def _map_aliyun_general_invoice_fields(self, fields: Dict[str, Any]) -> None:
        """映射阿里云混贴识别的通用发票字段"""
        # 基础信息映射
        self.invoice_number = self._get_field_text(fields, "invoiceNumber")
        
        # 日期转换
        invoice_date_str = self._get_field_text(fields, "invoiceDate")
        if invoice_date_str:
            self.invoice_date = self._parse_chinese_date(invoice_date_str)
        
        # 金额转换
        self.total_amount = self._safe_decimal(self._get_field_text(fields, "totalAmount"))
        self.amount_without_tax = self.total_amount  # 通用发票通常不区分含税不含税
        self.tax_amount = Decimal("0")
        
        # 交易方信息
        self.seller_name = self._get_field_text(fields, "sellerName")
        self.buyer_name = self._get_field_text(fields, "buyerName")
    
    def _get_field_text(self, fields: Dict[str, Any], field_name: str) -> str:
        """从阿里云字段结构中提取文本值"""
        field_data = fields.get(field_name, {})
        if isinstance(field_data, dict):
            return field_data.get('text', '') or field_data.get('value', '')
        return str(field_data) if field_data else ''
    
    def _extract_aliyun_mixed_confidences(self, fields: Dict[str, Any]) -> None:
        """提取阿里云混贴识别的字段置信度信息"""
        field_confidences = {}
        confidence_scores = []
        
        for field_name, field_data in fields.items():
            if isinstance(field_data, dict):
                confidence = field_data.get('confidence', 0)
                if confidence > 0:
                    field_confidences[field_name] = {
                        "key_confidence": 100,  # 阿里云通常不分离key和value置信度
                        "value_confidence": confidence
                    }
                    confidence_scores.append(confidence / 100.0)
        
        # 存储字段级置信度
        self.ocr_field_confidences = field_confidences
        
        # 计算整体置信度
        if confidence_scores:
            self.ocr_overall_confidence = sum(confidence_scores) / len(confidence_scores)
            # 同时更新旧字段以保持兼容性
            self.ocr_confidence_score = self.ocr_overall_confidence
        
    def _parse_chinese_date(self, date_str: str) -> Optional[date]:
        """解析中文日期格式: 2025年03月26日 → 2025-03-26"""
        if not date_str:
            return None
        
        try:
            import re
            match = re.match(r'(\d{4})年(\d{1,2})月(\d{1,2})日', date_str.strip())
            if match:
                year, month, day = match.groups()
                return date(int(year), int(month), int(day))
        except (ValueError, TypeError):
            pass
        return None
    
    def _safe_decimal(self, value: str) -> Decimal:
        """安全的金额转换"""
        if not value:
            return Decimal("0")
        try:
            # 清理金额格式
            cleaned_value = str(value).replace(",", "").replace("￥", "").strip()
            return Decimal(cleaned_value)
        except (InvalidOperation, ValueError, TypeError):
            return Decimal("0")
    
        
    
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