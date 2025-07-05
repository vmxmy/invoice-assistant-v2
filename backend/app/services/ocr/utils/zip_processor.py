"""
ZIP文件处理器
"""

import asyncio
import json
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, Any, Optional
import httpx
import logging

from ..exceptions import OCRZipProcessError, OCRTimeoutError
from ..models import StructuredInvoiceData, InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary

logger = logging.getLogger(__name__)


class ZipProcessor:
    """ZIP文件下载和解析处理器"""
    
    def __init__(self, download_timeout: int = 120):
        self.download_timeout = download_timeout
    
    async def download_and_extract(
        self, 
        zip_url: str, 
        cache_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        下载并解析ZIP文件
        
        Args:
            zip_url: ZIP文件下载URL
            cache_dir: 缓存目录（可选）
            
        Returns:
            Dict: 解析后的结构化数据
            
        Raises:
            OCRZipProcessError: ZIP处理错误
            OCRTimeoutError: 下载超时
        """
        temp_dir = None
        try:
            # 创建临时目录
            temp_dir = Path(tempfile.mkdtemp(prefix="ocr_zip_"))
            zip_path = temp_dir / "result.zip"
            
            logger.info(f"开始下载ZIP文件: {zip_url}")
            
            # 下载ZIP文件
            await self._download_zip(zip_url, zip_path)
            
            logger.info(f"ZIP文件下载完成，开始解压: {zip_path}")
            
            # 解压ZIP文件
            extract_dir = temp_dir / "extracted"
            self._extract_zip(zip_path, extract_dir)
            
            # 解析JSON结果
            result_data = self._parse_result_files(extract_dir)
            
            # 提取结构化数据
            structured_data = self._extract_structured_data(result_data)
            
            logger.info("ZIP文件处理完成")
            
            return {
                'status': 'success',
                'structured_data': structured_data,
                'raw_data': result_data,
                'confidence': result_data.get('confidence', 0.8),
                'extraction_method': 'mineru_v4'
            }
            
        except Exception as e:
            logger.error(f"ZIP处理失败: {e}")
            if isinstance(e, (OCRZipProcessError, OCRTimeoutError)):
                raise
            raise OCRZipProcessError(f"ZIP处理失败: {str(e)}")
        
        finally:
            # 清理临时文件
            if temp_dir and temp_dir.exists():
                try:
                    import shutil
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"清理临时文件失败: {e}")
    
    async def _download_zip(self, url: str, save_path: Path) -> None:
        """下载ZIP文件"""
        try:
            async with httpx.AsyncClient(timeout=self.download_timeout) as client:
                async with client.stream('GET', url) as response:
                    response.raise_for_status()
                    
                    import aiofiles
                    async with aiofiles.open(save_path, 'wb') as f:
                        async for chunk in response.aiter_bytes():
                            await f.write(chunk)
                            
        except httpx.TimeoutException:
            raise OCRTimeoutError(
                f"ZIP下载超时: {self.download_timeout}秒",
                timeout_seconds=self.download_timeout,
                operation="download_zip",
                context={'url': url, 'save_path': str(save_path)}
            )
        except httpx.HTTPStatusError as e:
            raise OCRZipProcessError(
                f"ZIP下载失败: HTTP {e.response.status_code}",
                zip_path=str(save_path),
                operation="download",
                context={'status_code': e.response.status_code, 'url': url}
            )
        except Exception as e:
            raise OCRZipProcessError(
                f"ZIP下载失败: {str(e)}",
                zip_path=str(save_path),
                operation="download",
                context={'error_type': type(e).__name__, 'url': url}
            )
    
    def _extract_zip(self, zip_path: Path, extract_dir: Path) -> None:
        """解压ZIP文件"""
        try:
            extract_dir.mkdir(parents=True, exist_ok=True)
            
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
                
        except zipfile.BadZipFile:
            raise OCRZipProcessError("ZIP文件损坏")
        except Exception as e:
            raise OCRZipProcessError(f"ZIP解压失败: {str(e)}")
    
    def _parse_result_files(self, extract_dir: Path) -> Dict[str, Any]:
        """解析解压后的结果文件"""
        try:
            # 查找特定的Mineru结果文件
            result_data = {}
            
            # 1. 读取content_list.json（内容列表）
            content_list_files = list(extract_dir.glob("**/*content_list.json"))
            if content_list_files:
                with open(content_list_files[0], 'r', encoding='utf-8') as f:
                    content_list = json.load(f)
                result_data['content_list'] = content_list
                logger.info(f"解析content_list.json: {content_list_files[0]}")
            
            # 2. 读取full.md（完整文档）
            md_files = list(extract_dir.glob("**/full.md"))
            if md_files:
                with open(md_files[0], 'r', encoding='utf-8') as f:
                    md_content = f.read()
                result_data['full_text'] = md_content
                logger.info(f"读取full.md: {md_files[0]}")
            
            # 3. 读取layout.json（布局信息）
            layout_files = list(extract_dir.glob("**/layout.json"))
            if layout_files:
                with open(layout_files[0], 'r', encoding='utf-8') as f:
                    layout_data = json.load(f)
                result_data['layout'] = layout_data
                logger.info(f"解析layout.json: {layout_files[0]}")
            
            if not result_data:
                raise OCRZipProcessError("未找到任何有效的结果文件")
            
            return result_data
            
        except json.JSONDecodeError as e:
            raise OCRZipProcessError(f"JSON解析失败: {str(e)}")
        except Exception as e:
            raise OCRZipProcessError(f"结果文件解析失败: {str(e)}")
    
    def _extract_structured_data(self, raw_data: Dict[str, Any]) -> StructuredInvoiceData:
        """从原始数据提取结构化发票数据"""
        try:
            # 根据Mineru V4 API的实际响应格式来解析
            full_text = raw_data.get('full_text', '')
            content_list = raw_data.get('content_list', [])
            
            # 从文本中提取发票信息
            extracted_data = self._parse_invoice_text(full_text, content_list, raw_data)
            
            # 提取主要信息
            main_info = InvoiceMainInfo(
                invoice_number=extracted_data.get('invoice_number', ''),
                invoice_code=extracted_data.get('invoice_code'),
                invoice_type=extracted_data.get('invoice_type', '电子发票'),
                invoice_date=self._parse_date(extracted_data.get('invoice_date'))
            )
            
            # 提取卖方信息
            seller_info = InvoicePartyInfo(
                name=extracted_data.get('seller_name'),
                tax_id=extracted_data.get('seller_tax_id'),
                address=extracted_data.get('seller_address'),
                phone=extracted_data.get('seller_phone')
            )
            
            # 提取买方信息
            buyer_info = InvoicePartyInfo(
                name=extracted_data.get('buyer_name'),
                tax_id=extracted_data.get('buyer_tax_id'),
                address=extracted_data.get('buyer_address'),
                phone=extracted_data.get('buyer_phone')
            )
            
            # 提取汇总信息
            summary = InvoiceSummary(
                amount=self._safe_get_decimal(extracted_data, 'amount'),
                tax_amount=self._safe_get_decimal(extracted_data, 'tax_amount'),
                total_amount=self._safe_get_decimal(extracted_data, 'total_amount'),
                amount_in_words=extracted_data.get('amount_in_words')
            )
            
            return StructuredInvoiceData(
                main_info=main_info,
                seller_info=seller_info,
                buyer_info=buyer_info,
                summary=summary,
                items=[]  # 简化处理，不解析明细项目
            )
            
        except Exception as e:
            logger.error(f"结构化数据提取失败: {e}")
            # 返回空的结构化数据而不是抛出异常
            return StructuredInvoiceData(
                main_info=InvoiceMainInfo(invoice_number="解析失败"),
                seller_info=InvoicePartyInfo(),
                buyer_info=InvoicePartyInfo(),
                summary=InvoiceSummary()
            )
    
    def _safe_get(self, data: Dict[str, Any], key: str, default: Any = None) -> Any:
        """安全获取字典值"""
        return data.get(key, default)
    
    def _safe_get_decimal(self, data: Dict[str, Any], key: str) -> float:
        """安全获取并转换为数字"""
        value = data.get(key, 0)
        try:
            return float(value) if value is not None else 0.0
        except (ValueError, TypeError):
            return 0.0
    
    def _parse_invoice_text(self, full_text: str, content_list: list, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """从文本中解析发票信息"""
        import re
        
        extracted = {}
        
        # 从文本中提取发票号码
        invoice_num_match = re.search(r'发票号码[：:]\s*(\d+)', full_text)
        if invoice_num_match:
            extracted['invoice_number'] = invoice_num_match.group(1)
        
        # 从文本中提取开票日期
        date_match = re.search(r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{1,2}-\d{1,2})', full_text)
        if date_match:
            extracted['invoice_date'] = date_match.group(1)
        
        # 从HTML表格中提取销售方名称 - 尝试多种模式
        seller_name = None
        
        # 模式1: 标准格式 "销售方信息 名称：公司名"
        seller_match = re.search(r'销售方信息[^>]*名称[：:]\s*([^<\n]+)', full_text)
        if seller_match:
            seller_name = seller_match.group(1).strip()
        
        # 模式2: 查找表格中紧跟销售方信息后的公司名称
        if not seller_name:
            # 在表格中查找包含公司名称的模式
            seller_patterns = [
                r'销售方[^>]*?([^<]*?(?:有限公司|股份有限公司|企业|商行|商店|工厂|中心|公司)[^<]*)',
                r'<td[^>]*>([^<]*(?:有限公司|股份有限公司|企业|商行|商店|工厂|中心|公司)[^<]*)</td>',
                r'名称[：:]\s*([^<\n]*(?:有限公司|股份有限公司|企业|商行|商店|工厂|中心|公司)[^<\n]*)'
            ]
            
            for pattern in seller_patterns:
                match = re.search(pattern, full_text)
                if match:
                    potential_name = match.group(1).strip()
                    # 过滤掉明显不是公司名的内容
                    if potential_name and len(potential_name) > 2 and not re.match(r'^[0-9\s.]+$', potential_name):
                        seller_name = potential_name
                        break
        
        # 模式3: 从content_list中查找文本类型的公司名
        if not seller_name and content_list:
            for item in content_list:
                if item.get('type') == 'text':
                    text = item.get('text', '')
                    # 查找包含公司名的文本
                    company_match = re.search(r'([^,，\s]*(?:有限公司|股份有限公司|企业|商行|商店|工厂|中心|公司))', text)
                    if company_match:
                        potential_name = company_match.group(1).strip()
                        if len(potential_name) > 2:
                            seller_name = potential_name
                            break
        
        # 模式4: 对于特殊情况，从税务机关信息推断
        if not seller_name:
            # 对于一些个体工商户或小企业发票，可能只有税务机关信息
            tax_bureau_match = re.search(r'(湖南省税务局|.*省税务局|.*市税务局)', full_text)
            if tax_bureau_match:
                # 这种情况下，销售方可能是个体户，暂时使用税务机关作为区域标识
                # 实际应用中，这种发票需要人工审核或从其他字段推断
                extracted['seller_region'] = tax_bureau_match.group(1)
                # 对于无法提取销售方名称的情况，标记为需要人工确认
                extracted['seller_name'] = '[个体经营者-需人工确认]'
                seller_name = extracted['seller_name']
        
        if seller_name:
            # 清理提取的名称
            if seller_name != '[个体经营者-需人工确认]':
                seller_name = re.sub(r'^[^\u4e00-\u9fff]*', '', seller_name)  # 移除开头的非中文字符
                seller_name = re.sub(r'[^)\u4e00-\u9fff(（）\w\s]+.*$', '', seller_name)  # 移除尾部的特殊字符
                extracted['seller_name'] = seller_name.strip()
            else:
                extracted['seller_name'] = seller_name
        
        # 从HTML表格中提取税号
        tax_id_matches = re.findall(r'统一社会信用代码/纳税人识别号[：:](\w+)', full_text)
        if tax_id_matches:
            if len(tax_id_matches) >= 2:
                extracted['buyer_tax_id'] = tax_id_matches[0]
                extracted['seller_tax_id'] = tax_id_matches[1]
            else:
                extracted['seller_tax_id'] = tax_id_matches[0]
        
        # 提取大写金额（先提取大写金额）
        words_match = re.search(r'价税合计\s*\(大写\)\s*([^<\n]+)', full_text)
        if words_match:
            amount_words = words_match.group(1).strip()
            extracted['amount_in_words'] = amount_words
            # 尝试将大写金额转换为数字作为主要金额
            numeric_amount = self._convert_chinese_amount_to_number(amount_words)
            if numeric_amount:
                extracted['total_amount'] = numeric_amount
        
        # 如果没有从大写金额得到数字，则提取数字金额
        if 'total_amount' not in extracted:
            # 提取所有金额，优先选择较大的（通常是价税合计）
            amount_matches = re.findall(r'¥([\d,]+\.?\d*)', full_text)
            if amount_matches:
                amounts = []
                for match in amount_matches:
                    try:
                        amount = float(match.replace(',', ''))
                        amounts.append(amount)
                    except ValueError:
                        continue
                
                if amounts:
                    # 选择最大的金额作为价税合计（通常发票上最大金额就是总金额）
                    extracted['total_amount'] = max(amounts)
                    # 同时记录合计金额（不含税）
                    if len(amounts) > 1:
                        extracted['amount'] = min(amounts)
        
        # 提取开票人
        issuer_match = re.search(r'开票人[：:]\s*([^<\n]+)', full_text)
        if issuer_match:
            extracted['issuer'] = issuer_match.group(1).strip()
        
        return extracted
    
    def _convert_chinese_amount_to_number(self, chinese_amount: str) -> Optional[float]:
        """将中文大写金额转换为数字"""
        try:
            # 中文数字映射
            chinese_nums = {
                '零': 0, '壹': 1, '贰': 2, '叁': 3, '肆': 4, '伍': 5, 
                '陆': 6, '柒': 7, '捌': 8, '玖': 9,
                '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
                '六': 6, '七': 7, '八': 8, '九': 9
            }
            
            # 清理输入
            amount_str = chinese_amount.replace('圆', '').replace('元', '').replace('整', '').strip()
            
            # 处理常见格式 "贰佰肆拾" = 240
            result = 0
            temp_num = 0
            
            i = 0
            while i < len(amount_str):
                char = amount_str[i]
                
                if char in chinese_nums:
                    temp_num = chinese_nums[char]
                elif char in ['拾', '十']:
                    if temp_num == 0:
                        temp_num = 1  # 处理"十"开头的情况
                    result += temp_num * 10
                    temp_num = 0
                elif char in ['佰', '百']:
                    result += temp_num * 100
                    temp_num = 0
                elif char in ['仟', '千']:
                    result += temp_num * 1000
                    temp_num = 0
                elif char in ['万']:
                    result = (result + temp_num) * 10000
                    temp_num = 0
                elif char in ['亿']:
                    result = (result + temp_num) * 100000000
                    temp_num = 0
                
                i += 1
            
            # 加上最后的数字
            result += temp_num
            
            return float(result) if result > 0 else None
            
        except Exception as e:
            logger.warning(f"中文金额转换失败: {chinese_amount}, 错误: {e}")
            return None
    
    def _parse_date(self, date_str: Optional[str]):
        """解析日期字符串"""
        if not date_str:
            return None
        
        try:
            from datetime import datetime
            # 尝试多种日期格式
            for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%Y年%m月%d日']:
                try:
                    return datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            return None
        except Exception:
            return None 