#!/usr/bin/env python3
"""
OCR字段适配器
负责将OCR返回的字段格式转换为前端期望的统一格式
"""

from typing import Dict, Any, Optional
import logging
import re
from datetime import datetime

from app.utils.field_mapping import (
    normalize_fields_dict, 
    merge_duplicate_fields, 
    normalize_field_name,
    SPECIAL_FIELDS
)

logger = logging.getLogger(__name__)

class OCRFieldAdapter:
    """
    OCR字段适配器
    
    负责：
    1. 统一字段命名格式（camelCase -> snake_case）
    2. 去除重复字段
    3. 处理特殊字段逻辑
    4. 保持数据完整性
    """
    
    def __init__(self):
        self.stats = {
            'processed_fields': 0,
            'duplicates_merged': 0,
            'special_fields_processed': 0,
            'errors': 0
        }
    
    def adapt_fields(self, ocr_fields: Dict[str, Any], invoice_type: str = None) -> Dict[str, Any]:
        """
        转换OCR字段到统一的snake_case格式
        
        Args:
            ocr_fields: OCR返回的字段字典
            invoice_type: 发票类型，用于特殊字段处理
            
        Returns:
            转换后的字段字典
        """
        if not ocr_fields:
            return {}
        
        try:
            logger.debug(f"开始适配字段，原始字段数: {len(ocr_fields)}")
            
            # 步骤1：合并重复字段
            merged_fields = merge_duplicate_fields(ocr_fields)
            if len(merged_fields) < len(ocr_fields):
                self.stats['duplicates_merged'] += len(ocr_fields) - len(merged_fields)
                logger.info(f"合并重复字段: {len(ocr_fields)} -> {len(merged_fields)}")
            
            # 步骤2：标准化字段名
            normalized_fields = normalize_fields_dict(merged_fields)
            
            # 步骤3：处理特殊字段
            final_fields = self._process_special_fields(normalized_fields, invoice_type)
            
            # 步骤4：数据验证
            self._validate_output(final_fields)
            
            self.stats['processed_fields'] = len(final_fields)
            logger.debug(f"字段适配完成，最终字段数: {len(final_fields)}")
            
            return final_fields
            
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"字段适配失败: {str(e)}")
            # 返回原始字段作为fallback
            return ocr_fields
    
    def _process_special_fields(self, fields: Dict[str, Any], invoice_type: str = None) -> Dict[str, Any]:
        """
        处理特殊字段逻辑
        
        Args:
            fields: 标准化后的字段
            invoice_type: 发票类型
            
        Returns:
            处理后的字段
        """
        result = fields.copy()
        
        try:
            # 处理消费日期
            if 'consumption_date' not in result:
                consumption_date = self._calculate_consumption_date(result, invoice_type)
                if consumption_date:
                    result['consumption_date'] = consumption_date
                    self.stats['special_fields_processed'] += 1
            
            # 处理火车票特殊字段
            if invoice_type in ['火车票', 'TrainTicket']:
                result = self._process_train_ticket_fields(result)
            
            # 处理增值税发票特殊字段
            elif invoice_type in ['增值税发票', 'VAT_INVOICE']:
                result = self._process_vat_invoice_fields(result)
            
            return result
            
        except Exception as e:
            logger.error(f"特殊字段处理失败: {str(e)}")
            return result
    
    def _calculate_consumption_date(self, fields: Dict[str, Any], invoice_type: str = None) -> Optional[str]:
        """
        计算消费日期
        
        Args:
            fields: 字段字典
            invoice_type: 发票类型
            
        Returns:
            消费日期字符串 (ISO格式)
        """
        try:
            # 火车票：使用发车时间
            if invoice_type in ['火车票', 'TrainTicket']:
                departure_time = fields.get('departure_time', '')
                if departure_time:
                    # 从 "2025年03月15日 14:30" 格式提取日期
                    date_match = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', departure_time)
                    if date_match:
                        year, month, day = date_match.groups()
                        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            
            # 其他发票类型：使用开票日期
            invoice_date = fields.get('invoice_date', '')
            if invoice_date:
                return self._normalize_date_format(invoice_date)
            
            return None
            
        except Exception as e:
            logger.error(f"计算消费日期失败: {str(e)}")
            return None
    
    def _normalize_date_format(self, date_str: str) -> Optional[str]:
        """
        标准化日期格式为ISO格式
        
        Args:
            date_str: 日期字符串
            
        Returns:
            ISO格式日期字符串
        """
        if not date_str:
            return None
        
        try:
            # 已经是ISO格式
            if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
                return date_str
            
            # 中文格式：2025年03月15日
            date_match = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', date_str)
            if date_match:
                year, month, day = date_match.groups()
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            
            # 其他格式尝试解析
            for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y.%m.%d']:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            logger.warning(f"无法解析日期格式: {date_str}")
            return None
            
        except Exception as e:
            logger.error(f"日期格式标准化失败: {str(e)}")
            return None
    
    def _process_train_ticket_fields(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理火车票特殊字段
        
        Args:
            fields: 字段字典
            
        Returns:
            处理后的字段
        """
        result = fields.copy()
        
        try:
            # 确保火车票必要字段存在
            if 'seller_name' not in result:
                result['seller_name'] = '中国铁路'
            
            # 票号字段统一
            if 'ticket_number' not in result and 'invoice_number' in result:
                result['ticket_number'] = result['invoice_number']
            
            # 乘客信息字段统一
            if 'buyer_name' not in result and 'passenger_name' in result:
                result['buyer_name'] = result['passenger_name']
            
            # 票价字段统一
            if 'total_amount' not in result and 'ticket_price' in result:
                result['total_amount'] = result['ticket_price']
            
            return result
            
        except Exception as e:
            logger.error(f"火车票字段处理失败: {str(e)}")
            return result
    
    def _process_vat_invoice_fields(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理增值税发票特殊字段
        
        Args:
            fields: 字段字段
            
        Returns:
            处理后的字段
        """
        result = fields.copy()
        
        try:
            # 金额字段处理
            if 'amount_without_tax' not in result and 'total_amount' in result and 'tax_amount' in result:
                try:
                    total = float(result['total_amount'])
                    tax = float(result['tax_amount'])
                    result['amount_without_tax'] = str(total - tax)
                except (ValueError, TypeError):
                    pass
            
            # 发票详情字段处理
            if 'invoice_details' not in result:
                result['invoice_details'] = []
            # 保持 invoice_details 的原始结构（列表或其他格式）
            
            return result
            
        except Exception as e:
            logger.error(f"增值税发票字段处理失败: {str(e)}")
            return result
    
    def _validate_output(self, fields: Dict[str, Any]) -> None:
        """
        验证输出字段的正确性
        
        Args:
            fields: 输出字段字典
        """
        try:
            # 检查字段名格式
            for key in fields.keys():
                if not isinstance(key, str):
                    logger.warning(f"字段名不是字符串: {key}")
                    continue
                
                # 检查是否符合snake_case格式
                if not re.match(r'^[a-z0-9_]+$', key):
                    logger.warning(f"字段名不符合snake_case格式: {key}")
            
            # 检查必要字段
            required_fields = ['invoice_number', 'invoice_date']
            missing_fields = [field for field in required_fields if field not in fields]
            if missing_fields:
                logger.warning(f"缺少必要字段: {missing_fields}")
            
        except Exception as e:
            logger.error(f"字段验证失败: {str(e)}")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取适配器统计信息
        
        Returns:
            统计信息字典
        """
        return self.stats.copy()
    
    def reset_stats(self) -> None:
        """重置统计信息"""
        self.stats = {
            'processed_fields': 0,
            'duplicates_merged': 0,
            'special_fields_processed': 0,
            'errors': 0
        }

# 全局适配器实例
ocr_field_adapter = OCRFieldAdapter()