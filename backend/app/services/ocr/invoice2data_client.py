"""
Invoice2Data客户端 - 用于解析中国电子发票
替代外部API，提供本地化、高精度的发票解析服务
"""

import asyncio
import logging
import os
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, List
import yaml

from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

from .base import BaseOCRClient
from .exceptions import OCRProcessError, OCRConfigError
from .models import StructuredInvoiceData, InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
from .config import OCRConfig
from .text_preprocessor import InvoiceTextPreprocessor

logger = logging.getLogger(__name__)


class Invoice2DataClient(BaseOCRClient):
    """Invoice2Data客户端，用于本地解析中国电子发票"""
    
    def __init__(self, config: OCRConfig):
        super().__init__(config)
        self.templates_dir = self._setup_templates_directory()
        self.custom_templates = None
        self._load_templates()
    
    async def extract_invoice_data(self, file_path: str) -> Dict[str, Any]:
        """
        实现抽象方法：提取发票数据
        """
        return await self.process_single_file(file_path)
    
    def _setup_templates_directory(self) -> Path:
        """设置模板目录"""
        # 在服务目录下创建templates文件夹
        templates_dir = Path(__file__).parent / "templates"
        templates_dir.mkdir(exist_ok=True)
        return templates_dir
    
    def _load_templates(self) -> None:
        """加载自定义模板"""
        try:
            if self.templates_dir.exists() and any(self.templates_dir.iterdir()):
                self.custom_templates = read_templates(str(self.templates_dir))
                logger.info(f"加载了 {len(self.custom_templates)} 个自定义模板")
            else:
                # 创建默认的中国电子发票模板
                self._create_default_template()
                self.custom_templates = read_templates(str(self.templates_dir))
                logger.info(f"创建并加载了默认模板")
        except Exception as e:
            raise OCRConfigError(f"模板加载失败: {str(e)}")
    
    def _create_default_template(self) -> None:
        """创建默认的中国电子发票模板"""
        template = {
            'issuer': '中国电子发票',
            'keywords': ['电子发票', '发票号码', '开票日期'],
            'fields': {
                # 基础信息
                'invoice_number': '发票号码[：:]\\s*(\\d+)',
                'date': '开票日期[：:]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)',
                
                # 基于invoice2data处理后文本的精确正则
                'buyer_name': '购\\s*名称：([^\\s]*[^销]*?)\\s+销',  # 购买方名称在销售方之前
                'seller_name': '销\\s*名称：([^\\n]+)',           # 销售方名称在行尾
                
                # 税号匹配
                'buyer_tax_id': '统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})(?=.*销)',  # 购买方税号
                'seller_tax_id': '销.*?统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})',   # 销售方税号
                
                # 金额信息
                'amount': '价税合计.*?（小写）\\s*¥([\\d,]+\\.?\\d*)',
                'chinese_words': '价税合计（大写）\\s*([^\\n（]+)',
                
                # 其他信息
                'issuer_person': '开票人[：:]\\s*([^\\n\\s]+)'
            },
            'options': {
                'currency': 'CNY',
                'decimal_separator': '.',
                'date_formats': ['%Y年%m月%d日'],
                'remove_whitespace': False,
                'remove_accents': False,
                'lowercase': False
            }
        }
        
        template_file = self.templates_dir / 'china_electronic_invoice.yml'
        with open(template_file, 'w', encoding='utf-8') as f:
            yaml.dump(template, f, default_flow_style=False, allow_unicode=True)
        
        logger.info(f"默认模板已创建: {template_file}")
    
    async def process_single_file(self, file_path: str) -> Dict[str, Any]:
        """
        处理单个PDF文件
        
        Args:
            file_path: PDF文件路径
            
        Returns:
            Dict: 解析结果
            
        Raises:
            OCRProcessError: 处理失败
        """
        try:
            logger.info(f"开始使用invoice2data处理文件: {file_path}")
            
            # 验证文件存在
            if not os.path.exists(file_path):
                raise OCRProcessError(f"文件不存在: {file_path}")
            
            # 使用invoice2data提取数据
            result = await self._extract_data_async(file_path)
            
            if not result:
                raise OCRProcessError(f"invoice2data未能提取到数据: {file_path}")
            
            # 转换为标准格式
            structured_data = self._convert_to_structured_data(result)
            
            logger.info(f"invoice2data处理完成: {file_path}")
            
            return {
                'status': 'success',
                'structured_data': structured_data,
                'raw_data': result,
                'confidence': self._calculate_confidence(result),
                'extraction_method': 'invoice2data'
            }
            
        except Exception as e:
            logger.error(f"invoice2data处理失败: {file_path}, 错误: {e}")
            if isinstance(e, OCRProcessError):
                raise
            raise OCRProcessError(f"处理文件失败: {str(e)}")
    
    async def _extract_data_async(self, file_path: str) -> Optional[Dict[str, Any]]:
        """异步提取数据"""
        def _sync_extract():
            # 使用PyMuPDF作为输入模块替代pdftotext
            # 这解决了Unicode变体字符和空格分割问题
            from . import pymupdf_input
            return extract_data(file_path, templates=self.custom_templates, input_module=pymupdf_input)
        
        # 在线程池中运行同步操作
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_extract)
    
    def _convert_to_structured_data(self, raw_data: Dict[str, Any]) -> StructuredInvoiceData:
        """将invoice2data的原始结果转换为标准的结构化数据"""
        try:
            # 先对原始数据进行后处理
            processed_data = InvoiceTextPreprocessor.preprocess_for_extraction(raw_data)
            
            # 处理特殊的buyer_seller_line字段
            if 'buyer_seller_line' in processed_data:
                buyer_seller = processed_data['buyer_seller_line']
                if isinstance(buyer_seller, tuple) and len(buyer_seller) >= 2:
                    processed_data['buyer_name'] = buyer_seller[0].strip()
                    processed_data['seller_name'] = buyer_seller[1].strip()
            
            # 处理buyer_seller字段（简单模板使用）
            if 'buyer_seller' in processed_data:
                buyer_seller = processed_data['buyer_seller']
                if isinstance(buyer_seller, tuple) and len(buyer_seller) >= 2:
                    processed_data['buyer_name'] = buyer_seller[0].strip()
                    processed_data['seller_name'] = buyer_seller[1].strip()
            
            # 处理buyer_seller_sameline字段
            if 'buyer_seller_sameline' in processed_data:
                buyer_seller = processed_data['buyer_seller_sameline']
                if isinstance(buyer_seller, tuple) and len(buyer_seller) >= 2:
                    processed_data['buyer_name'] = buyer_seller[0].strip()
                    processed_data['seller_name'] = buyer_seller[1].strip()
            
            # 处理带税号的购买方/销售方信息
            if 'buyer_with_tax_id' in processed_data:
                buyer_data = processed_data['buyer_with_tax_id']
                if isinstance(buyer_data, tuple) and len(buyer_data) >= 2:
                    processed_data['buyer_name'] = buyer_data[0].strip()
                    processed_data['buyer_tax_id'] = buyer_data[1]
            
            if 'seller_with_tax_id' in processed_data:
                seller_data = processed_data['seller_with_tax_id']
                if isinstance(seller_data, tuple) and len(seller_data) >= 2:
                    processed_data['seller_name'] = seller_data[0].strip()
                    processed_data['seller_tax_id'] = seller_data[1]
            
            # 如果没有buyer_name，尝试从其他字段获取
            if not processed_data.get('buyer_name'):
                for field in ['buyer_simple', 'buyer_name_alt']:
                    if field in processed_data and processed_data[field]:
                        processed_data['buyer_name'] = processed_data[field].strip()
                        break
            
            # 如果没有seller_name，尝试从其他字段获取
            if not processed_data.get('seller_name'):
                for field in ['seller_simple', 'seller_name_alt']:
                    if field in processed_data and processed_data[field]:
                        processed_data['seller_name'] = processed_data[field].strip()
                        break
            
            # 提取主要信息
            main_info = InvoiceMainInfo(
                invoice_number=processed_data.get('invoice_number', ''),
                invoice_code=processed_data.get('invoice_code'),
                invoice_type='电子发票',
                invoice_date=self._parse_date(processed_data.get('date'))
            )
            
            # 提取卖方信息
            seller_info = InvoicePartyInfo(
                name=processed_data.get('seller_name', '').strip() if processed_data.get('seller_name') else None,
                tax_id=processed_data.get('seller_tax_id'),
                address=None,  # invoice2data模板未提取地址
                phone=None     # invoice2data模板未提取电话
            )
            
            # 提取买方信息
            buyer_info = InvoicePartyInfo(
                name=processed_data.get('buyer_name', '').strip() if processed_data.get('buyer_name') else None,
                tax_id=processed_data.get('buyer_tax_id'),
                address=None,
                phone=None
            )
            
            # 提取汇总信息
            summary = InvoiceSummary(
                amount=self._safe_get_decimal(processed_data, 'amount'),
                tax_amount=None,  # invoice2data模板未单独提取税额
                total_amount=self._safe_get_decimal(processed_data, 'amount'),
                amount_in_words=processed_data.get('chinese_words', '').strip() if processed_data.get('chinese_words') else None
            )
            
            return StructuredInvoiceData(
                main_info=main_info,
                seller_info=seller_info,
                buyer_info=buyer_info,
                summary=summary,
                items=[],  # invoice2data模板未提取明细项目
                issuer_person=processed_data.get('issuer_person', '').strip() if processed_data.get('issuer_person') else None
            )
            
        except Exception as e:
            logger.error(f"结构化数据转换失败: {e}")
            # 返回空的结构化数据而不是抛出异常
            return StructuredInvoiceData(
                main_info=InvoiceMainInfo(invoice_number="转换失败"),
                seller_info=InvoicePartyInfo(),
                buyer_info=InvoicePartyInfo(),
                summary=InvoiceSummary()
            )
    
    def _safe_get_decimal(self, data: Dict[str, Any], key: str) -> float:
        """安全获取并转换为数字"""
        value = data.get(key, 0)
        try:
            if isinstance(value, (int, float)):
                return float(value)
            elif isinstance(value, str):
                # 移除逗号和其他格式字符
                clean_value = value.replace(',', '').replace('¥', '').strip()
                return float(clean_value) if clean_value else 0.0
            return 0.0
        except (ValueError, TypeError):
            return 0.0
    
    def _parse_date(self, date_obj):
        """解析日期对象"""
        if date_obj is None:
            return None
        
        try:
            # invoice2data返回的可能是datetime对象
            if hasattr(date_obj, 'date'):
                return date_obj.date()
            elif hasattr(date_obj, 'strftime'):
                return date_obj
            return None
        except Exception:
            return None
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """计算提取信心度"""
        # 基于提取到的关键字段数量计算信心度
        key_fields = ['invoice_number', 'date', 'amount', 'seller_name', 'buyer_name']
        extracted_count = sum(1 for field in key_fields if result.get(field))
        confidence = min(0.8 + (extracted_count / len(key_fields)) * 0.2, 1.0)
        return confidence
    
    async def process_batch_files(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        """
        批量处理多个PDF文件
        
        Args:
            file_paths: PDF文件路径列表
            
        Returns:
            List[Dict]: 处理结果列表
        """
        results = []
        
        for file_path in file_paths:
            try:
                result = await self.process_single_file(file_path)
                results.append(result)
            except Exception as e:
                logger.error(f"批量处理文件失败: {file_path}, 错误: {e}")
                results.append({
                    'status': 'error',
                    'file_path': file_path,
                    'error': str(e),
                    'extraction_method': 'invoice2data'
                })
        
        return results
    
    def add_custom_template(self, template_name: str, template_config: Dict[str, Any]) -> None:
        """添加自定义模板"""
        template_file = self.templates_dir / f"{template_name}.yml"
        
        with open(template_file, 'w', encoding='utf-8') as f:
            yaml.dump(template_config, f, default_flow_style=False, allow_unicode=True)
        
        # 重新加载模板
        self._load_templates()
        logger.info(f"自定义模板已添加: {template_name}")
    
    def list_templates(self) -> List[str]:
        """列出可用的模板"""
        if self.custom_templates:
            return [template.get('issuer', 'Unknown') for template in self.custom_templates]
        return []
    
    async def health_check(self) -> bool:
        """健康检查"""
        try:
            return len(self.custom_templates) > 0 if self.custom_templates else False
        except Exception:
            return False