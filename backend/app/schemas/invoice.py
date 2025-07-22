"""
发票相关的Schema定义
"""

from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, validator

from app.models.invoice import InvoiceStatus, InvoiceSource
from .base_response import BaseListResponse


class InvoiceBase(BaseModel):
    """发票基础Schema"""
    invoice_number: str = Field(..., description="发票号码")
    invoice_code: Optional[str] = Field(None, description="发票代码")
    invoice_date: date = Field(..., description="开票日期")
    consumption_date: Optional[date] = Field(None, description="消费日期（实际消费/服务发生的日期）")
    seller_name: str = Field(..., description="销售方名称")
    seller_tax_number: Optional[str] = Field(None, description="销售方税号")
    buyer_name: str = Field(..., description="购买方名称")
    buyer_tax_number: Optional[str] = Field(None, description="购买方税号")
    total_amount: Decimal = Field(..., description="价税合计")
    tax_amount: Decimal = Field(default=Decimal("0"), description="税额")
    invoice_type: Optional[str] = Field(None, description="发票类型")
    remarks: Optional[str] = Field(None, description="备注")


class InvoiceCreate(InvoiceBase):
    """创建发票Schema"""
    ocr_confidence: Optional[float] = Field(None, description="OCR识别置信度", ge=0, le=1)
    amount_without_tax: Optional[Decimal] = Field(None, description="不含税金额")
    
    @validator('total_amount', 'tax_amount', 'amount_without_tax', pre=True)
    def parse_decimal(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            return Decimal(v.replace(',', ''))
        return v


class InvoiceUpdate(BaseModel):
    """更新发票Schema"""
    invoice_number: Optional[str] = None
    invoice_code: Optional[str] = None
    invoice_date: Optional[date] = None
    seller_name: Optional[str] = None
    seller_tax_number: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_tax_number: Optional[str] = None
    total_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    invoice_type: Optional[str] = None
    remarks: Optional[str] = None
    status: Optional[InvoiceStatus] = None


class InvoiceInDB(InvoiceBase):
    """数据库中的发票Schema"""
    id: str
    user_id: str
    amount_without_tax: Decimal
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    ocr_confidence: Optional[float] = None
    status: InvoiceStatus
    source: InvoiceSource
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class InvoiceResponse(InvoiceInDB):
    """发票响应Schema"""
    download_url: Optional[str] = Field(None, description="文件下载URL（签名URL）")


class InvoiceListResponse(BaseListResponse[InvoiceResponse]):
    """发票列表响应Schema"""
    total_pages: int = Field(..., description="总页数")


class InvoiceStatistics(BaseModel):
    """发票统计Schema"""
    total_count: int = Field(..., description="发票总数")
    total_amount: Decimal = Field(..., description="总金额")
    total_tax: Decimal = Field(..., description="总税额")
    by_month: List[dict] = Field(..., description="按月统计")
    by_seller: List[dict] = Field(..., description="按销售方统计")
    by_type: List[dict] = Field(..., description="按类型统计")