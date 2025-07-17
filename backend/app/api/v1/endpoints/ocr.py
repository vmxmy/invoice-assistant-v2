"""
OCR 相关的 API 端点

处理发票和票据的智能识别和解析
"""

import os
import base64
import tempfile
import logging
from typing import Optional, Dict, Any, Union
from datetime import datetime
import fitz  # PyMuPDF
from PIL import Image
import io

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse

from alibabacloud_ocr_api20210707.client import Client as ocr_api20210707Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_ocr_api20210707 import models as ocr_api20210707_models
from alibabacloud_tea_util import models as util_models

from app.core.config import settings
from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.ocr import OCRResponse

logger = logging.getLogger(__name__)
router = APIRouter()


class AliyunOCRClient:
    """阿里云 OCR 客户端"""
    
    def __init__(self):
        config = open_api_models.Config(
            access_key_id=settings.alicloud_access_key_id,
            access_key_secret=settings.alicloud_access_key_secret
        )
        config.endpoint = f'ocr-api.{settings.alicloud_ocr_region}.aliyuncs.com'
        self.client = ocr_api20210707Client(config)
        self.runtime = util_models.RuntimeOptions()
    
    async def recognize_mixed_invoices(self, file_content: bytes) -> Dict[str, Any]:
        """使用混贴发票识别统一接口"""
        try:
            # 使用BinaryIO传递文件内容
            request = ocr_api20210707_models.RecognizeMixedInvoicesRequest(
                body=io.BytesIO(file_content)
            )
            
            response = self.client.recognize_mixed_invoices_with_options(request, self.runtime)
            
            if response.status_code == 200:
                return response.body.to_map()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"阿里云 OCR 错误: {response.body}"
                )
                
        except Exception as e:
            logger.error(f"混贴发票识别失败: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))


def extract_pdf_first_page(pdf_content: bytes) -> bytes:
    """提取 PDF 第一页并转换为图片（仅在必要时使用）"""
    try:
        # 打开 PDF
        pdf_document = fitz.open(stream=pdf_content, filetype="pdf")
        
        # 获取第一页
        page = pdf_document[0]
        
        # 渲染页面为图片 (300 DPI)
        mat = fitz.Matrix(300/72, 300/72)
        pix = page.get_pixmap(matrix=mat)
        
        # 转换为 PNG 格式
        img_data = pix.pil_tobytes(format="PNG")
        
        pdf_document.close()
        
        return img_data
        
    except Exception as e:
        logger.error(f"提取 PDF 第一页失败: {str(e)}")
        raise HTTPException(status_code=400, detail=f"PDF 处理失败: {str(e)}")


def parse_mixed_invoices_data(ocr_result: Dict[str, Any]) -> Dict[str, Any]:
    """解析混贴发票识别结果 - 支持多种发票类型的统一解析"""
    import json
    import re
    
    try:
        # 阿里云RecognizeMixedInvoices返回格式：
        # {
        #   "Data": "{JSON字符串}",
        #   "RequestId": "..."
        # }
        
        # 第一步：获取Data字段（JSON字符串）
        data_str = ocr_result.get('Data', '')
        if not data_str:
            return {
                'invoice_type': '未知类型',
                'confidence': 0.0,
                'error': '未获取到OCR数据'
            }
        
        # 第二步：解析JSON字符串
        data = json.loads(data_str)
        
        # 第三步：获取subMsgs数组
        sub_msgs = data.get('subMsgs', [])
        if not sub_msgs:
            return {
                'invoice_type': '未知类型',
                'confidence': 0.0,
                'error': '未识别到有效发票'
            }
        
        # 第四步：取第一个识别结果
        first_msg = sub_msgs[0]
        result = first_msg.get('result', {})
        invoice_data = result.get('data', {})
        
        # 第五步：确定发票类型
        invoice_type = first_msg.get('type', result.get('ftype', ''))
        if not invoice_type:
            # 从数据字段推断类型
            if 'invoiceType' in invoice_data:
                invoice_type = invoice_data.get('invoiceType', '通用发票')
            else:
                invoice_type = '通用发票'
        
        logger.info(f"识别到发票类型: {invoice_type}, 数据字段: {list(invoice_data.keys())}")
        
        # 第六步：根据发票类型解析数据
        if '增值税' in str(invoice_type) or 'VAT' in str(invoice_type).upper() or 'invoice' in str(first_msg.get('op', '')):
            return _parse_vat_invoice_from_mixed_new(invoice_data, invoice_type)
        elif '火车票' in str(invoice_type) or 'TRAIN' in str(invoice_type).upper():
            return _parse_train_ticket_from_mixed_new(invoice_data, invoice_type)
        else:
            # 通用发票解析
            return _parse_general_invoice_from_mixed_new(invoice_data, invoice_type)
            
    except json.JSONDecodeError as e:
        logger.error(f"解析OCR结果JSON失败: {str(e)}")
        return {
            'invoice_type': '未知类型',
            'confidence': 0.0,
            'error': f'JSON解析错误: {str(e)}'
        }
    except Exception as e:
        logger.error(f"解析OCR结果失败: {str(e)}")
        return {
            'invoice_type': '未知类型',
            'confidence': 0.0,
            'error': f'解析错误: {str(e)}'
        }


def _parse_vat_invoice_from_mixed_new(invoice_data: Dict[str, Any], invoice_type: str) -> Dict[str, Any]:
    """解析阿里云混贴识别中的增值税发票 - 新版本"""
    # 从置信度信息中提取字段
    prism_info = invoice_data.get('prism_keyValueInfo', [])
    confidence_scores = []
    
    # 构建字段映射
    field_values = {}
    field_confidences = {}
    
    logger.info(f"增值税发票 prism_keyValueInfo 数量: {len(prism_info)}")
    
    for field_info in prism_info:
        field_name = field_info.get('key', '')
        field_value = field_info.get('value', '')
        value_confidence = field_info.get('valueProb', 95)
        key_confidence = field_info.get('keyProb', 100)
        
        if field_name:  # 只处理有效字段名
            field_values[field_name] = field_value
            field_confidences[field_name] = {
                'value_confidence': value_confidence,
                'key_confidence': key_confidence,
                'text': field_value
            }
            
            if value_confidence > 0:
                confidence_scores.append(value_confidence)
                
            logger.debug(f"字段 {field_name}: {field_value} (置信度: {value_confidence}%)")
    
    # 同时也从直接字段中获取值（备用）
    direct_fields = {
        'invoiceNumber': invoice_data.get('invoiceNumber', ''),
        'invoiceDate': invoice_data.get('invoiceDate', ''),
        'totalAmount': invoice_data.get('totalAmount', ''),
        'sellerName': invoice_data.get('sellerName', ''),
        'purchaserName': invoice_data.get('purchaserName', ''),
        'invoiceType': invoice_data.get('invoiceType', invoice_type)
    }
    
    # 合并字段值（优先使用直接字段）
    for key, value in direct_fields.items():
        if value and key not in field_values:
            field_values[key] = value
    
    # 计算整体置信度
    overall_confidence = sum(confidence_scores) / len(confidence_scores) / 100.0 if confidence_scores else 0.95
    
    return {
        'invoice_type': invoice_data.get('invoiceType', '增值税发票'),
        'invoiceCode': field_values.get('invoiceCode', ''),
        'invoiceNumber': field_values.get('invoiceNumber', ''),
        'invoiceDate': field_values.get('invoiceDate', ''),
        'totalAmount': field_values.get('totalAmount', ''),
        'invoiceTax': field_values.get('invoiceTax', ''),
        'invoiceAmountPreTax': field_values.get('invoiceAmountPreTax', ''),
        'sellerName': field_values.get('sellerName', ''),
        'sellerTaxNumber': field_values.get('sellerTaxNumber', ''),
        'purchaserName': field_values.get('purchaserName', ''),
        'purchaserTaxNumber': field_values.get('purchaserTaxNumber', ''),
        'remarks': field_values.get('remarks', ''),
        
        # 兼容字段
        'invoice_number': field_values.get('invoiceNumber', ''),
        'invoice_date': field_values.get('invoiceDate', ''),
        'total_amount': field_values.get('totalAmount', ''),
        'seller_name': field_values.get('sellerName', ''),
        'buyer_name': field_values.get('purchaserName', ''),
        
        # 置信度信息
        'confidence': overall_confidence,
        'field_confidences': field_confidences
    }


def _parse_train_ticket_from_mixed_new(invoice_data: Dict[str, Any], invoice_type: str) -> Dict[str, Any]:
    """解析阿里云混贴识别中的火车票 - 新版本"""
    # 从置信度信息中提取字段
    prism_info = invoice_data.get('prism_keyValueInfo', [])
    confidence_scores = []
    
    # 构建字段映射
    field_values = {}
    field_confidences = {}
    
    logger.info(f"火车票 prism_keyValueInfo 数量: {len(prism_info)}")
    
    for field_info in prism_info:
        field_name = field_info.get('key', '')
        field_value = field_info.get('value', '')
        value_confidence = field_info.get('valueProb', 95)
        key_confidence = field_info.get('keyProb', 100)
        
        if field_name:  # 只处理有效字段名
            field_values[field_name] = field_value
            field_confidences[field_name] = {
                'value_confidence': value_confidence,
                'key_confidence': key_confidence,
                'text': field_value
            }
            
            if value_confidence > 0:
                confidence_scores.append(value_confidence)
                
            logger.debug(f"字段 {field_name}: {field_value} (置信度: {value_confidence}%)")
    
    # 计算整体置信度
    overall_confidence = sum(confidence_scores) / len(confidence_scores) / 100.0 if confidence_scores else 0.95
    
    return {
        'invoice_type': '火车票',
        'ticketNumber': field_values.get('ticketNumber', ''),
        'trainNumber': field_values.get('trainNumber', ''),
        'departureStation': field_values.get('departureStation', ''),
        'arrivalStation': field_values.get('arrivalStation', ''),
        'departureTime': field_values.get('departureTime', ''),
        'seatNumber': field_values.get('seatNumber', ''),
        'fare': field_values.get('fare', ''),
        'passengerName': field_values.get('passengerName', ''),
        
        # 统一字段映射
        'invoiceNumber': field_values.get('ticketNumber', ''),
        'totalAmount': field_values.get('fare', ''),
        'buyerName': field_values.get('passengerName', ''),
        'sellerName': '中国铁路',
        
        # 兼容字段
        'invoice_number': field_values.get('ticketNumber', ''),
        'total_amount': field_values.get('fare', ''),
        'buyer_name': field_values.get('passengerName', ''),
        'seller_name': '中国铁路',
        
        # 置信度信息
        'confidence': overall_confidence,
        'field_confidences': field_confidences
    }


def _parse_general_invoice_from_mixed_new(invoice_data: Dict[str, Any], invoice_type: str) -> Dict[str, Any]:
    """解析阿里云混贴识别中的通用发票 - 新版本"""
    # 从置信度信息中提取字段
    prism_info = invoice_data.get('prism_keyValueInfo', [])
    confidence_scores = []
    
    # 构建字段映射
    field_values = {}
    field_confidences = {}
    
    logger.info(f"通用发票 prism_keyValueInfo 数量: {len(prism_info)}")
    
    for field_info in prism_info:
        field_name = field_info.get('key', '')
        field_value = field_info.get('value', '')
        value_confidence = field_info.get('valueProb', 95)
        key_confidence = field_info.get('keyProb', 100)
        
        if field_name:  # 只处理有效字段名
            field_values[field_name] = field_value
            field_confidences[field_name] = {
                'value_confidence': value_confidence,
                'key_confidence': key_confidence,
                'text': field_value
            }
            
            if value_confidence > 0:
                confidence_scores.append(value_confidence)
                
            logger.debug(f"字段 {field_name}: {field_value} (置信度: {value_confidence}%)")
    
    # 计算整体置信度
    overall_confidence = sum(confidence_scores) / len(confidence_scores) / 100.0 if confidence_scores else 0.95
    
    return {
        'invoice_type': invoice_type or '通用发票',
        'invoiceNumber': field_values.get('invoiceNumber', ''),
        'invoiceDate': field_values.get('invoiceDate', ''),
        'totalAmount': field_values.get('totalAmount', ''),
        'sellerName': field_values.get('sellerName', ''),
        'buyerName': field_values.get('buyerName', ''),
        
        # 兼容字段
        'invoice_number': field_values.get('invoiceNumber', ''),
        'invoice_date': field_values.get('invoiceDate', ''),
        'total_amount': field_values.get('totalAmount', ''),
        'seller_name': field_values.get('sellerName', ''),
        'buyer_name': field_values.get('buyerName', ''),
        
        # 置信度信息
        'confidence': overall_confidence,
        'field_confidences': field_confidences
    }


def _parse_vat_invoice_from_mixed(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """解析混贴识别中的增值税发票 - 旧版本（保留兼容性）"""
    # 从 subImages 或 fields 中提取字段信息
    fields = invoice_data.get('fields', {})
    
    return {
        'invoice_type': '增值税发票',
        'invoiceCode': fields.get('invoiceCode', {}).get('text', ''),
        'invoiceNumber': fields.get('invoiceNumber', {}).get('text', ''),
        'invoiceDate': fields.get('invoiceDate', {}).get('text', ''),
        'totalAmount': fields.get('totalAmount', {}).get('text', ''),
        'invoiceTax': fields.get('invoiceTax', {}).get('text', ''),
        'invoiceAmountPreTax': fields.get('invoiceAmountPreTax', {}).get('text', ''),
        'sellerName': fields.get('sellerName', {}).get('text', ''),
        'sellerTaxNumber': fields.get('sellerTaxNumber', {}).get('text', ''),
        'purchaserName': fields.get('purchaserName', {}).get('text', ''),
        'purchaserTaxNumber': fields.get('purchaserTaxNumber', {}).get('text', ''),
        'remarks': fields.get('remarks', {}).get('text', ''),
        
        # 兼容字段
        'invoice_code': fields.get('invoiceCode', {}).get('text', ''),
        'invoice_number': fields.get('invoiceNumber', {}).get('text', ''),
        'invoice_date': fields.get('invoiceDate', {}).get('text', ''),
        'total_amount': fields.get('totalAmount', {}).get('text', ''),
        'tax_amount': fields.get('invoiceTax', {}).get('text', ''),
        'amount_without_tax': fields.get('invoiceAmountPreTax', {}).get('text', ''),
        'seller_name': fields.get('sellerName', {}).get('text', ''),
        'seller_tax_number': fields.get('sellerTaxNumber', {}).get('text', ''),
        'buyer_name': fields.get('purchaserName', {}).get('text', ''),
        'buyer_tax_number': fields.get('purchaserTaxNumber', {}).get('text', ''),
        
        # 置信度信息
        'confidence': _calculate_confidence(fields),
        'field_confidences': _extract_field_confidences(fields)
    }


def _parse_train_ticket_from_mixed(ticket_data: Dict[str, Any]) -> Dict[str, Any]:
    """解析混贴识别中的火车票"""
    fields = ticket_data.get('fields', {})
    
    return {
        'invoice_type': '火车票',
        'ticketNumber': fields.get('ticketNumber', {}).get('text', ''),
        'invoiceDate': fields.get('invoiceDate', {}).get('text', ''),
        'passengerName': fields.get('passengerName', {}).get('text', ''),
        'buyerName': fields.get('buyerName', {}).get('text', ''),
        'buyerCreditCode': fields.get('buyerCreditCode', {}).get('text', ''),
        'trainNumber': fields.get('trainNumber', {}).get('text', ''),
        'departureStation': fields.get('departureStation', {}).get('text', ''),
        'arrivalStation': fields.get('arrivalStation', {}).get('text', ''),
        'departureTime': fields.get('departureTime', {}).get('text', ''),
        'seatNumber': fields.get('seatNumber', {}).get('text', ''),
        'fare': fields.get('fare', {}).get('text', ''),
        
        # 兼容字段
        'ticket_number': fields.get('ticketNumber', {}).get('text', ''),
        'passenger_name': fields.get('passengerName', {}).get('text', ''),
        'train_number': fields.get('trainNumber', {}).get('text', ''),
        'departure_station': fields.get('departureStation', {}).get('text', ''),
        'arrival_station': fields.get('arrivalStation', {}).get('text', ''),
        'seat_number': fields.get('seatNumber', {}).get('text', ''),
        'ticket_price': fields.get('fare', {}).get('text', ''),
        
        # 置信度信息
        'confidence': _calculate_confidence(fields),
        'field_confidences': _extract_field_confidences(fields)
    }


def _parse_general_invoice_from_mixed(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
    """解析混贴识别中的通用发票"""
    fields = invoice_data.get('fields', {})
    
    return {
        'invoice_type': invoice_data.get('type', '通用发票'),
        'invoiceNumber': fields.get('invoiceNumber', {}).get('text', ''),
        'invoiceDate': fields.get('invoiceDate', {}).get('text', ''),
        'totalAmount': fields.get('totalAmount', {}).get('text', ''),
        'sellerName': fields.get('sellerName', {}).get('text', ''),
        'buyerName': fields.get('buyerName', {}).get('text', ''),
        
        # 兼容字段
        'invoice_number': fields.get('invoiceNumber', {}).get('text', ''),
        'invoice_date': fields.get('invoiceDate', {}).get('text', ''),
        'total_amount': fields.get('totalAmount', {}).get('text', ''),
        'seller_name': fields.get('sellerName', {}).get('text', ''),
        'buyer_name': fields.get('buyerName', {}).get('text', ''),
        
        # 置信度信息
        'confidence': _calculate_confidence(fields),
        'field_confidences': _extract_field_confidences(fields)
    }


def _calculate_confidence(fields: Dict[str, Any]) -> float:
    """计算整体置信度"""
    confidences = []
    for field_name, field_data in fields.items():
        if isinstance(field_data, dict) and 'confidence' in field_data:
            confidences.append(float(field_data['confidence']))
    
    if confidences:
        return sum(confidences) / len(confidences) / 100.0  # 转换为0-1范围
    return 0.95  # 默认置信度


def _extract_field_confidences(fields: Dict[str, Any]) -> Dict[str, Any]:
    """提取字段级置信度信息"""
    field_confidences = {}
    for field_name, field_data in fields.items():
        if isinstance(field_data, dict):
            field_confidences[field_name] = {
                'value_confidence': field_data.get('confidence', 95),
                'text': field_data.get('text', ''),
                'position': field_data.get('position', {})
            }
    return field_confidences


@router.post("/recognize", summary="阿里云OCR原始识别接口")
async def recognize_document(
    file: UploadFile = File(..., description="PDF 文件"),
    current_user: CurrentUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    使用阿里云 RecognizeMixedInvoices 统一识别接口
    
    - 直接调用阿里云OCR服务
    - 返回阿里云OCR的原始响应数据
    - 不进行任何解析或字段映射处理
    """
    # 验证文件类型
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="仅支持 PDF 格式文件")
    
    # 读取文件内容
    file_content = await file.read()
    
    # 限制文件大小 (10MB)
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件大小不能超过 10MB")
    
    try:
        # 初始化 OCR 客户端
        ocr_client = AliyunOCRClient()
        
        # 使用混贴发票识别统一接口
        ocr_result = await ocr_client.recognize_mixed_invoices(file_content)
        
        # 记录日志
        logger.info(f"用户 {current_user.id} 成功调用阿里云OCR识别: {file.filename}")
        
        return {
            "success": True,
            "message": "OCR识别成功",
            "data": ocr_result,  # 直接返回阿里云OCR原始数据
            "file_info": {
                "filename": file.filename,
                "size": len(file_content),
                "user_id": str(current_user.id)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"阿里云OCR调用失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR识别失败: {str(e)}"
        )


