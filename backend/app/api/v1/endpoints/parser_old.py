"""
数据解析 API 端点 (重构版本)

负责解析阿里云 OCR 返回的原始数据，转换为BaseInvoice结构化发票信息
使用适配器模式和字段定义系统进行数据转换和验证
"""

import json
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.invoice_base import BaseInvoice, ProcessingMetadata
from app.services.invoice_adapters import (
    AdapterFactory, create_invoice_from_ocr, convert_to_frontend
)
from app.schemas.field_definitions import get_field_schema, validate_invoice_data

logger = logging.getLogger(__name__)
router = APIRouter()


class ParseRequest(BaseModel):
    """解析请求模型"""
    ocr_data: Dict[str, Any] = Field(..., description="阿里云OCR原始响应数据")
    parse_options: Optional[Dict[str, Any]] = Field(default=None, description="解析选项")
    output_format: str = Field("enhanced", description="输出格式: legacy|enhanced|frontend")


# === 旧版本兼容响应模型 ===


class ParsedField(BaseModel):
    """解析后的字段信息（兼容旧版本）"""
    name: str = Field(..., description="字段名称")
    value: str = Field(..., description="字段值")
    confidence: float = Field(0.0, description="置信度(0-1)")
    original_key: Optional[str] = Field(None, description="原始字段键名")


class ParsedInvoice(BaseModel):
    """解析后的发票信息（兼容旧版本）"""
    invoice_type: str = Field(..., description="发票类型")
    fields: List[ParsedField] = Field(..., description="解析出的字段列表")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="元数据信息")
    parse_status: str = Field("success", description="解析状态")
    parse_errors: List[str] = Field(default_factory=list, description="解析错误信息")


class ParseResponse(BaseModel):
    """解析响应模型（兼容旧版本）"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: Optional[Union[ParsedInvoice, BaseInvoice, Dict[str, Any]]] = Field(None, description="解析结果")
    parse_time: str = Field(..., description="解析时间")
    

# === 新版本增强响应模型 ===

class EnhancedParseResponse(BaseModel):
    """增强解析响应模型"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    data: BaseInvoice = Field(..., description="发票数据对象")
    validation_result: Dict[str, Any] = Field(..., description="验证结果")
    parse_time: str = Field(..., description="解析时间")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="处理元数据")


def extract_invoice_type(ocr_data: Dict[str, Any]) -> str:
    """从OCR数据中提取发票类型"""
    try:
        # 解析 Data 字段（JSON字符串）
        data_str = ocr_data.get('Data', '')
        if not data_str:
            return "未知类型"
        
        data = json.loads(data_str)
        sub_msgs = data.get('subMsgs', [])
        
        if not sub_msgs:
            return "未知类型"
        
        first_msg = sub_msgs[0]
        invoice_type = first_msg.get('type', '')
        
        # 映射发票类型
        type_mapping = {
            'VATInvoice': '增值税发票',
            'TrainTicket': '火车票',
            'FlightTicket': '机票',
            'TaxiTicket': '出租车票',
            'BusTicket': '客运车票',
            'TollTicket': '过路费票据',
            'HotelInvoice': '酒店发票',
            'QuotaInvoice': '定额发票',
            'GeneralInvoice': '通用发票'
        }
        
        return type_mapping.get(invoice_type, invoice_type or '通用发票')
        
    except Exception as e:
        logger.error(f"提取发票类型失败: {str(e)}")
        return "未知类型"


