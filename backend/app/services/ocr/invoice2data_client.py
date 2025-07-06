"""
Invoice2Data客户端 - 用于解析中国电子发票
替代外部API，提供本地化、高精度的发票解析服务
"""

import asyncio
import logging
import os
import tempfile
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
import yaml

from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

from .base import BaseOCRClient
from .exceptions import OCRProcessError, OCRConfigError
from .models import StructuredInvoiceData, InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
from .config import OCRConfig
from .post_processors import PostProcessorChain

logger = logging.getLogger(__name__)


class Invoice2DataClient(BaseOCRClient):
    """Invoice2Data客户端，用于本地解析中国电子发票"""
    
    def __init__(self, config: OCRConfig):
        super().__init__(config)
        self.templates_dir = self._setup_templates_directory()
        self.custom_templates = None
        self._load_templates()
        self.post_processor_chain = PostProcessorChain.default_chain()
    
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
            # Use safe_dump to prevent code execution
            yaml.safe_dump(template, f, default_flow_style=False, allow_unicode=True)
        
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
            
            # 应用后处理器链
            processed_result = self.post_processor_chain.process(result)
            
            # 转换为标准格式
            structured_data = self._convert_to_structured_data(processed_result)
            
            logger.info(f"invoice2data处理完成: {file_path}")
            
            return {
                'status': 'success',
                'structured_data': structured_data,
                'raw_data': processed_result,
                'confidence': self._calculate_confidence(processed_result),
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
            # 使用invoice2data默认输入模块
            result = extract_data(file_path, templates=self.custom_templates)
            
            # 获取原始文本用于后续智能处理
            if result:
                try:
                    import fitz  # PyMuPDF
                    doc = fitz.open(file_path)
                    pdf_text = ""
                    for page in doc:
                        pdf_text += page.get_text()
                    doc.close()
                    result['_pdf_text'] = pdf_text
                except Exception:
                    result['_pdf_text'] = ""
                
            return result
        
        # 在线程池中运行同步操作
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_extract)
    
    def _convert_to_structured_data(self, raw_data: Dict[str, Any]) -> StructuredInvoiceData:
        """将invoice2data的原始结果转换为标准的结构化数据"""
        try:
            # 直接使用原始数据
            processed_data = raw_data
            
            # 应用智能后处理
            processed_data = self._apply_intelligent_postprocessing(processed_data)
            
            # 处理火车票站点信息
            if processed_data.get('issuer') == '中国铁路电子客票':
                self._process_railway_stations(processed_data)
            
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
            seller_tax_id = processed_data.get('seller_tax_id')
            # 处理可能返回数组的情况
            if isinstance(seller_tax_id, list) and len(seller_tax_id) > 0:
                seller_tax_id = seller_tax_id[0]  # 取第一个税号
            
            seller_info = InvoicePartyInfo(
                name=processed_data.get('seller_name', '').strip() if processed_data.get('seller_name') else None,
                tax_id=seller_tax_id if isinstance(seller_tax_id, str) else None,
                address=None,  # invoice2data模板未提取地址
                phone=None     # invoice2data模板未提取电话
            )
            
            # 提取买方信息
            buyer_tax_id = processed_data.get('buyer_tax_id')
            # 处理可能返回数组的情况
            if isinstance(buyer_tax_id, list) and len(buyer_tax_id) > 0:
                buyer_tax_id = buyer_tax_id[0]  # 取第一个税号
            
            buyer_info = InvoicePartyInfo(
                name=processed_data.get('buyer_name', '').strip() if processed_data.get('buyer_name') else None,
                tax_id=buyer_tax_id if isinstance(buyer_tax_id, str) else None,
                address=None,
                phone=None
            )
            
            # 提取汇总信息
            # 优先使用amount_pretax作为税前金额，如果没有则使用amount
            amount_pretax = self._safe_get_decimal(processed_data, 'amount_pretax')
            if amount_pretax == 0:
                amount_pretax = self._safe_get_decimal(processed_data, 'amount')
            
            # 获取税额
            tax_amount = self._safe_get_decimal(processed_data, 'tax_amount')
            
            # 获取总金额（价税合计）
            total_amount = self._safe_get_decimal(processed_data, 'amount')
            
            summary = InvoiceSummary(
                amount=amount_pretax,  # 税前金额
                tax_amount=tax_amount,  # 税额
                total_amount=total_amount,  # 价税合计
                amount_in_words=processed_data.get('chinese_amount', '').strip() if processed_data.get('chinese_amount') else None
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
            # Use safe_dump to prevent code execution
            yaml.safe_dump(template_config, f, default_flow_style=False, allow_unicode=True)
        
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
    
    def _apply_intelligent_postprocessing(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        应用智能后处理 - 集成增强提取器的智能逻辑
        
        Args:
            data: 原始提取数据
            
        Returns:
            Dict: 增强后的数据
        """
        # 如果buyer_name或seller_name缺失或质量不高，使用智能提取
        if self._needs_intelligent_extraction(data):
            # 获取原始PDF文本用于上下文分析
            pdf_text = data.get('_pdf_text', '')
            if pdf_text:
                buyer_name, seller_name = self._intelligent_company_extraction(pdf_text, data)
                if buyer_name and (not data.get('buyer_name') or len(data.get('buyer_name', '')) < 4):
                    data['buyer_name'] = buyer_name
                if seller_name and (not data.get('seller_name') or len(data.get('seller_name', '')) < 4):
                    data['seller_name'] = seller_name
        
        # 验证和清理字段
        data = self._validate_and_clean_fields(data)
        
        return data
    
    def _needs_intelligent_extraction(self, data: Dict[str, Any]) -> bool:
        """判断是否需要智能提取"""
        # 检查关键字段质量
        buyer_name = data.get('buyer_name', '')
        seller_name = data.get('seller_name', '')
        
        # 如果任一字段缺失或太短，需要智能提取
        if not buyer_name or len(buyer_name) < 4:
            return True
        if not seller_name or len(seller_name) < 4:
            return True
        
        # 检查是否包含噪音字符
        noise_patterns = ['\\n', '\\t', '  ', '名称', '：', ':']
        for pattern in noise_patterns:
            if pattern in buyer_name or pattern in seller_name:
                return True
        
        return False
    
    def _intelligent_company_extraction(self, text: str, raw_data: Dict) -> tuple:
        """
        智能提取公司名称 - 使用增强提取器的上下文分析方法
        
        Args:
            text: PDF原始文本
            raw_data: 已提取的数据
            
        Returns:
            tuple: (buyer_name, seller_name)
        """
        # 提取所有公司名称
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心|铁路|酒店|宾馆|餐饮|银行|医院|学校|超市|商场)[\u4e00-\u9fa5]*)'
        companies = re.findall(company_pattern, text)
        
        # 过滤和去重
        unique_companies = []
        filter_words = ['统一社', '信用代码', '国家税务', '监制', '税务局', '发票专用章']
        
        for comp in companies:
            if (len(comp) > 3 and 
                not any(word in comp for word in filter_words) and
                comp not in unique_companies):
                unique_companies.append(comp)
        
        # 使用上下文判断买方卖方
        buyer_name, seller_name = self._identify_buyer_seller_by_context(text, unique_companies)
        
        return buyer_name, seller_name
    
    def _identify_buyer_seller_by_context(self, text: str, companies: list) -> tuple:
        """
        根据上下文识别买方和卖方 - 从增强提取器移植
        
        Args:
            text: PDF文本
            companies: 公司名称列表
            
        Returns:
            tuple: (buyer_name, seller_name)
        """
        lines = text.split('\n')
        buyer_name = None
        seller_name = None
        
        # 创建行索引映射，方便查找公司名称所在位置
        company_positions = {}
        for comp in companies:
            for i, line in enumerate(lines):
                if comp in line:
                    if comp not in company_positions:
                        company_positions[comp] = []
                    company_positions[comp].append(i)
        
        # 查找购买方
        buyer_keywords = ['购买方', '购方', '买方', '付款方', '采购方']
        for i, line in enumerate(lines):
            if any(keyword in line for keyword in buyer_keywords):
                # 在关键词附近查找公司名称
                for j in range(max(0, i-3), min(len(lines), i+10)):
                    for comp in companies:
                        if comp in lines[j] and not buyer_name:
                            buyer_name = comp
                            break
                if buyer_name:
                    break
        
        # 查找销售方
        seller_keywords = ['销售方', '销方', '卖方', '收款方', '供应方']
        for i, line in enumerate(lines):
            if any(keyword in line for keyword in seller_keywords):
                # 在关键词附近查找公司名称
                for j in range(max(0, i-3), min(len(lines), i+10)):
                    for comp in companies:
                        if comp in lines[j] and comp != buyer_name and not seller_name:
                            seller_name = comp
                            break
                if seller_name:
                    break
        
        # 如果上下文判断失败，使用位置规则
        if not buyer_name and not seller_name and len(companies) >= 2:
            # 通常第一个出现的是购买方
            buyer_name = companies[0]
            seller_name = companies[1]
        elif not buyer_name and seller_name and len(companies) >= 2:
            # 如果只找到卖方，另一个可能是买方
            for comp in companies:
                if comp != seller_name:
                    buyer_name = comp
                    break
        elif buyer_name and not seller_name and len(companies) >= 2:
            # 如果只找到买方，另一个可能是卖方
            for comp in companies:
                if comp != buyer_name:
                    seller_name = comp
                    break
        
        return buyer_name, seller_name
    
    def _validate_and_clean_fields(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """验证和清理字段"""
        # 特殊处理：火车票的销售方统一设置为"中国铁路12306"
        if data.get('issuer') == '中国铁路电子客票':
            data['seller_name'] = '中国铁路12306'
        
        # 清理公司名称
        if 'buyer_name' in data and data['buyer_name']:
            data['buyer_name'] = self._clean_company_name(data['buyer_name'])
        if 'seller_name' in data and data['seller_name']:
            data['seller_name'] = self._clean_company_name(data['seller_name'])
        
        # 验证发票号码
        if 'invoice_number' in data and data['invoice_number']:
            # 确保是纯数字
            invoice_num = re.sub(r'\D', '', str(data['invoice_number']))
            if len(invoice_num) >= 8:  # 发票号码通常至少8位
                data['invoice_number'] = invoice_num
        
        return data
    
    def _clean_company_name(self, name: str) -> str:
        """清理公司名称"""
        if not name:
            return name
        
        # 移除多余的空格和特殊字符
        name = re.sub(r'\s+', ' ', name)
        name = name.strip()
        
        # 移除可能的噪音后缀
        noise_suffixes = ['名称', '：', ':', '公司名称', '企业名称']
        for suffix in noise_suffixes:
            if name.endswith(suffix):
                name = name[:-len(suffix)].strip()
        
        return name
    
    def _process_railway_stations(self, data: Dict[str, Any]) -> None:
        """
        智能处理火车票站点信息
        
        基于PDF文本布局和上下文，智能判断出发站和到达站
        """
        # 获取所有提取的站点
        all_stations = data.get('all_stations')
        pdf_text = data.get('_pdf_text', '')
        
        if not pdf_text:
            return
            
        # 获取站点列表
        stations = []
        if isinstance(all_stations, list):
            stations = all_stations
        elif isinstance(all_stations, str):
            stations = [all_stations]
        
        # 如果模板提取失败，从PDF文本中提取所有站点
        if not stations:
            stations = re.findall(r'([\u4e00-\u9fa5]+站)', pdf_text)
        
        # 去重但保持顺序
        unique_stations = list(dict.fromkeys(stations))
        
        if len(unique_stations) < 2:
            return
            
        # 智能分析站点顺序：基于发车时间位置和英文站名
        departure_station, arrival_station = self._analyze_station_order(
            pdf_text, unique_stations
        )
        
        if departure_station and arrival_station:
            data['departure_station'] = departure_station
            data['arrival_station'] = arrival_station
            
            # 记录调试信息
            data['_all_stations_found'] = unique_stations
            data['_analysis_method'] = 'intelligent_layout_analysis'
        
        # 清理临时字段
        if 'all_stations' in data:
            del data['all_stations']
    
    def _analyze_station_order(self, pdf_text: str, stations: List[str]) -> tuple:
        """
        基于PDF布局和上下文分析站点顺序
        
        Args:
            pdf_text: PDF原始文本
            stations: 站点列表
            
        Returns:
            tuple: (departure_station, arrival_station)
        """
        lines = pdf_text.split('\n')
        
        # 查找发车时间的位置
        departure_time_line = None
        for i, line in enumerate(lines):
            if re.search(r'\d{1,2}:\d{2}开', line):
                departure_time_line = i
                break
        
        # 查找英文站名的位置和顺序
        english_stations = []
        english_pattern = r'[A-Z][a-z]+'
        for i, line in enumerate(lines):
            if re.match(r'^[A-Z][a-z]+$', line.strip()):
                english_stations.append((i, line.strip()))
        
        # 建立中英文站名的映射关系
        station_positions = {}
        for station in stations:
            for i, line in enumerate(lines):
                if station in line:
                    station_positions[station] = i
                    break
        
        # 策略1: 基于英文站名的出现顺序
        if len(english_stations) >= 2 and len(stations) >= 2:
            # 英文站名通常按出发→到达的顺序出现
            first_english = english_stations[0][1]
            second_english = english_stations[1][1]
            
            # 尝试匹配中文站名
            station_mapping = self._match_chinese_english_stations(
                stations, [first_english, second_english]
            )
            
            if len(station_mapping) >= 2:
                return station_mapping[0], station_mapping[1]
        
        # 策略2: 基于车次规律分析
        train_number = None
        for line in lines:
            train_match = re.search(r'([GDC]\d{4})', line)
            if train_match:
                train_number = train_match.group(1)
                break
        
        if train_number and len(stations) >= 2:
            # 对于G/D开头的高铁，通常第一个站是出发站
            ordered_stations = self._order_stations_by_train_logic(
                train_number, stations, station_positions
            )
            if len(ordered_stations) >= 2:
                return ordered_stations[0], ordered_stations[1]
        
        # 策略3: 基于文本位置（兜底策略）
        if len(stations) >= 2 and station_positions:
            # 按照在PDF中的出现位置排序
            sorted_stations = sorted(stations[:2], key=lambda s: station_positions.get(s, 999))
            return sorted_stations[0], sorted_stations[1]
        
        # 如果所有策略都失败，返回前两个站点
        return stations[0] if len(stations) > 0 else None, stations[1] if len(stations) > 1 else None
    
    def _match_chinese_english_stations(self, chinese_stations: List[str], english_stations: List[str]) -> List[str]:
        """匹配中英文站名"""
        # 简单的匹配逻辑，基于常见的站名对应关系
        station_map = {
            'Guangzhounan': '广州南站',
            'Puning': '普宁站', 
            'Xiamenbei': '厦门北站',
            'Xiamen': '厦门站',
            'Quanzhou': '泉州站'
        }
        
        matched = []
        for eng in english_stations:
            if eng in station_map and station_map[eng] in chinese_stations:
                matched.append(station_map[eng])
        
        # 如果匹配失败，返回原顺序
        if len(matched) < 2:
            return chinese_stations[:2]
        
        return matched
    
    def _order_stations_by_train_logic(self, train_number: str, stations: List[str], positions: Dict[str, int]) -> List[str]:
        """基于车次规律排序站点"""
        # 对于高铁(G/D)，通常按地理位置从南到北或从东到西
        # 这里简化处理，按照PDF中的位置顺序
        if positions:
            return sorted(stations[:2], key=lambda s: positions.get(s, 999))
        return stations[:2]