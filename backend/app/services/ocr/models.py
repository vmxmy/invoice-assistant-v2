"""
OCR服务数据模型
"""

from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date
from pydantic import BaseModel, Field, validator


class InvoiceMainInfo(BaseModel):
    """发票主要信息"""
    invoice_number: str = Field(..., description="发票号码")
    invoice_code: Optional[str] = Field(None, description="发票代码")
    invoice_type: Optional[str] = Field(None, description="发票类型")
    invoice_date: Optional[date] = Field(None, description="开票日期")


class InvoicePartyInfo(BaseModel):
    """发票当事方信息（买方/卖方）"""
    name: Optional[str] = Field(None, description="名称")
    tax_id: Optional[str] = Field(None, description="纳税人识别号")
    address: Optional[str] = Field(None, description="地址")
    phone: Optional[str] = Field(None, description="电话")
    bank_account: Optional[str] = Field(None, description="开户行及账号")


class InvoiceItem(BaseModel):
    """发票明细项目"""
    name: str = Field(..., description="商品或服务名称")
    specification: Optional[str] = Field(None, description="规格型号")
    unit: Optional[str] = Field(None, description="单位")
    quantity: Optional[Decimal] = Field(None, description="数量")
    unit_price: Optional[Decimal] = Field(None, description="单价")
    amount: Optional[Decimal] = Field(None, description="金额")
    tax_rate: Optional[str] = Field(None, description="税率")
    tax_amount: Optional[Decimal] = Field(None, description="税额")


class InvoiceSummary(BaseModel):
    """发票汇总信息"""
    amount: Decimal = Field(Decimal('0'), description="合计金额")
    tax_amount: Decimal = Field(Decimal('0'), description="合计税额")
    total_amount: Decimal = Field(Decimal('0'), description="价税合计")
    amount_in_words: Optional[str] = Field(None, description="价税合计大写")
    
    @validator('amount', 'tax_amount', 'total_amount', pre=True)
    def validate_decimal(cls, v):
        """验证并转换为Decimal类型"""
        if v is None:
            return Decimal('0')
        if isinstance(v, (int, float, str)):
            return Decimal(str(v))
        return v


class StructuredInvoiceData(BaseModel):
    """结构化发票数据"""
    main_info: InvoiceMainInfo
    seller_info: InvoicePartyInfo
    buyer_info: InvoicePartyInfo
    summary: InvoiceSummary
    items: List[InvoiceItem] = Field(default_factory=list, description="发票明细")
    issuer_person: Optional[str] = Field(None, description="开票人")
    project_name: Optional[str] = Field(None, description="项目名称")
    
    class Config:
        json_encoders = {
            Decimal: str,
            date: lambda v: v.isoformat() if v else None
        }


class OCRResult(BaseModel):
    """OCR处理结果"""
    status: str = Field(..., description="处理状态: success, error, pending")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="置信度")
    extraction_method: str = Field(..., description="提取方法: enhanced_rule, invoice2data, mock, fallback")
    structured_data: Optional[StructuredInvoiceData] = Field(None, description="结构化数据")
    raw_text: Optional[str] = Field(None, description="原始文本")
    error: Optional[str] = Field(None, description="错误信息")
    processing_time: Optional[float] = Field(None, description="处理时间(秒)")
    batch_id: Optional[str] = Field(None, description="批次ID")
    
    @validator('status')
    def validate_status(cls, v):
        """验证状态值"""
        allowed_statuses = {'success', 'error', 'pending', 'processing'}
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of {allowed_statuses}")
        return v


class BatchUploadResponse(BaseModel):
    """批量上传响应"""
    batch_id: str = Field(..., description="批次ID")
    upload_urls: List[str] = Field(..., description="上传URL列表")  # API返回的URL字符串列表
    expires_at: Optional[str] = Field(None, description="过期时间")


class BatchStatusResponse(BaseModel):
    """批次状态响应"""
    batch_id: str = Field(..., description="批次ID")
    status: str = Field(..., description="批次状态")
    progress: Optional[Dict[str, Any]] = Field(None, description="进度信息")
    result_url: Optional[str] = Field(None, description="结果下载URL")
    error: Optional[str] = Field(None, description="错误信息") 