"""
OCR 解析服务层

提供统一的OCR数据解析服务，处理各种发票类型的数据提取和转换
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from app.core.exceptions import ValidationError
from app.schemas.field_definitions import get_field_schema
from app.services.invoice_adapters import AdapterFactory, ParsedField

logger = logging.getLogger(__name__)


class OCRParserService:
    """OCR数据解析服务"""
    
    def extract_invoice_type(self, ocr_data: Dict[str, Any]) -> str:
        """
        从OCR数据中提取发票类型
        
        Args:
            ocr_data: 阿里云OCR原始响应数据
            
        Returns:
            str: 发票类型
        """
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
                'HotelReceipt': '酒店账单',
                '酒店账单': '酒店账单'
            }
            
            return type_mapping.get(invoice_type, invoice_type or "未知类型")
            
        except Exception as e:
            logger.error(f"提取发票类型失败: {str(e)}")
            return "未知类型"
    
    def parse_invoice_data(self, ocr_data: Dict[str, Any]) -> Tuple[str, List[ParsedField]]:
        """
        解析发票数据，返回类型和字段列表
        
        Args:
            ocr_data: 阿里云OCR原始响应数据
            
        Returns:
            Tuple[str, List[ParsedField]]: (发票类型, 解析字段列表)
        """
        # 提取发票类型
        invoice_type = self.extract_invoice_type(ocr_data)
        
        # 解析OCR数据
        try:
            data_str = ocr_data.get('Data', '')
            if not data_str:
                raise ValidationError("OCR数据中未找到Data字段")
            
            data = json.loads(data_str)
            sub_msgs = data.get('subMsgs', [])
            
            if not sub_msgs:
                raise ValidationError("未找到有效的发票数据")
            
            first_msg = sub_msgs[0]
            result = first_msg.get('result', {})
            
            # 根据发票类型选择解析器
            if '增值税' in invoice_type:
                return invoice_type, self._parse_vat_invoice(result)
            elif '火车票' in invoice_type:
                return invoice_type, self._parse_train_ticket(result)
            else:
                return invoice_type, self._parse_general_invoice(result)
                
        except Exception as e:
            logger.error(f"解析发票数据失败: {str(e)}")
            raise ValidationError(f"数据解析失败: {str(e)}")
    
    def _parse_vat_invoice(self, result_data: Dict[str, Any]) -> List[ParsedField]:
        """解析增值税发票"""
        fields = []
        data = result_data.get('data', {})
        prism_info = result_data.get('prism_keyValueInfo', [])
        
        # 构建置信度映射
        confidence_map = self._build_confidence_map(prism_info)
        
        # 核心字段映射
        field_mapping = {
            'invoiceNumber': '发票号码',
            'invoiceDate': '开票日期',
            'totalAmount': '价税合计',
            'sellerName': '销售方名称',
            'purchaserName': '购买方名称',
            'invoiceCode': '发票代码',
            'invoiceAmountPreTax': '合计金额',
            'invoiceTax': '合计税额',
            'sellerTaxNumber': '销售方纳税人识别号',
            'purchaserTaxNumber': '购买方纳税人识别号',
            'invoiceDetails': '发票明细',
            'title': '标题',
            'remarks': '备注',
            'drawer': '开票人',
            'reviewer': '复核人',
            'recipient': '收款人',
            'machineCode': '机器编码',
            'checkCode': '校验码'
        }
        
        # 提取字段
        for key, name in field_mapping.items():
            value = data.get(key, '')
            if value:
                confidence = confidence_map.get(key, 0.95)
                # 对于复杂数据类型（如发票明细数组），保持原始类型
                if isinstance(value, (list, dict)):
                    field_value = value
                else:
                    field_value = str(value)
                
                fields.append(ParsedField(
                    name=name,
                    value=field_value,
                    confidence=confidence,
                    original_key=key
                ))
        
        return fields
    
    def _parse_train_ticket(self, result_data: Dict[str, Any]) -> List[ParsedField]:
        """解析火车票"""
        fields = []
        data = result_data.get('data', {})
        prism_info = result_data.get('prism_keyValueInfo', [])
        
        # 构建置信度映射
        confidence_map = self._build_confidence_map(prism_info)
        
        # 火车票字段映射 - 包含所有OCR返回的字段
        field_mapping = {
            'ticketNumber': '车票号',
            'trainNumber': '车次',
            'departureStation': '出发站',
            'arrivalStation': '到达站',
            'departureTime': '出发时间',
            'fare': '票价',
            'passengerName': '乘客姓名',
            'seatNumber': '座位号',
            'seatType': '座位类型',
            'passengerInfo': '乘客信息',
            'electronicTicketNumber': '电子客票号',
            'buyerName': '购买方名称',
            'buyerCreditCode': '购买方纳税人识别号',
            'invoiceDate': '开票日期',
            'title': '标题',
            'remarks': '备注',
            'ticketCode': '车票代码',
            'saleInfo': '销售信息',
            'ticketGate': '检票口'
        }
        
        # 提取字段
        for key, name in field_mapping.items():
            value = data.get(key, '')
            if value:
                confidence = confidence_map.get(key, 0.95)
                fields.append(ParsedField(
                    name=name,
                    value=str(value),
                    confidence=confidence,
                    original_key=key
                ))
        
        # 添加固定的销售方
        fields.append(ParsedField(
            name='销售方名称',
            value='中国铁路',
            confidence=1.0,
            original_key='sellerName'
        ))
        
        return fields
    
    def _parse_general_invoice(self, result_data: Dict[str, Any]) -> List[ParsedField]:
        """解析通用发票"""
        fields = []
        data = result_data.get('data', {})
        
        # 遍历所有字段
        for key, value in data.items():
            if value and isinstance(value, (str, int, float)):
                fields.append(ParsedField(
                    name=key,
                    value=str(value),
                    confidence=0.95,
                    original_key=key
                ))
        
        return fields
    
    def _build_confidence_map(self, prism_info: List[Dict[str, Any]]) -> Dict[str, float]:
        """构建字段置信度映射"""
        confidence_map = {}
        
        for field_info in prism_info:
            key = field_info.get('key', '')
            confidence = field_info.get('valueProb', 95) / 100.0
            if key:
                confidence_map[key] = confidence
        
        return confidence_map
    
    def calculate_overall_confidence(self, fields: List[ParsedField]) -> float:
        """计算整体置信度"""
        if not fields:
            return 0.0
        
        total_confidence = sum(field.confidence for field in fields)
        return total_confidence / len(fields)


# 依赖注入函数
from fastapi import Depends


def get_ocr_parser_service() -> OCRParserService:
    """获取OCR解析服务实例（依赖注入）
    
    Returns:
        OCRParserService: OCR解析服务实例
    """
    return OCRParserService()