def convert_to_legacy_format(invoice: BaseInvoice) -> ParsedInvoice:
    """将BaseInvoice转换为旧版本格式"""
    fields = []
    
    # 转换核心字段
    core_fields = {
        'invoice_number': invoice.invoice_number,
        'invoice_date': invoice.invoice_date.isoformat() if invoice.invoice_date else '',
        'total_amount': str(invoice.total_amount) if invoice.total_amount else '',
        'seller_name': invoice.seller_name,
        'buyer_name': invoice.buyer_name
    }
    
    for key, value in core_fields.items():
        if value:
            fields.append(ParsedField(
                name=key.replace('_', ' ').title(),
                value=str(value),
                confidence=invoice.get_field_confidence(key),
                original_key=key
            ))
    
    # 转换扩展字段
    for key, value in invoice.extended_fields.items():
        if value:
            fields.append(ParsedField(
                name=key,
                value=str(value),
                confidence=invoice.get_field_confidence(key),
                original_key=key
            ))
    
    # 构建元数据
    metadata = {
        'validation_status': invoice.validation_status,
        'confidence_level': invoice.get_confidence_level(),
        'field_count': len(fields),
        'is_complete': invoice.is_complete()
    }
    
    if invoice.ocr_metadata:
        metadata.update({
            'ocr_request_id': invoice.ocr_metadata.ocr_request_id,
            'processing_time': invoice.ocr_metadata.processing_time
        })
    
    return ParsedInvoice(
        invoice_type=invoice.invoice_type,
        fields=fields,
        metadata=metadata,
        parse_status="success" if not invoice.validation_issues else "partial",
        parse_errors=[issue.message for issue in invoice.validation_issues if issue.severity == "error"]
    )


@router.post("/", response_model=ParseResponse, summary="解析OCR数据（兼容版本）")
    """解析增值税发票字段"""
    fields = []
    
    # 完整的增值税发票字段映射配置（28个字段）
    field_mapping = {
        # 基础信息 (7个)
        'title': '发票标题',
        'invoiceType': '发票类型', 
        'invoiceCode': '发票代码',
        'invoiceNumber': '发票号码',
        'invoiceDate': '开票日期',
        'machineCode': '机器编号',
        'checkCode': '校验码',
        
        # 购买方信息 (4个)
        'purchaserName': '购买方名称',
        'purchaserTaxNumber': '购买方纳税人识别号',
        'purchaserContactInfo': '购买方地址电话',
        'purchaserBankAccountInfo': '购买方开户行及账号',
        
        # 销售方信息 (4个)
        'sellerName': '销售方名称',
        'sellerTaxNumber': '销售方纳税人识别号',
        'sellerContactInfo': '销售方地址电话',
        'sellerBankAccountInfo': '销售方开户行及账号',
        
        # 金额信息 (4个)
        'invoiceAmountPreTax': '不含税金额',
        'invoiceTax': '税额',
        'totalAmount': '价税合计',
        'totalAmountInWords': '价税合计大写',
        
        # 明细信息 (1个)
        'invoiceDetails': '发票明细',
        
        # 其他信息 (8个)
        'passwordArea': '密码区',
        'recipient': '收款人',
        'reviewer': '复核人',
        'drawer': '开票人',
        'remarks': '备注',
        'formType': '票据类型',
        'specialTag': '特殊标识',
        'printedInvoiceCode': '印刷发票代码',
        'printedInvoiceNumber': '印刷发票号码'
    }
    
    # 优先从 prism_keyValueInfo 提取字段（新格式）
    prism_info = invoice_data.get('prism_keyValueInfo', [])
    
    if prism_info:
        for field_info in prism_info:
            field_key = field_info.get('key', '')
            field_value = field_info.get('value', '')
            value_confidence = field_info.get('valueProb', 95) / 100.0
            
            if field_key and field_value:
                field_name = field_mapping.get(field_key, field_key)
                fields.append(ParsedField(
                    name=field_name,
                    value=field_value,
                    confidence=value_confidence,
                    original_key=field_key
                ))
    else:
        # 从直接字段提取（旧格式或新格式）
        for field_key, field_name in field_mapping.items():
            field_value = invoice_data.get(field_key)
            
            if field_value is not None:
                # 处理特殊字段类型
                if field_key == 'invoiceDetails':
                    # invoiceDetails 是JSON数组，需要特殊处理
                    if isinstance(field_value, list):
                        # 将明细列表转换为可读字符串
                        details_str = []
                        for item in field_value:
                            if isinstance(item, dict):
                                # 提取商品名称和金额
                                name = item.get('itemName', item.get('name', ''))
                                amount = item.get('amount', item.get('totalPrice', ''))
                                quantity = item.get('quantity', '')
                                if name:
                                    detail = f"{name}"
                                    if quantity:
                                        detail += f" x{quantity}"
                                    if amount:
                                        detail += f" ¥{amount}"
                                    details_str.append(detail)
                        
                        if details_str:
                            fields.append(ParsedField(
                                name=field_name,
                                value="; ".join(details_str),
                                confidence=0.95,
                                original_key=field_key
                            ))
                    elif str(field_value).strip():
                        # 如果是字符串形式
                        fields.append(ParsedField(
                            name=field_name,
                            value=str(field_value),
                            confidence=0.95,
                            original_key=field_key
                        ))
                else:
                    # 普通字段处理 - 包含所有字段，即使是空值
                    field_str = str(field_value).strip() if field_value else ""
                    fields.append(ParsedField(
                        name=field_name,
                        value=field_str,
                        confidence=0.95 if field_str else 0.0,  # 空值置信度为0
                        original_key=field_key
                    ))
    
    # 添加计算字段
    if not any(f.original_key == 'totalAmount' for f in fields):
        # 尝试从其他字段计算总金额
        amount_pre_tax = next((f.value for f in fields if f.original_key == 'invoiceAmountPreTax'), None)
        tax = next((f.value for f in fields if f.original_key == 'invoiceTax'), None)
        
        if amount_pre_tax and tax:
            try:
                total = float(amount_pre_tax) + float(tax)
                fields.append(ParsedField(
                    name='价税合计',
                    value=str(total),
                    confidence=0.95,
                    original_key='totalAmount'
                ))
            except ValueError:
                pass
    
    return fields


