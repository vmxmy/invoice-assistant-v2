"""
OCR 数据解析服务

整合所有OCR数据解析逻辑，提供统一的解析接口
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from app.core.exceptions import ValidationError
from app.services.ocr_parser_service import ParsedField

logger = logging.getLogger(__name__)


class OCRDataParser:
    """OCR数据解析器"""
    
    def parse_mixed_invoices_data(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """解析混贴发票识别结果 - 支持多种发票类型的统一解析"""
        try:
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
                return self._parse_vat_invoice_from_mixed(invoice_data, invoice_type)
            elif '火车票' in str(invoice_type) or 'TRAIN' in str(invoice_type).upper():
                return self._parse_train_ticket_from_mixed(invoice_data, invoice_type)
            else:
                # 通用发票解析
                return self._parse_general_invoice_from_mixed(invoice_data, invoice_type)
                
        except json.JSONDecodeError as e:
            logger.error(f"解析OCR JSON数据失败: {str(e)}")
            return {
                'invoice_type': '解析错误',
                'confidence': 0.0,
                'error': f'JSON解析失败: {str(e)}'
            }
        except Exception as e:
            logger.error(f"解析OCR数据失败: {str(e)}")
            return {
                'invoice_type': '解析错误',
                'confidence': 0.0,
                'error': f'数据解析失败: {str(e)}'
            }
    
    def _parse_vat_invoice_from_mixed(self, invoice_data: Dict[str, Any], invoice_type: str) -> Dict[str, Any]:
        """解析增值税发票数据"""
        logger.info(f"解析增值税发票，类型: {invoice_type}")
        
        # 提取核心字段
        result = {
            'invoice_type': invoice_type or '增值税普通发票',
            'invoice_number': invoice_data.get('invoiceNumber', ''),
            'invoice_code': invoice_data.get('invoiceCode', ''),
            'invoice_date': invoice_data.get('invoiceDate', ''),
            'total_amount': self._parse_amount(invoice_data.get('totalAmount', 0)),
            'seller_name': invoice_data.get('sellerName', ''),
            'buyer_name': invoice_data.get('purchaserName', ''),
            'confidence': 0.95
        }
        
        # 额外字段
        result['seller_tax_id'] = invoice_data.get('sellerTaxNumber', '')
        result['buyer_tax_id'] = invoice_data.get('purchaserTaxNumber', '')
        result['amount_without_tax'] = self._parse_amount(invoice_data.get('invoiceAmountPreTax', 0))
        result['tax_amount'] = self._parse_amount(invoice_data.get('invoiceTax', 0))
        
        # 添加其他可用字段
        if 'remark' in invoice_data:
            result['remark'] = invoice_data.get('remark', '')
        if 'checkCode' in invoice_data:
            result['check_code'] = invoice_data.get('checkCode', '')
        
        return result
    
    def _parse_train_ticket_from_mixed(self, ticket_data: Dict[str, Any], invoice_type: str) -> Dict[str, Any]:
        """解析火车票数据"""
        logger.info(f"解析火车票，类型: {invoice_type}")
        
        # 提取核心字段
        result = {
            'invoice_type': invoice_type or '火车票',
            'ticket_number': ticket_data.get('ticketNumber', ''),
            'train_number': ticket_data.get('trainNumber', ''),
            'departure_station': ticket_data.get('departureStation', ''),
            'arrival_station': ticket_data.get('arrivalStation', ''),
            'departure_time': ticket_data.get('departureTime', ''),
            'fare': self._parse_amount(ticket_data.get('fare', 0)),
            'passenger_name': ticket_data.get('passengerName', ''),
            'seat_number': ticket_data.get('seatNumber', ''),
            'confidence': 0.95
        }
        
        # 将火车票转换为发票格式
        result['invoice_number'] = result['ticket_number']
        result['invoice_date'] = result['departure_time'].split(' ')[0] if result['departure_time'] else ''
        result['total_amount'] = result['fare']
        result['seller_name'] = '中国铁路'
        result['buyer_name'] = result['passenger_name']
        
        return result
    
    def _parse_general_invoice_from_mixed(self, invoice_data: Dict[str, Any], invoice_type: str) -> Dict[str, Any]:
        """解析通用发票数据"""
        logger.info(f"解析通用发票，类型: {invoice_type}")
        
        # 提取所有可用字段
        result = {
            'invoice_type': invoice_type or '通用发票',
            'confidence': 0.85,
            'raw_data': invoice_data
        }
        
        # 尝试映射常见字段
        field_mapping = {
            'invoiceNumber': 'invoice_number',
            'invoiceCode': 'invoice_code',
            'invoiceDate': 'invoice_date',
            'totalAmount': 'total_amount',
            'sellerName': 'seller_name',
            'buyerName': 'buyer_name',
            'amount': 'amount',
            'date': 'date'
        }
        
        for old_key, new_key in field_mapping.items():
            if old_key in invoice_data:
                value = invoice_data[old_key]
                if 'amount' in new_key.lower() or 'total' in new_key.lower():
                    value = self._parse_amount(value)
                result[new_key] = value
        
        # 确保有基本字段
        if 'invoice_number' not in result:
            result['invoice_number'] = ''
        if 'total_amount' not in result:
            result['total_amount'] = 0
        
        return result
    
    def _parse_amount(self, amount_str: Any) -> float:
        """解析金额字符串为浮点数"""
        if not amount_str:
            return 0.0
        
        if isinstance(amount_str, (int, float)):
            return float(amount_str)
        
        if isinstance(amount_str, str):
            # 移除货币符号和千位分隔符
            cleaned = amount_str.replace('¥', '').replace(',', '').replace('￥', '').strip()
            try:
                return float(cleaned)
            except ValueError:
                logger.warning(f"无法解析金额: {amount_str}")
                return 0.0
        
        return 0.0
    
    def extract_field_confidences(self, ocr_result: Dict[str, Any]) -> Dict[str, float]:
        """从OCR结果中提取字段置信度"""
        field_confidences = {}
        
        try:
            data_str = ocr_result.get('Data', '')
            if not data_str:
                return field_confidences
            
            data = json.loads(data_str)
            sub_msgs = data.get('subMsgs', [])
            
            if not sub_msgs:
                return field_confidences
            
            first_msg = sub_msgs[0]
            result = first_msg.get('result', {})
            
            # 从prism_keyValueInfo中提取置信度
            prism_info = result.get('prism_keyValueInfo', [])
            for field_info in prism_info:
                key = field_info.get('key', '')
                confidence = field_info.get('valueProb', 95) / 100.0
                if key:
                    field_confidences[key] = confidence
                    
        except Exception as e:
            logger.error(f"提取字段置信度失败: {str(e)}")
            
        return field_confidences


# 依赖注入函数
from fastapi import Depends


def get_ocr_data_parser() -> OCRDataParser:
    """获取OCR数据解析器实例（依赖注入）
    
    Returns:
        OCRDataParser: OCR数据解析器实例
    """
    return OCRDataParser()