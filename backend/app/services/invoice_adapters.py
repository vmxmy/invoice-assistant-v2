"""
发票数据适配器

提供不同数据格式之间的转换功能：
- OCR原始数据 -> BaseInvoice
- ParsedField列表 -> BaseInvoice
- BaseInvoice -> 前端格式
- 发票类型特定适配
"""

import json
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, date
from decimal import Decimal

from app.schemas.invoice_base import (
    BaseInvoice, InvoiceType, ValidationStatus, 
    ProcessingMetadata, ValidationIssue
)
from app.schemas.field_definitions import (
    get_field_schema, FieldDefinition, InvoiceFieldSchema
)

logger = logging.getLogger(__name__)


class ParsedField:
    """解析后的字段信息（临时数据结构）"""
    def __init__(self, name: str, value: str, confidence: float = 1.0, original_key: str = None):
        self.name = name
        self.value = value
        self.confidence = confidence
        self.original_key = original_key


class InvoiceAdapter(ABC):
    """发票适配器基类"""
    
    def __init__(self, invoice_type: str):
        self.invoice_type = invoice_type
        self.field_schema = get_field_schema(invoice_type)
        if not self.field_schema:
            raise ValueError(f"不支持的发票类型: {invoice_type}")
    
    @abstractmethod
    def from_ocr_data(self, ocr_data: Dict[str, Any], metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
        """从OCR原始数据创建BaseInvoice"""
        pass
    
    @abstractmethod
    def from_parsed_fields(self, fields: List[ParsedField], metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
        """从解析字段列表创建BaseInvoice"""
        pass
    
    def to_frontend_format(self, invoice: BaseInvoice) -> Dict[str, Any]:
        """转换为前端所需格式"""
        base_data = {
            # 核心字段
            "invoice_type": invoice.invoice_type,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
            "total_amount": float(invoice.total_amount) if invoice.total_amount else None,
            "seller_name": invoice.seller_name,
            "buyer_name": invoice.buyer_name,
            
            # 状态信息
            "validation_status": invoice.validation_status,
            "validation_score": invoice.validation_score,
            "confidence_level": invoice.get_confidence_level(),
            
            # 元数据
            "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
            "updated_at": invoice.updated_at.isoformat() if invoice.updated_at else None,
            "is_complete": invoice.is_complete()
        }
        
        # 合并扩展字段
        base_data.update(invoice.extended_fields)
        
        # 添加字段置信度
        base_data["field_confidences"] = invoice.field_confidences
        
        # 添加验证问题
        base_data["validation_issues"] = [
            {
                "field_name": issue.field_name,
                "severity": issue.severity,
                "message": issue.message,
                "expected_value": issue.expected_value,
                "actual_value": issue.actual_value
            }
            for issue in invoice.validation_issues
        ]
        
        # 按字段定义分组
        if self.field_schema:
            grouped_fields = {}
            for group_name, field_keys in self.field_schema.field_groups.items():
                group_fields = {}
                for field_key in field_keys:
                    value = invoice.get_field_value(field_key)
                    if value is not None:
                        group_fields[field_key] = {
                            "value": value,
                            "confidence": invoice.get_field_confidence(field_key),
                            "name": self.field_schema.fields.get(field_key, {}).name if field_key in self.field_schema.fields else field_key
                        }
                if group_fields:
                    grouped_fields[group_name] = group_fields
            
            base_data["grouped_fields"] = grouped_fields
        
        return base_data
    
    def to_storage_format(self, invoice: BaseInvoice) -> Dict[str, Any]:
        """转换为数据库存储格式"""
        return {
            "invoice_type": invoice.invoice_type,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date,
            "total_amount": invoice.total_amount,
            "seller_name": invoice.seller_name,
            "buyer_name": invoice.buyer_name,
            "extended_fields": invoice.extended_fields,
            "field_confidences": invoice.field_confidences,
            "raw_ocr_fields": invoice.raw_ocr_fields,
            "validation_status": invoice.validation_status,
            "validation_score": invoice.validation_score,
            "validation_issues": [issue.dict() for issue in invoice.validation_issues],
            "created_at": invoice.created_at,
            "updated_at": invoice.updated_at,
            "ocr_metadata": invoice.ocr_metadata.dict() if invoice.ocr_metadata else None
        }
    
    def from_storage_format(self, data: Dict[str, Any]) -> BaseInvoice:
        """从数据库存储格式创建BaseInvoice"""
        # 重建验证问题
        validation_issues = []
        for issue_data in data.get("validation_issues", []):
            validation_issues.append(ValidationIssue(**issue_data))
        
        # 重建OCR元数据
        ocr_metadata = None
        if data.get("ocr_metadata"):
            ocr_metadata = ProcessingMetadata(**data["ocr_metadata"])
        
        return BaseInvoice(
            invoice_type=data.get("invoice_type", InvoiceType.UNKNOWN),
            invoice_number=data.get("invoice_number", ""),
            invoice_date=data.get("invoice_date"),
            total_amount=data.get("total_amount"),
            seller_name=data.get("seller_name", ""),
            buyer_name=data.get("buyer_name", ""),
            extended_fields=data.get("extended_fields", {}),
            field_confidences=data.get("field_confidences", {}),
            raw_ocr_fields=data.get("raw_ocr_fields", []),
            validation_status=data.get("validation_status", ValidationStatus.PENDING),
            validation_score=data.get("validation_score"),
            validation_issues=validation_issues,
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
            ocr_metadata=ocr_metadata
        )
    
    def _safe_convert_value(self, field_def: FieldDefinition, value: Any) -> Any:
        """安全转换字段值"""
        try:
            if value is None or value == "":
                return None
            
            # 使用字段定义的转换逻辑
            return field_def._convert_value(value)
        except Exception as e:
            logger.warning(f"转换字段 {field_def.key} 值失败: {value}, 错误: {str(e)}")
            return str(value) if value is not None else None


class VATInvoiceAdapter(InvoiceAdapter):
    """增值税发票适配器"""
    
    def __init__(self):
        super().__init__("增值税发票")
    
    def from_ocr_data(self, ocr_data: Dict[str, Any], metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
        """从OCR原始数据创建BaseInvoice"""
        try:
            # 解析OCR数据结构
            data_str = ocr_data.get('Data', '')
            if not data_str:
                raise ValueError("OCR数据中未找到Data字段")
            
            data = json.loads(data_str)
            sub_msgs = data.get('subMsgs', [])
            
            if not sub_msgs:
                raise ValueError("未找到有效的发票数据")
            
            first_msg = sub_msgs[0]
            result = first_msg.get('result', {})
            invoice_data = result.get('data', {})
            
            # 创建基础发票对象
            invoice = BaseInvoice(
                invoice_type=InvoiceType.VAT_INVOICE,
                raw_ocr_fields=[invoice_data],
                ocr_metadata=metadata
            )
            
            # 处理核心字段（传递完整的result，包含prism_keyValueInfo）
            self._populate_core_fields(invoice, result)
            
            # 处理扩展字段（传递data部分）
            self._populate_extended_fields(invoice, invoice_data)
            
            return invoice
            
        except Exception as e:
            logger.error(f"从OCR数据创建增值税发票失败: {str(e)}")
            # 返回基础对象，标记为验证失败
            invoice = BaseInvoice(
                invoice_type=InvoiceType.VAT_INVOICE,
                validation_status=ValidationStatus.INVALID,
                raw_ocr_fields=[ocr_data]
            )
            invoice.add_validation_issue("general", "error", f"OCR数据解析失败: {str(e)}")
            return invoice
    
    def from_parsed_fields(self, fields: List[ParsedField], metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
        """从解析字段列表创建BaseInvoice"""
        invoice = BaseInvoice(
            invoice_type=InvoiceType.VAT_INVOICE,
            ocr_metadata=metadata
        )
        
        for field in fields:
            # 查找字段定义
            field_def = None
            for key, definition in self.field_schema.fields.items():
                if definition.name == field.name or key == field.original_key:
                    field_def = definition
                    break
            
            if field_def:
                # 使用字段定义转换值
                converted_value = self._safe_convert_value(field_def, field.value)
                invoice.set_field_value(field_def.key, converted_value, field.confidence)
            else:
                # 未知字段存储到扩展字段
                invoice.extended_fields[field.original_key or field.name] = field.value
                invoice.field_confidences[field.original_key or field.name] = field.confidence
        
        return invoice
    
    def _populate_core_fields(self, invoice: BaseInvoice, result_data: Dict[str, Any]):
        """填充核心字段"""
        # 从result中提取置信度信息和实际数据
        prism_info = result_data.get('prism_keyValueInfo', [])
        data = result_data.get('data', {})
        confidence_map = {}
        from app.utils.field_mapping import normalize_field_name
        
        for field_info in prism_info:
            camel_key = field_info.get('key', '')
            confidence = field_info.get('valueProb', 95) / 100.0
            if camel_key:
                snake_key = normalize_field_name(camel_key)
                confidence_map[snake_key] = confidence
                # 也保存原始camelCase键的置信度，用于fallback
                confidence_map[camel_key] = confidence
        
        # 发票号码 - 尝试两种格式
        invoice_number = data.get('invoice_number') or data.get('invoiceNumber', '')
        if invoice_number:
            invoice.invoice_number = str(invoice_number)
            # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
            confidence = confidence_map.get('invoiceNumber', 1.0)
            invoice.set_field_value('invoice_number', str(invoice_number), confidence)
        
        # 开票日期 - 尝试两种格式
        invoice_date = data.get('invoice_date') or data.get('invoiceDate', '')
        if invoice_date:
            try:
                # 解析日期
                date_obj = self._parse_date(invoice_date)
                if date_obj:
                    invoice.invoice_date = date_obj
                    # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
                    confidence = confidence_map.get('invoiceDate', 1.0)
                    invoice.set_field_value('invoice_date', date_obj, confidence)
            except Exception as e:
                logger.warning(f"解析发票日期失败: {invoice_date}, 错误: {str(e)}")
        
        # 总金额 - 尝试两种格式
        total_amount = data.get('total_amount') or data.get('totalAmount', '')
        if total_amount:
            try:
                amount_decimal = Decimal(str(total_amount))
                invoice.total_amount = amount_decimal
                # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
                confidence = confidence_map.get('totalAmount', 1.0)
                invoice.set_field_value('total_amount', amount_decimal, confidence)
            except Exception as e:
                logger.warning(f"解析总金额失败: {total_amount}, 错误: {str(e)}")
        
        # 销售方名称 - 尝试两种格式
        seller_name = data.get('seller_name') or data.get('sellerName', '')
        if seller_name:
            invoice.seller_name = str(seller_name)
            # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
            confidence = confidence_map.get('sellerName', 1.0)
            invoice.set_field_value('seller_name', str(seller_name), confidence)
        
        # 购买方名称 - 尝试多种格式，同时设置到正确的字段
        buyer_name = (data.get('purchaser_name') or 
                     data.get('purchaserName') or 
                     data.get('buyer_name') or 
                     data.get('buyerName', ''))
        if buyer_name:
            invoice.buyer_name = str(buyer_name)
            # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
            purchaser_confidence = confidence_map.get('purchaserName', 1.0)
            invoice.set_field_value('purchaser_name', str(buyer_name), purchaser_confidence)
            invoice.set_field_value('buyer_name', str(buyer_name), purchaser_confidence)
    
    def _populate_extended_fields(self, invoice: BaseInvoice, invoice_data: Dict[str, Any]):
        """填充扩展字段"""
        # 核心字段已在 _populate_core_fields 中处理
        core_fields = ['invoice_number', 'invoice_date', 'total_amount', 'seller_name', 'purchaser_name']
        
        from app.utils.field_mapping import denormalize_field_name
        
        for field_key, field_def in self.field_schema.fields.items():
            if field_key not in core_fields:
                # 尝试多种字段名格式查找数据
                value = None
                
                # 1. 首先尝试snake_case
                if field_key in invoice_data:
                    value = invoice_data[field_key]
                # 2. 尝试camelCase
                elif field_key not in invoice_data:
                    camel_key = denormalize_field_name(field_key)
                    if camel_key in invoice_data:
                        value = invoice_data[camel_key]
                # 3. 尝试extraction_aliases
                if value is None and field_def.extraction_aliases:
                    for alias in field_def.extraction_aliases:
                        if alias in invoice_data:
                            value = invoice_data[alias]
                            break
                
                if value is not None:
                    converted_value = self._safe_convert_value(field_def, value)
                    invoice.set_field_value(field_key, converted_value, 0.95)
    
    def _extract_confidences(self, invoice: BaseInvoice, invoice_data: Dict[str, Any]):
        """从prism_keyValueInfo提取置信度"""
        prism_info = invoice_data.get('prism_keyValueInfo', [])
        
        # 创建camelCase到snake_case的映射
        from app.utils.field_mapping import normalize_field_name
        
        for field_info in prism_info:
            camel_key = field_info.get('key', '')
            confidence = field_info.get('valueProb', 95) / 100.0
            
            if camel_key:
                # 转换为snake_case
                snake_key = normalize_field_name(camel_key)
                
                # 设置置信度
                invoice.field_confidences[snake_key] = confidence
                
                # 同时设置camelCase版本（如果存在）
                if camel_key in invoice.field_confidences:
                    invoice.field_confidences[camel_key] = confidence
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """解析日期字符串"""
        if not date_str:
            return None
        
        # 支持多种日期格式
        formats = [
            "%Y年%m月%d日",  # 2025年03月03日
            "%Y-%m-%d",      # 2025-03-03
            "%Y/%m/%d",      # 2025/03/03
            "%Y.%m.%d"       # 2025.03.03
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        return None


class TrainTicketAdapter(InvoiceAdapter):
    """火车票适配器"""
    
    def __init__(self):
        super().__init__("火车票")
    
    def from_ocr_data(self, ocr_data: Dict[str, Any], metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
        """从OCR原始数据创建BaseInvoice"""
        try:
            # 解析OCR数据结构
            data_str = ocr_data.get('Data', '')
            if not data_str:
                raise ValueError("OCR数据中未找到Data字段")
            
            data = json.loads(data_str)
            sub_msgs = data.get('subMsgs', [])
            
            if not sub_msgs:
                raise ValueError("未找到有效的火车票数据")
            
            first_msg = sub_msgs[0]
            result = first_msg.get('result', {})
            ticket_data = result.get('data', {})
            
            # 创建基础发票对象
            invoice = BaseInvoice(
                invoice_type=InvoiceType.TRAIN_TICKET,
                raw_ocr_fields=[ticket_data],
                ocr_metadata=metadata
            )
            
            # 处理核心字段（传递完整的result，包含prism_keyValueInfo）
            self._populate_core_fields(invoice, result)
            
            # 处理扩展字段（传递data部分）
            self._populate_extended_fields(invoice, ticket_data)
            
            # 从OCR数据中提取销售方信息
            seller_name = self._extract_seller_name_from_ocr(result)
            invoice.seller_name = seller_name
            # 如果是从title推断出的，置信度稍低一些
            confidence = 0.95 if "电子发票" in seller_name else 1.0
            invoice.set_field_value('seller_name', seller_name, confidence)
            
            return invoice
            
        except Exception as e:
            logger.error(f"从OCR数据创建火车票失败: {str(e)}")
            # 返回基础对象，标记为验证失败
            invoice = BaseInvoice(
                invoice_type=InvoiceType.TRAIN_TICKET,
                validation_status=ValidationStatus.INVALID,
                raw_ocr_fields=[ocr_data]
            )
            invoice.add_validation_issue("general", "error", f"OCR数据解析失败: {str(e)}")
            return invoice
    
    def from_parsed_fields(self, fields: List[ParsedField], metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
        """从解析字段列表创建BaseInvoice"""
        invoice = BaseInvoice(
            invoice_type=InvoiceType.TRAIN_TICKET,
            ocr_metadata=metadata
        )
        
        for field in fields:
            # 查找字段定义
            field_def = None
            for key, definition in self.field_schema.fields.items():
                if definition.name == field.name or key == field.original_key:
                    field_def = definition
                    break
            
            if field_def:
                # 使用字段定义转换值
                converted_value = self._safe_convert_value(field_def, field.value)
                invoice.set_field_value(field_def.key, converted_value, field.confidence)
            else:
                # 未知字段存储到扩展字段
                invoice.extended_fields[field.original_key or field.name] = field.value
                invoice.field_confidences[field.original_key or field.name] = field.confidence
        
        # 从OCR数据中提取销售方信息
        seller_name = self._extract_seller_name_from_ocr(None)
        invoice.seller_name = seller_name
        # 如果是从title推断出的，置信度稍低一些
        confidence = 0.95 if "电子发票" in seller_name else 1.0
        invoice.set_field_value('seller_name', seller_name, confidence)
        
        return invoice
    
    def _populate_core_fields(self, invoice: BaseInvoice, result_data: Dict[str, Any]):
        """填充核心字段"""
        # 从result中提取置信度信息和实际数据
        prism_info = result_data.get('prism_keyValueInfo', [])
        data = result_data.get('data', {})
        confidence_map = {}
        from app.utils.field_mapping import normalize_field_name
        
        for field_info in prism_info:
            camel_key = field_info.get('key', '')
            confidence = field_info.get('valueProb', 95) / 100.0
            if camel_key:
                snake_key = normalize_field_name(camel_key)
                confidence_map[snake_key] = confidence
                # 也保存原始camelCase键的置信度，用于fallback
                confidence_map[camel_key] = confidence
        
        # 车票号作为发票号码 - 尝试两种格式
        ticket_number = data.get('ticket_number') or data.get('ticketNumber', '')
        if ticket_number:
            invoice.invoice_number = str(ticket_number)
            # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
            confidence = confidence_map.get('ticketNumber', 1.0)
            invoice.set_field_value('ticket_number', str(ticket_number), confidence)
            # 同时设置invoice_number的置信度，因为它也是核心字段
            invoice.set_field_value('invoice_number', str(ticket_number), confidence)
        
        # 开票日期 - 尝试两种格式
        invoice_date = data.get('invoice_date') or data.get('invoiceDate', '')
        if invoice_date:
            try:
                date_obj = self._parse_date(invoice_date)
                if date_obj:
                    invoice.invoice_date = date_obj
                    # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
                    confidence = confidence_map.get('invoiceDate', 1.0)
                    invoice.set_field_value('invoice_date', date_obj, confidence)
            except Exception as e:
                logger.warning(f"解析开票日期失败: {invoice_date}, 错误: {str(e)}")
        
        # 票价作为总金额 - 尝试多种格式
        fare = data.get('total_amount') or data.get('totalAmount') or data.get('fare', '')
        if fare:
            try:
                amount_decimal = Decimal(str(fare))
                invoice.total_amount = amount_decimal
                # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
                confidence = confidence_map.get('totalAmount', confidence_map.get('fare', 1.0))
                invoice.set_field_value('total_amount', amount_decimal, confidence)
            except Exception as e:
                logger.warning(f"解析票价失败: {fare}, 错误: {str(e)}")
        
        # 购买方名称 - 尝试多种格式
        buyer_name = data.get('buyer_name') or data.get('buyerName') or data.get('passengerName', '')
        if buyer_name:
            invoice.buyer_name = str(buyer_name)
            # 直接使用camelCase的置信度，因为OCR返回的是camelCase key
            confidence = confidence_map.get('passengerName', confidence_map.get('buyerName', 1.0))
            invoice.set_field_value('buyer_name', str(buyer_name), confidence)
    
    def _populate_extended_fields(self, invoice: BaseInvoice, ticket_data: Dict[str, Any]):
        """填充扩展字段"""
        # 核心字段已在 _populate_core_fields 中处理
        core_fields = ['ticket_number', 'invoice_date', 'total_amount', 'buyer_name']
        
        from app.utils.field_mapping import denormalize_field_name
        
        for field_key, field_def in self.field_schema.fields.items():
            if field_key not in core_fields:
                # 尝试多种字段名格式查找数据
                value = None
                
                # 1. 首先尝试snake_case
                if field_key in ticket_data:
                    value = ticket_data[field_key]
                # 2. 尝试camelCase
                elif field_key not in ticket_data:
                    camel_key = denormalize_field_name(field_key)
                    if camel_key in ticket_data:
                        value = ticket_data[camel_key]
                # 3. 尝试extraction_aliases
                if value is None and field_def.extraction_aliases:
                    for alias in field_def.extraction_aliases:
                        if alias in ticket_data:
                            value = ticket_data[alias]
                            break
                
                if value is not None:
                    converted_value = self._safe_convert_value(field_def, value)
                    invoice.set_field_value(field_key, converted_value, 0.95)
    
    def _extract_confidences(self, invoice: BaseInvoice, ticket_data: Dict[str, Any]):
        """从prism_keyValueInfo提取置信度"""
        prism_info = ticket_data.get('prism_keyValueInfo', [])
        
        # 创建camelCase到snake_case的映射
        from app.utils.field_mapping import normalize_field_name
        
        for field_info in prism_info:
            camel_key = field_info.get('key', '')
            confidence = field_info.get('valueProb', 95) / 100.0
            
            if camel_key:
                # 转换为snake_case
                snake_key = normalize_field_name(camel_key)
                
                # 设置置信度
                invoice.field_confidences[snake_key] = confidence
                
                # 同时设置camelCase版本（如果存在）
                if camel_key in invoice.field_confidences:
                    invoice.field_confidences[camel_key] = confidence
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """解析日期字符串"""
        if not date_str:
            return None
        
        # 支持多种日期格式
        formats = [
            "%Y年%m月%d日",  # 2025年03月03日
            "%Y-%m-%d",      # 2025-03-03
            "%Y/%m/%d",      # 2025/03/03
            "%Y.%m.%d"       # 2025.03.03
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        return None
    
    def _extract_seller_name_from_ocr(self, result_data: Optional[Dict[str, Any]]) -> str:
        """从OCR数据中提取销售方名称"""
        if result_data is None:
            return "中国铁路"
            
        data = result_data.get('data', {})
        
        # 1. 检查是否有explicit seller字段
        seller_name = data.get('sellerName') or data.get('seller_name')
        if seller_name:
            return str(seller_name)
        
        # 2. 从title字段推断
        title = data.get('title', '')
        if title:
            if '铁路电子客票' in title:
                return "中国铁路电子客票"
            elif '铁路' in title:
                return "中国铁路"
        
        # 3. 从remarks字段检查
        remarks = data.get('remarks', '')
        if remarks and '中国铁路' in remarks:
            # 提取完整的中国铁路相关文本
            if '中国铁路祝您旅途愉快' in remarks:
                return "中国铁路"
            elif '中国铁路' in remarks:
                return "中国铁路"
        
        # 4. 默认返回
        return "中国铁路"


class AdapterFactory:
    """适配器工厂"""
    
    _adapters = {
        "增值税发票": VATInvoiceAdapter,
        "VAT_INVOICE": VATInvoiceAdapter,
        "火车票": TrainTicketAdapter,
        "TRAIN_TICKET": TrainTicketAdapter,
        "TrainTicket": TrainTicketAdapter
    }
    
    @classmethod
    def create_adapter(cls, invoice_type: str) -> InvoiceAdapter:
        """
        创建适配器实例
        
        Args:
            invoice_type: 发票类型
            
        Returns:
            适配器实例
            
        Raises:
            ValueError: 不支持的发票类型
        """
        adapter_class = cls._adapters.get(invoice_type)
        if not adapter_class:
            raise ValueError(f"不支持的发票类型: {invoice_type}")
        
        return adapter_class()
    
    @classmethod
    def register_adapter(cls, invoice_type: str, adapter_class: type):
        """注册新的适配器"""
        cls._adapters[invoice_type] = adapter_class
    
    @classmethod
    def get_supported_types(cls) -> List[str]:
        """获取支持的发票类型列表"""
        return list(cls._adapters.keys())


def create_invoice_from_ocr(invoice_type: str, ocr_data: Dict[str, Any], 
                          metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
    """
    从OCR数据创建发票对象
    
    Args:
        invoice_type: 发票类型
        ocr_data: OCR原始数据
        metadata: 处理元数据
        
    Returns:
        发票对象
    """
    adapter = AdapterFactory.create_adapter(invoice_type)
    return adapter.from_ocr_data(ocr_data, metadata)


def create_invoice_from_fields(invoice_type: str, fields: List[ParsedField], 
                             metadata: Optional[ProcessingMetadata] = None) -> BaseInvoice:
    """
    从解析字段创建发票对象
    
    Args:
        invoice_type: 发票类型
        fields: 解析字段列表
        metadata: 处理元数据
        
    Returns:
        发票对象
    """
    adapter = AdapterFactory.create_adapter(invoice_type)
    return adapter.from_parsed_fields(fields, metadata)


def convert_to_frontend(invoice: BaseInvoice) -> Dict[str, Any]:
    """
    转换为前端格式
    
    Args:
        invoice: 发票对象
        
    Returns:
        前端格式数据
    """
    adapter = AdapterFactory.create_adapter(invoice.invoice_type)
    return adapter.to_frontend_format(invoice)


def convert_to_storage(invoice: BaseInvoice) -> Dict[str, Any]:
    """
    转换为存储格式
    
    Args:
        invoice: 发票对象
        
    Returns:
        存储格式数据
    """
    adapter = AdapterFactory.create_adapter(invoice.invoice_type)
    return adapter.to_storage_format(invoice)


def convert_from_storage(data: Dict[str, Any]) -> BaseInvoice:
    """
    从存储格式创建发票对象
    
    Args:
        data: 存储格式数据
        
    Returns:
        发票对象
    """
    invoice_type = data.get("invoice_type", InvoiceType.UNKNOWN)
    adapter = AdapterFactory.create_adapter(invoice_type)
    return adapter.from_storage_format(data)