def parse_train_ticket(ticket_data: Dict[str, Any]) -> List[ParsedField]:
    """解析火车票字段"""
    fields = []
    
    # 完整的火车票字段映射配置
    field_mapping = {
        'ticketNumber': '车票号',
        'trainNumber': '车次',
        'departureStation': '出发站',
        'arrivalStation': '到达站',
        'departureTime': '出发时间',
        'seatNumber': '座位号',
        'seatType': '座位类型',
        'fare': '票价',
        'passengerName': '乘客姓名',
        'passengerInfo': '乘客信息',
        'ticketCode': '检票码',
        'saleInfo': '售票信息',
        'ticketGate': '检票口',
        'electronicTicketNumber': '电子客票号',
        'buyerName': '购买方名称',
        'buyerCreditCode': '购买方统一社会信用代码',
        'title': '发票标题',
        'invoiceDate': '开票日期',
        'remarks': '备注'
    }
    
    # 优先从 prism_keyValueInfo 提取字段（新格式）
    prism_info = ticket_data.get('prism_keyValueInfo', [])
    
    if prism_info:
        for field_info in prism_info:
            field_key = field_info.get('key', '')
            field_value = field_info.get('value', '')
            value_confidence = field_info.get('valueProb', 95) / 100.0
            
            if field_key and field_value:
                field_name = field_mapping.get(field_key, field_key)
                fields.append(ParsedField(
                    name=field_name,
                    value=field_value,
                    confidence=value_confidence,
                    original_key=field_key
                ))
    else:
        # 从直接字段提取（旧格式或新格式）
        for field_key, field_name in field_mapping.items():
            field_value = ticket_data.get(field_key)
            
            if field_value is not None:
                field_str = str(field_value).strip() if field_value else ""
                fields.append(ParsedField(
                    name=field_name,
                    value=field_str,
                    confidence=0.95 if field_str else 0.0,
                    original_key=field_key
                ))
    
    # 添加固定字段
    fields.append(ParsedField(
        name='销售方名称',
        value='中国铁路',
        confidence=1.0,
        original_key='sellerName'
    ))
    
    return fields


