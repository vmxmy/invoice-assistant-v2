"""
OCR后处理器模块

提供可插拔的后处理器链，用于处理OCR提取后的数据。
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import re
import logging

logger = logging.getLogger(__name__)


class PostProcessor(ABC):
    """后处理器基类"""
    
    @abstractmethod
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        处理数据
        
        Args:
            data: 输入数据
            
        Returns:
            处理后的数据
        """
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """处理器名称"""
        pass


class RailwayTicketProcessor(PostProcessor):
    """火车票后处理器"""
    
    @property
    def name(self) -> str:
        return "railway_ticket"
    
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """处理火车票特殊字段"""
        # 处理座位号格式
        if 'seat_no' in data and data['seat_no']:
            # 标准化座位号格式
            seat = str(data['seat_no']).strip()
            # 移除可能的空格
            seat = re.sub(r'\s+', '', seat)
            data['seat_no'] = seat
        
        # 处理车次号
        if 'train_number' in data and data['train_number']:
            train = str(data['train_number']).strip().upper()
            data['train_number'] = train
        
        # 标准化站名
        for field in ['departure_station', 'arrival_station']:
            if field in data and data[field]:
                # 移除"站"字后缀
                station = str(data[field]).strip()
                if station.endswith('站'):
                    station = station[:-1]
                data[field] = station
        
        return data


class CompanyNameProcessor(PostProcessor):
    """公司名称清理处理器"""
    
    @property
    def name(self) -> str:
        return "company_name"
    
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """清理公司名称中的多余字符"""
        company_fields = ['seller_name', 'buyer_name']
        
        for field in company_fields:
            if field in data and data[field]:
                name = str(data[field]).strip()
                
                # 移除可能的OCR错误字符
                name = re.sub(r'[◆◇□■]', '', name)
                
                # 移除多余的空格
                name = re.sub(r'\s+', ' ', name)
                
                # 移除行尾的冒号或分号
                name = re.sub(r'[:;：；]+$', '', name)
                
                # 确保不为空
                if name:
                    data[field] = name
        
        return data


class AmountValidationProcessor(PostProcessor):
    """金额验证处理器"""
    
    @property
    def name(self) -> str:
        return "amount_validation"
    
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """验证和修正金额关系"""
        amount_fields = ['amount', 'tax_amount', 'total_amount', 'amount_pretax']
        
        # 转换金额为浮点数
        amounts = {}
        for field in amount_fields:
            if field in data:
                try:
                    value = data[field]
                    if isinstance(value, str):
                        # 移除货币符号和逗号
                        value = value.replace('¥', '').replace(',', '').strip()
                    amounts[field] = float(value) if value else 0.0
                except (ValueError, TypeError):
                    amounts[field] = 0.0
        
        # 如果有amount_pretax和tax_amount，计算total_amount
        if 'amount_pretax' in amounts and 'tax_amount' in amounts:
            calculated_total = amounts['amount_pretax'] + amounts['tax_amount']
            
            # 如果没有total_amount或差异太大，使用计算值
            if 'total_amount' not in amounts or abs(amounts.get('total_amount', 0) - calculated_total) > 0.01:
                amounts['total_amount'] = calculated_total
                logger.info(f"Calculated total_amount: {calculated_total}")
        
        # 如果有total_amount和tax_amount，计算amount_pretax
        elif 'total_amount' in amounts and 'tax_amount' in amounts:
            amounts['amount_pretax'] = amounts['total_amount'] - amounts['tax_amount']
        
        # 更新数据
        for field, value in amounts.items():
            data[field] = value
        
        return data


class DateNormalizationProcessor(PostProcessor):
    """日期格式标准化处理器"""
    
    @property
    def name(self) -> str:
        return "date_normalization"
    
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """标准化日期格式为YYYY-MM-DD"""
        date_fields = ['date', 'invoice_date', 'billing_date']
        
        for field in date_fields:
            if field in data and data[field]:
                date_str = str(data[field])
                
                # 处理中文日期格式
                if '年' in date_str and '月' in date_str and '日' in date_str:
                    # 已经是正确格式，跳过
                    continue
                
                # 处理YYYYMMDD格式
                if re.match(r'^\d{8}$', date_str):
                    data[field] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                
                # 处理YYYY/MM/DD格式
                elif '/' in date_str:
                    data[field] = date_str.replace('/', '-')
        
        return data


class PostProcessorChain:
    """后处理器链"""
    
    def __init__(self):
        self.processors: List[PostProcessor] = []
        
    def add_processor(self, processor: PostProcessor) -> 'PostProcessorChain':
        """添加处理器"""
        self.processors.append(processor)
        logger.info(f"Added processor: {processor.name}")
        return self
    
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """依次执行所有处理器"""
        result = data.copy()
        
        for processor in self.processors:
            try:
                result = processor.process(result)
                logger.debug(f"Processor {processor.name} completed")
            except Exception as e:
                logger.error(f"Error in processor {processor.name}: {e}")
                # 继续执行其他处理器
                continue
        
        return result
    
    @classmethod
    def default_chain(cls) -> 'PostProcessorChain':
        """创建默认处理器链"""
        chain = cls()
        chain.add_processor(DateNormalizationProcessor())
        chain.add_processor(CompanyNameProcessor())
        chain.add_processor(AmountValidationProcessor())
        chain.add_processor(RailwayTicketProcessor())
        return chain