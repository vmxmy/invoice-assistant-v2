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
        
        # 映射发票类型（支持中英文）
        type_mapping = {
            'VATInvoice': '增值税发票',
            '增值税发票': '增值税发票',
            'TrainTicket': '火车票',
            '火车票': '火车票',
            'FlightTicket': '机票',
            '机票': '机票',
            'TaxiTicket': '出租车票',
            '出租车票': '出租车票',
            'BusTicket': '客运车票',
            '客运车票': '客运车票',
            'TollTicket': '过路费票据',
            '过路费票据': '过路费票据',
            'HotelInvoice': '酒店发票',
            '酒店发票': '酒店发票',
            'QuotaInvoice': '定额发票',
            '定额发票': '定额发票',
            'GeneralInvoice': '通用发票',
            '通用发票': '通用发票'
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
async def parse_ocr_data(
    request: ParseRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> ParseResponse:
    """
    解析阿里云OCR返回的原始数据
    
    支持多种输出格式：
    - legacy: 旧版本兼容格式（ParsedInvoice）
    - enhanced: 新版本BaseInvoice格式
    - frontend: 前端优化格式
    
    - 接收OCR原始响应数据
    - 根据发票类型进行字段解析
    - 返回结构化的发票信息
    """
    try:
        logger.info(f"用户 {current_user.id} 开始解析OCR数据")
        
        ocr_data = request.ocr_data
        output_format = request.output_format
        
        # 提取发票类型
        invoice_type = extract_invoice_type(ocr_data)
        logger.info(f"识别发票类型: {invoice_type}")
        
        # 创建处理元数据
        metadata = ProcessingMetadata(
            ocr_request_id=ocr_data.get('RequestId', ''),
            processing_time=0.0,
            processing_timestamp=datetime.utcnow(),
            user_id=str(current_user.id)
        )
        
        # 使用适配器创建BaseInvoice
        try:
            invoice = create_invoice_from_ocr(invoice_type, ocr_data, metadata)
            logger.info(f"成功创建发票对象，类型: {invoice.invoice_type}")
        except ValueError as e:
            logger.error(f"不支持的发票类型: {invoice_type}")
            return ParseResponse(
                success=False,
                message=f"不支持的发票类型: {invoice_type}",
                data=None,
                parse_time=datetime.utcnow().isoformat()
            )
        
        # 进行数据验证
        validation_result = validate_invoice_data(
            invoice_type, 
            invoice.to_dict(), 
            invoice.field_confidences
        )
        
        # 根据验证结果更新发票状态
        if not validation_result["is_valid"]:
            invoice.validation_status = "invalid"
            for error in validation_result["errors"]:
                invoice.add_validation_issue("general", "error", error)
        else:
            invoice.validation_status = "valid"
        
        # 根据输出格式返回数据
        if output_format == "legacy":
            # 旧版本兼容格式
            legacy_data = convert_to_legacy_format(invoice)
            return ParseResponse(
                success=True,
                message=f"成功解析{invoice_type}，提取{len(legacy_data.fields)}个字段",
                data=legacy_data,
                parse_time=datetime.utcnow().isoformat()
            )
        
        elif output_format == "frontend":
            # 前端优化格式
            frontend_data = convert_to_frontend(invoice)
            return ParseResponse(
                success=True,
                message=f"成功解析{invoice_type}",
                data=frontend_data,
                parse_time=datetime.utcnow().isoformat()
            )
        
        else:
            # 默认增强格式（BaseInvoice）
            return ParseResponse(
                success=True,
                message=f"成功解析{invoice_type}",
                data=invoice,
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


@router.post("/enhanced", response_model=EnhancedParseResponse, summary="增强解析OCR数据")
async def parse_ocr_data_enhanced(
    request: ParseRequest,
    current_user: CurrentUser = Depends(get_current_user)
) -> EnhancedParseResponse:
    """
    增强版OCR数据解析
    
    使用BaseInvoice模型和字段定义系统
    - 完整的字段验证
    - 详细的置信度分析
    - 结构化的验证结果
    """
    try:
        logger.info(f"用户 {current_user.id} 开始增强解析OCR数据")
        
        ocr_data = request.ocr_data
        
        # 提取发票类型
        invoice_type = extract_invoice_type(ocr_data)
        logger.info(f"识别发票类型: {invoice_type}")
        
        # 创建处理元数据
        metadata = ProcessingMetadata(
            ocr_request_id=ocr_data.get('RequestId', ''),
            processing_time=0.0,
            processing_timestamp=datetime.utcnow(),
            user_id=str(current_user.id)
        )
        
        # 使用适配器创建BaseInvoice
        invoice = create_invoice_from_ocr(invoice_type, ocr_data, metadata)
        
        # 进行完整验证
        validation_result = validate_invoice_data(
            invoice_type, 
            invoice.to_dict(), 
            invoice.field_confidences
        )
        
        # 更新发票验证状态
        if validation_result["is_valid"]:
            invoice.validation_status = "valid"
            invoice.validation_score = 1.0
        else:
            invoice.validation_status = "invalid"
            invoice.validation_score = 0.0
            
            # 添加验证问题
            for error in validation_result["errors"]:
                invoice.add_validation_issue("validation", "error", error)
        
        # 构建响应元数据
        response_metadata = {
            "field_count": len(invoice.extended_fields) + 6,  # 6个核心字段
            "low_confidence_fields": invoice.get_low_confidence_fields(),
            "processing_timestamp": datetime.utcnow().isoformat(),
            "adapter_version": "2.0"
        }
        
        logger.info(f"增强解析完成，验证状态: {invoice.validation_status}")
        
        return EnhancedParseResponse(
            success=True,
            message=f"成功解析{invoice_type}",
            data=invoice,
            validation_result=validation_result,
            parse_time=datetime.utcnow().isoformat(),
            metadata=response_metadata
        )
        
    except ValueError as e:
        logger.error(f"解析失败: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"增强解析OCR数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")


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


@router.get("/types", summary="获取支持的发票类型")
async def get_supported_invoice_types() -> Dict[str, Any]:
    """
    获取系统支持的发票类型列表
    """
    try:
        supported_types = AdapterFactory.get_supported_types()
        
        return {
            "supported_types": supported_types,
            "count": len(supported_types),
            "descriptions": {
                "增值税发票": "增值税普通发票和专用发票",
                "火车票": "铁路电子客票",
                "机票": "航空电子客票",
                "出租车票": "出租车发票",
                "客运车票": "长途客运票据"
            }
        }
    except Exception as e:
        logger.error(f"获取支持类型失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取支持类型失败")


@router.get("/fields/{invoice_type}", summary="获取发票类型字段定义")
async def get_invoice_fields(
    invoice_type: str
) -> Dict[str, Any]:
    """
    获取指定发票类型的字段定义
    """
    try:
        field_schema = get_field_schema(invoice_type)
        if not field_schema:
            raise HTTPException(status_code=404, detail=f"不支持的发票类型: {invoice_type}")
        
        return {
            "invoice_type": field_schema.invoice_type,
            "field_count": len(field_schema.fields),
            "field_groups": field_schema.field_groups,
            "fields": {
                key: {
                    "name": field.name,
                    "type": field.field_type,
                    "category": field.category,
                    "required": field.is_required,
                    "core": field.is_core,
                    "description": field.description
                }
                for key, field in field_schema.fields.items()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取字段定义失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取字段定义失败")


# === 兼容性函数（用于 ocr_combined.py） ===

def parse_vat_invoice(result_data: Dict[str, Any]) -> List[ParsedField]:
    """
    解析增值税发票数据（兼容性函数）
    
    Args:
        result_data: 从OCR数据中提取的result数据（包含data和prism_keyValueInfo）
        
    Returns:
        ParsedField列表
    """
    try:
        # 构造临时OCR数据结构，保持完整的result结构
        temp_ocr_data = {
            'Data': json.dumps({
                'subMsgs': [{
                    'type': 'VATInvoice',
                    'result': result_data
                }]
            })
        }
        
        # 创建BaseInvoice
        invoice = create_invoice_from_ocr('增值税发票', temp_ocr_data)
        
        # 转换为ParsedField列表
        return _convert_invoice_to_parsed_fields(invoice)
        
    except Exception as e:
        logger.error(f"解析增值税发票失败: {str(e)}")
        # 返回基础字段作为fallback
        invoice_data = result_data.get('data', {})
        return _extract_basic_fields(invoice_data, '增值税发票')


def parse_train_ticket(result_data: Dict[str, Any]) -> List[ParsedField]:
    """
    解析火车票数据（兼容性函数）
    
    Args:
        result_data: 从OCR数据中提取的result数据（包含data和prism_keyValueInfo）
        
    Returns:
        ParsedField列表
    """
    try:
        # 构造临时OCR数据结构，保持完整的result结构
        temp_ocr_data = {
            'Data': json.dumps({
                'subMsgs': [{
                    'type': 'TrainTicket',
                    'result': result_data
                }]
            })
        }
        
        # 创建BaseInvoice
        invoice = create_invoice_from_ocr('火车票', temp_ocr_data)
        
        # 转换为ParsedField列表
        return _convert_invoice_to_parsed_fields(invoice)
        
    except Exception as e:
        logger.error(f"解析火车票失败: {str(e)}")
        # 返回基础字段作为fallback
        invoice_data = result_data.get('data', {})
        return _extract_basic_fields(invoice_data, '火车票')


def parse_general_invoice(result_data: Dict[str, Any]) -> List[ParsedField]:
    """
    解析通用发票数据（兼容性函数）
    
    Args:
        result_data: 从OCR数据中提取的result数据（包含data和prism_keyValueInfo）
        
    Returns:
        ParsedField列表
    """
    try:
        # 构造临时OCR数据结构，保持完整的result结构
        temp_ocr_data = {
            'Data': json.dumps({
                'subMsgs': [{
                    'type': 'GeneralInvoice',
                    'result': result_data
                }]
            })
        }
        
        # 创建BaseInvoice
        invoice = create_invoice_from_ocr('通用发票', temp_ocr_data)
        
        # 转换为ParsedField列表
        return _convert_invoice_to_parsed_fields(invoice)
        
    except Exception as e:
        logger.error(f"解析通用发票失败: {str(e)}")
        # 返回基础字段作为fallback
        invoice_data = result_data.get('data', {})
        return _extract_basic_fields(invoice_data, '通用发票')


def _convert_invoice_to_parsed_fields(invoice: BaseInvoice) -> List[ParsedField]:
    """
    将BaseInvoice转换为ParsedField列表
    
    Args:
        invoice: BaseInvoice对象
        
    Returns:
        ParsedField列表
    """
    fields = []
    
    # 转换核心字段（使用camelCase保持一致性）
    core_fields = {
        'invoiceNumber': invoice.invoice_number,
        'invoiceDate': invoice.invoice_date.isoformat() if invoice.invoice_date else '',
        'totalAmount': str(invoice.total_amount) if invoice.total_amount else '',
        'sellerName': invoice.seller_name,
        'buyerName': invoice.buyer_name
    }
    
    # camelCase 到 snake_case 的映射，用于获取置信度
    camel_to_snake = {
        'invoiceNumber': 'invoice_number',
        'invoiceDate': 'invoice_date',
        'totalAmount': 'total_amount',
        'sellerName': 'seller_name',
        'buyerName': 'buyer_name'
    }
    
    for key, value in core_fields.items():
        if value:
            # 使用snake_case的key来获取置信度
            snake_key = camel_to_snake.get(key, key)
            fields.append(ParsedField(
                name=key,
                value=str(value),
                confidence=invoice.get_field_confidence(snake_key),
                original_key=key
            ))
    
    # 转换扩展字段（去重，避免与核心字段重复）
    core_keys = set(core_fields.keys())
    for key, value in invoice.extended_fields.items():
        if value and key not in core_keys:
            fields.append(ParsedField(
                name=key,
                value=str(value),
                confidence=invoice.get_field_confidence(key),
                original_key=key
            ))
    
    return fields


def _extract_basic_fields(invoice_data: Dict[str, Any], invoice_type: str) -> List[ParsedField]:
    """
    从发票数据中提取基础字段（fallback方法）
    
    Args:
        invoice_data: 发票数据
        invoice_type: 发票类型
        
    Returns:
        ParsedField列表
    """
    fields = []
    
    # 常见字段映射
    field_mapping = {
        'invoiceNumber': 'Invoice Number',
        'invoiceDate': 'Invoice Date',
        'totalAmount': 'Total Amount',
        'sellerName': 'Seller Name',
        'purchaserName': 'Buyer Name',
        'buyerName': 'Buyer Name'
    }
    
    for key, display_name in field_mapping.items():
        value = invoice_data.get(key)
        if value:
            fields.append(ParsedField(
                name=display_name,
                value=str(value),
                confidence=0.8,  # 默认置信度
                original_key=key
            ))
    
    return fields