def parse_general_invoice(invoice_data: Dict[str, Any]) -> List[ParsedField]:
    """解析通用发票字段"""
    fields = []
    
    # 通用字段映射
    field_mapping = {
        'invoiceNumber': '发票号码',
        'invoiceDate': '开票日期',
        'totalAmount': '金额',
        'sellerName': '销售方名称',
        'buyerName': '购买方名称',
        'items': '商品明细'
    }
    
    # 从 prism_keyValueInfo 提取字段
    prism_info = invoice_data.get('prism_keyValueInfo', [])
    
    for field_info in prism_info:
        field_key = field_info.get('key', '')
        field_value = field_info.get('value', '')
        value_confidence = field_info.get('valueProb', 95) / 100.0
        
        if field_key and field_value:
            field_name = field_mapping.get(field_key, field_key)
            fields.append(ParsedField(
                name=field_name,
                value=field_value,
                confidence=value_confidence,
                original_key=field_key
            ))
    
    return fields


@router.post("/", response_model=ParseResponse, summary="解析OCR数据")
async def parse_ocr_data(
    request: ParseRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> ParseResponse:
    """
    解析阿里云OCR返回的原始数据
    
    - 接收OCR原始响应数据
    - 根据发票类型进行字段解析
    - 返回结构化的发票信息
    """
    try:
        logger.info(f"用户 {current_user.id} 开始解析OCR数据")
        
        ocr_data = request.ocr_data
        
        # 提取发票类型
        invoice_type = extract_invoice_type(ocr_data)
        logger.info(f"识别发票类型: {invoice_type}")
        
        # 解析 Data 字段
        data_str = ocr_data.get('Data', '')
        if not data_str:
            raise ValueError("OCR数据中未找到Data字段")
        
        data = json.loads(data_str)
        sub_msgs = data.get('subMsgs', [])
        
        if not sub_msgs:
            raise ValueError("未找到有效的发票数据")
        
        # 获取第一个发票数据
        first_msg = sub_msgs[0]
        result = first_msg.get('result', {})
        invoice_data = result.get('data', {})
        
        # 根据发票类型解析字段
        fields = []
        parse_errors = []
        
        try:
            if '增值税' in invoice_type:
                fields = parse_vat_invoice(invoice_data)
            elif '火车票' in invoice_type:
                fields = parse_train_ticket(invoice_data)
            else:
                fields = parse_general_invoice(invoice_data)
        except Exception as e:
            logger.error(f"解析发票字段失败: {str(e)}")
            parse_errors.append(f"字段解析错误: {str(e)}")
        
        # 构建元数据
        metadata = {
            'ocr_request_id': ocr_data.get('RequestId', ''),
            'original_type': first_msg.get('type', ''),
            'confidence_score': result.get('score', 0),
            'field_count': len(fields),
            'parse_timestamp': datetime.utcnow().isoformat()
        }
        
        # 构建解析结果
        parsed_invoice = ParsedInvoice(
            invoice_type=invoice_type,
            fields=fields,
            metadata=metadata,
            parse_status="success" if not parse_errors else "partial",
            parse_errors=parse_errors
        )
        
        logger.info(f"解析完成，共提取 {len(fields)} 个字段")
        
        return ParseResponse(
            success=True,
            message=f"成功解析{invoice_type}，提取{len(fields)}个字段",
            data=parsed_invoice,
            parse_time=datetime.utcnow().isoformat()
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON解析失败: {str(e)}")
        return ParseResponse(
            success=False,
            message=f"OCR数据格式错误: {str(e)}",
            data=None,
            parse_time=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"解析OCR数据失败: {str(e)}")
        return ParseResponse(
            success=False,
            message=f"解析失败: {str(e)}",
            data=None,
            parse_time=datetime.utcnow().isoformat()
        )


@router.post("/batch", summary="批量解析OCR数据")
async def parse_ocr_batch(
    requests: List[ParseRequest],
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    批量解析多个OCR结果
    
    - 支持同时解析多个OCR结果
    - 返回每个解析的结果和统计信息
    """
    results = []
    success_count = 0
    
    for idx, request in enumerate(requests):
        try:
            response = await parse_ocr_data(request, current_user)
            results.append({
                'index': idx,
                'success': response.success,
                'data': response.dict()
            })
            if response.success:
                success_count += 1
        except Exception as e:
            results.append({
                'index': idx,
                'success': False,
                'error': str(e)
            })
    
    return {
        'total': len(requests),
        'success': success_count,
        'failed': len(requests) - success_count,
        'results': results
    }