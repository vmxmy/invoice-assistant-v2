"""
基础发票模型

统一的发票数据结构，支持所有发票类型（增值税发票、火车票等）
采用核心字段 + 扩展字段的混合模式
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, Field


class InvoiceType(str, Enum):
    """发票类型枚举"""
    VAT_INVOICE = "增值税发票"
    TRAIN_TICKET = "火车票"
    FLIGHT_TICKET = "机票"
    TAXI_TICKET = "出租车票"
    BUS_TICKET = "客运车票"
    HOTEL_INVOICE = "酒店发票"
    GENERAL_INVOICE = "通用发票"
    UNKNOWN = "未知类型"


class ValidationStatus(str, Enum):
    """验证状态枚举"""
    PENDING = "pending"      # 待验证
    VALID = "valid"          # 验证通过
    INVALID = "invalid"      # 验证失败
    WARNING = "warning"      # 有警告


class ConfidenceLevel(str, Enum):
    """置信度等级"""
    LOW = "low"              # 低置信度 < 0.7
    MEDIUM = "medium"        # 中等置信度 0.7-0.9
    HIGH = "high"            # 高置信度 > 0.9


class ProcessingMetadata(BaseModel):
    """处理元数据"""
    ocr_request_id: Optional[str] = None
    ocr_model: Optional[str] = None
    processing_time: Optional[float] = None
    processing_timestamp: Optional[datetime] = None
    user_id: Optional[str] = None


class ValidationIssue(BaseModel):
    """验证问题"""
    field_name: str
    severity: str  # error, warning, info
    message: str
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None


class BaseInvoice(BaseModel):
    """
    基础发票模型
    
    统一的发票数据结构，所有发票类型都实现此接口
    核心字段：所有发票都有的标准字段
    扩展字段：特定发票类型的专有字段
    """
    
    # === 核心标准字段（所有发票类型都有） ===
    invoice_type: InvoiceType = Field(..., description="发票类型")
    invoice_number: str = Field("", description="发票/票据号码")
    invoice_date: Optional[date] = Field(None, description="开票日期")
    total_amount: Optional[Decimal] = Field(None, description="总金额")
    seller_name: str = Field("", description="销售方名称")
    buyer_name: str = Field("", description="购买方名称")
    
    # === 扩展字段存储 ===
    extended_fields: Dict[str, Any] = Field(default_factory=dict, description="扩展字段数据")
    field_confidences: Dict[str, float] = Field(default_factory=dict, description="字段置信度")
    
    # === 原始OCR数据 ===
    raw_ocr_fields: List[Dict[str, Any]] = Field(default_factory=list, description="原始OCR字段")
    ocr_metadata: Optional[ProcessingMetadata] = Field(None, description="OCR处理元数据")
    
    # === 验证状态 ===
    validation_status: ValidationStatus = Field(ValidationStatus.PENDING, description="验证状态")
    validation_score: Optional[float] = Field(None, description="验证分数 0-1")
    validation_issues: List[ValidationIssue] = Field(default_factory=list, description="验证问题")
    
    # === 处理元数据 ===
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow, description="创建时间")
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow, description="更新时间")
    
    class Config:
        """Pydantic配置"""
        use_enum_values = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None,
            date: lambda v: v.isoformat() if v else None,
            Decimal: lambda v: float(v) if v else None
        }
    
    def get_field_value(self, field_name: str) -> Optional[Any]:
        """
        获取字段值（核心字段优先，然后查找扩展字段）
        
        Args:
            field_name: 字段名称
            
        Returns:
            字段值或None
        """
        # 首先查找核心字段
        if hasattr(self, field_name):
            return getattr(self, field_name)
        
        # 然后查找扩展字段
        return self.extended_fields.get(field_name)
    
    def set_field_value(self, field_name: str, value: Any, confidence: float = 1.0) -> None:
        """
        设置字段值
        
        Args:
            field_name: 字段名称
            value: 字段值
            confidence: 置信度
        """
        # 核心字段直接设置
        if hasattr(self, field_name):
            setattr(self, field_name, value)
        else:
            # 扩展字段存储到extended_fields
            self.extended_fields[field_name] = value
        
        # 设置置信度
        self.field_confidences[field_name] = confidence
        
        # 更新时间
        self.updated_at = datetime.utcnow()
    
    def get_field_confidence(self, field_name: str) -> float:
        """
        获取字段置信度
        
        Args:
            field_name: 字段名称
            
        Returns:
            置信度值 0-1
        """
        return self.field_confidences.get(field_name, 0.0)
    
    def get_confidence_level(self) -> ConfidenceLevel:
        """
        获取整体置信度等级
        
        Returns:
            置信度等级
        """
        if not self.field_confidences:
            return ConfidenceLevel.LOW
        
        avg_confidence = sum(self.field_confidences.values()) / len(self.field_confidences)
        
        if avg_confidence >= 0.9:
            return ConfidenceLevel.HIGH
        elif avg_confidence >= 0.7:
            return ConfidenceLevel.MEDIUM
        else:
            return ConfidenceLevel.LOW
    
    def get_low_confidence_fields(self, threshold: float = 0.7) -> List[str]:
        """
        获取低置信度字段列表
        
        Args:
            threshold: 置信度阈值
            
        Returns:
            低置信度字段名称列表
        """
        return [
            field_name for field_name, confidence in self.field_confidences.items()
            if confidence < threshold
        ]
    
    def add_validation_issue(self, field_name: str, severity: str, message: str, 
                           expected_value: Optional[str] = None, 
                           actual_value: Optional[str] = None) -> None:
        """
        添加验证问题
        
        Args:
            field_name: 字段名称
            severity: 严重程度
            message: 问题描述
            expected_value: 期望值
            actual_value: 实际值
        """
        issue = ValidationIssue(
            field_name=field_name,
            severity=severity,
            message=message,
            expected_value=expected_value,
            actual_value=actual_value
        )
        self.validation_issues.append(issue)
        
        # 更新验证状态
        if severity == "error" and self.validation_status != ValidationStatus.INVALID:
            self.validation_status = ValidationStatus.INVALID
        elif severity == "warning" and self.validation_status == ValidationStatus.PENDING:
            self.validation_status = ValidationStatus.WARNING
    
    def is_complete(self) -> bool:
        """
        检查发票数据是否完整
        
        Returns:
            是否包含必要字段
        """
        return bool(
            self.invoice_number and 
            self.total_amount is not None and 
            self.seller_name
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        转换为字典格式
        
        Returns:
            字典格式的发票数据
        """
        data = self.dict()
        
        # 展平扩展字段到顶层
        if self.extended_fields:
            data.update(self.extended_fields)
        
        return data
    
    def summary(self) -> Dict[str, Any]:
        """
        生成发票摘要信息
        
        Returns:
            摘要信息
        """
        return {
            "invoice_type": self.invoice_type,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date.isoformat() if self.invoice_date else None,
            "total_amount": float(self.total_amount) if self.total_amount else None,
            "seller_name": self.seller_name,
            "buyer_name": self.buyer_name,
            "validation_status": self.validation_status,
            "confidence_level": self.get_confidence_level(),
            "field_count": len(self.extended_fields) + 6,  # 6个核心字段
            "issues_count": len(self.validation_issues),
            "is_complete": self.is_complete()
        }