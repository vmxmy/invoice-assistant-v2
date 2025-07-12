"""
OCR 相关的数据模型
"""

from enum import Enum
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field


class InvoiceType(str, Enum):
    """发票类型枚举"""
    VAT_INVOICE = "增值税发票"
    TRAIN_TICKET = "火车票"
    UNKNOWN = "未知类型"


class BaseInvoiceData(BaseModel):
    """发票数据基类"""
    invoice_type: InvoiceType
    confidence: float = Field(0.0, description="识别置信度")


class InvoiceData(BaseInvoiceData):
    """增值税发票数据"""
    invoice_type: InvoiceType = InvoiceType.VAT_INVOICE
    invoice_code: str = Field("", description="发票代码")
    invoice_number: str = Field("", description="发票号码")
    invoice_date: str = Field("", description="开票日期")
    total_amount: str = Field("", description="合计金额")
    tax_amount: str = Field("", description="税额")
    seller_name: str = Field("", description="销售方名称")
    seller_tax_number: str = Field("", description="销售方纳税人识别号")
    buyer_name: str = Field("", description="购买方名称")
    buyer_tax_number: str = Field("", description="购买方纳税人识别号")
    remarks: str = Field("", description="备注")
    
    class Config:
        json_schema_extra = {
            "example": {
                "invoice_type": "增值税发票",
                "invoice_code": "3300223130",
                "invoice_number": "25432017",
                "invoice_date": "2023-12-01",
                "total_amount": "10000.00",
                "tax_amount": "1300.00",
                "seller_name": "杭州科技有限公司",
                "seller_tax_number": "91330106MA2KY3JX6H",
                "buyer_name": "上海贸易有限公司",
                "buyer_tax_number": "91310114MA1GU8BA0J",
                "remarks": "",
                "confidence": 0.98
            }
        }


class TrainTicketData(BaseInvoiceData):
    """火车票数据"""
    invoice_type: InvoiceType = InvoiceType.TRAIN_TICKET
    ticket_number: str = Field("", description="车票号")
    passenger_name: str = Field("", description="乘客姓名")
    id_number: str = Field("", description="身份证号")
    departure_station: str = Field("", description="出发站")
    arrival_station: str = Field("", description="到达站")
    train_number: str = Field("", description="车次")
    departure_date: str = Field("", description="出发日期")
    departure_time: str = Field("", description="出发时间")
    seat_number: str = Field("", description="座位号")
    ticket_price: str = Field("", description="票价")
    
    class Config:
        json_schema_extra = {
            "example": {
                "invoice_type": "火车票",
                "ticket_number": "E123456789",
                "passenger_name": "张三",
                "id_number": "3301**********1234",
                "departure_station": "杭州东",
                "arrival_station": "上海虹桥",
                "train_number": "G7505",
                "departure_date": "2023-12-15",
                "departure_time": "08:30",
                "seat_number": "06车08A号",
                "ticket_price": "73.00",
                "confidence": 0.95
            }
        }


class OCRResponse(BaseModel):
    """OCR 响应模型"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Union[InvoiceData, TrainTicketData]] = Field(None, description="识别结果")
    raw_result: Optional[Dict[str, Any]] = Field(None, description="原始 OCR 结果")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "识别成功",
                "data": {
                    "invoice_type": "增值税发票",
                    "invoice_code": "3300223130",
                    "invoice_number": "25432017",
                    "invoice_date": "2023-12-01",
                    "total_amount": "10000.00",
                    "tax_amount": "1300.00",
                    "seller_name": "杭州科技有限公司",
                    "seller_tax_number": "91330106MA2KY3JX6H",
                    "buyer_name": "上海贸易有限公司",
                    "buyer_tax_number": "91310114MA1GU8BA0J",
                    "remarks": "",
                    "confidence": 0.98
                },
                "raw_result": {
                    "Data": {
                        "Content": {
                            "InvoiceCode": "3300223130",
                            "InvoiceNumber": "25432017"
                        }
                    }
                }
            }
        }