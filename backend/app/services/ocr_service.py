"""
OCR服务
集成Mineru API进行PDF发票数据提取
"""

import json
import re
import os
from typing import Dict, Any, Optional
from pathlib import Path

import httpx
from app.core.config import settings
from app.utils.logger import get_logger
from app.utils.path_validator import validate_file_path as original_validate_file_path

logger = get_logger(__name__)


def validate_file_path(file_path: str) -> Path:
    """
    验证文件路径安全性（支持绝对路径）
    
    Args:
        file_path: 文件路径（可以是绝对路径或相对路径）
        
    Returns:
        Path: 安全的路径对象
        
    Raises:
        ValueError: 路径不安全
    """
    try:
        # 转换为Path对象
        path = Path(file_path).resolve()
        
        # 确保是文件而不是目录
        if path.is_dir():
            raise ValueError("路径指向目录而非文件")
        
        # 确保文件在允许的目录内
        allowed_dirs = []
        
        # 添加配置的上传目录
        if hasattr(settings, 'upload_dir'):
            allowed_dirs.append(Path(settings.upload_dir).resolve())
        
        # 添加配置的下载目录
        if hasattr(settings, 'downloads_dir'):
            allowed_dirs.append(Path(settings.downloads_dir).resolve())
        
        # 添加临时目录
        allowed_dirs.append(Path('/tmp').resolve())
        allowed_dirs.append(Path('/var/tmp').resolve())
        
        # 检查文件是否在允许的目录内
        path_allowed = False
        for allowed_dir in allowed_dirs:
            try:
                path.relative_to(allowed_dir)
                path_allowed = True
                break
            except ValueError:
                continue
        
        if not path_allowed and allowed_dirs:
            raise ValueError(f"文件路径不在允许的目录范围内")
        
        return path
        
    except Exception as e:
        raise ValueError(f"无效的文件路径: {str(e)}")


class OCRService:
    """OCR服务类，负责调用外部API进行发票数据提取"""
    
    def __init__(self):
        """初始化OCR服务"""
        self.api_token = settings.mineru_api_token
        self.base_url = settings.mineru_api_base_url.rstrip('/')
        self.timeout = 120.0  # 2分钟超时
        
        if not self.api_token:
            logger.warning("Mineru API Token未配置，OCR功能将无法使用")
    
    async def extract_invoice_data(self, file_path: str) -> Dict[str, Any]:
        """
        从PDF文件提取发票数据
        
        Args:
            file_path: PDF文件路径
            
        Returns:
            Dict: 提取的发票数据
        """
        try:
            # 验证文件路径安全性
            safe_path = validate_file_path(file_path)
            
            # 检查文件是否存在
            if not safe_path.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 检查文件扩展名
            if safe_path.suffix.lower() != '.pdf':
                raise ValueError(f"不支持的文件类型: {safe_path.suffix}")
            
            if not self.api_token:
                return await self._mock_extraction(str(safe_path))
            
            # 上传文件并获取提取结果
            result = await self._call_mineru_api(str(safe_path))
            
            # 解析和标准化结果
            parsed_result = self._parse_extraction_result(result)
            
            logger.info(f"OCR提取完成 - 文件: {safe_path}")
            return parsed_result
            
        except Exception as e:
            logger.error(f"OCR提取失败 - 文件: {file_path}, 错误: {e}")
            # 返回基础的mock数据，包含错误信息
            return {
                "status": "error",
                "error": str(e),
                "confidence": 0.0,
                "extraction_method": "failed"
            }
    
    async def _call_mineru_api(self, file_path: str) -> Dict[str, Any]:
        """调用Mineru API"""
        try:
            # 再次验证文件路径（双重保护）
            safe_path = validate_file_path(file_path)
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 上传文件
                with open(safe_path, 'rb') as file:
                    files = {"file": (safe_path.name, file, "application/pdf")}
                    headers = {
                        "Authorization": f"Bearer {self.api_token}",
                        "User-Agent": "InvoiceAssistant/2.0"
                    }
                    
                    response = await client.post(
                        f"{self.base_url}/api/v1/extract/invoice",
                        files=files,
                        headers=headers
                    )
                    
                    response.raise_for_status()
                    return response.json()
                    
        except httpx.TimeoutException:
            logger.error(f"Mineru API调用超时 - 文件: {file_path}")
            raise Exception("OCR API调用超时")
        except httpx.HTTPStatusError as e:
            logger.error(f"Mineru API返回错误 - 状态码: {e.response.status_code}, 响应: {e.response.text}")
            raise Exception(f"OCR API错误: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Mineru API调用失败: {e}")
            raise e
    
    def _parse_extraction_result(self, api_result: Dict[str, Any]) -> Dict[str, Any]:
        """解析API返回的提取结果"""
        try:
            # 标准化字段映射
            field_mapping = {
                "invoice_number": ["invoiceNumber", "invoice_no", "number", "票号"],
                "seller_name": ["sellerName", "seller", "company", "销售方"],
                "buyer_name": ["buyerName", "buyer", "purchaser", "购买方"],
                "invoice_date": ["invoiceDate", "date", "开票日期"],
                "amount": ["amount", "subtotal", "金额"],
                "tax_amount": ["taxAmount", "tax", "税额"],
                "total_amount": ["totalAmount", "total", "合计"],
                "project_name": ["projectName", "project", "description", "项目"],
                "remarks": ["remarks", "note", "memo", "备注"]
            }
            
            extracted_data = {}
            raw_data = api_result.get("data", {})
            
            # 映射字段
            for standard_key, possible_keys in field_mapping.items():
                for key in possible_keys:
                    if key in raw_data and raw_data[key]:
                        extracted_data[standard_key] = raw_data[key]
                        break
            
            # 添加元数据
            extracted_data.update({
                "confidence": api_result.get("confidence", 0.8),
                "extraction_method": "mineru_api",
                "ocr_text": api_result.get("raw_text", ""),
                "api_version": api_result.get("version", "unknown"),
                "processing_time": api_result.get("processing_time", 0)
            })
            
            # 数据清洗和验证
            extracted_data = self._clean_extracted_data(extracted_data)
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"解析提取结果失败: {e}")
            return {
                "status": "parse_error",
                "error": str(e),
                "confidence": 0.0,
                "extraction_method": "failed",
                "raw_result": api_result
            }
    
    def _clean_extracted_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """清洗和标准化提取的数据"""
        cleaned = {}
        
        # 清洗文本字段
        text_fields = ["invoice_number", "seller_name", "buyer_name", "project_name", "remarks"]
        for field in text_fields:
            value = data.get(field)
            if value:
                # 移除多余空白字符
                cleaned_value = re.sub(r'\s+', ' ', str(value).strip())
                if cleaned_value:
                    cleaned[field] = cleaned_value
        
        # 清洗日期字段
        date_value = data.get("invoice_date")
        if date_value:
            cleaned_date = self._normalize_date(str(date_value))
            if cleaned_date:
                cleaned["invoice_date"] = cleaned_date
        
        # 清洗金额字段
        amount_fields = ["amount", "tax_amount", "total_amount"]
        for field in amount_fields:
            value = data.get(field)
            if value is not None:
                cleaned_amount = self._normalize_amount(value)
                if cleaned_amount is not None:
                    cleaned[field] = cleaned_amount
        
        # 保留其他字段
        for key, value in data.items():
            if key not in text_fields + ["invoice_date"] + amount_fields:
                cleaned[key] = value
        
        return cleaned
    
    def _normalize_date(self, date_str: str) -> Optional[str]:
        """标准化日期格式"""
        try:
            # 移除空白字符
            date_str = date_str.strip()
            
            # 匹配常见日期格式
            patterns = [
                (r'(\d{4})[年\-/](\d{1,2})[月\-/](\d{1,2})[日]?', r'\1-\2-\3'),
                (r'(\d{4})\.(\d{1,2})\.(\d{1,2})', r'\1-\2-\3'),
                (r'(\d{1,2})[月\-/](\d{1,2})[日\-/](\d{4})', r'\3-\1-\2'),
            ]
            
            for pattern, replacement in patterns:
                match = re.search(pattern, date_str)
                if match:
                    # 标准化为YYYY-MM-DD格式
                    year, month, day = match.groups()
                    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            
            # 如果已经是标准格式，直接返回
            if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
                return date_str
            
            logger.warning(f"无法解析日期格式: {date_str}")
            return None
            
        except Exception as e:
            logger.warning(f"日期标准化失败: {date_str}, 错误: {e}")
            return None
    
    def _normalize_amount(self, amount_value: Any) -> Optional[float]:
        """标准化金额格式"""
        try:
            if amount_value is None:
                return None
            
            # 转换为字符串并清洗
            amount_str = str(amount_value).strip()
            
            # 移除货币符号和分隔符
            amount_str = re.sub(r'[￥¥$€£,\s]', '', amount_str)
            
            # 匹配数字（包括小数）
            match = re.search(r'(\d+(?:\.\d{1,2})?)', amount_str)
            if match:
                amount = float(match.group(1))
                # 合理性检查
                if 0 <= amount <= 999999999.99:
                    return amount
            
            logger.warning(f"无法解析金额: {amount_value}")
            return None
            
        except Exception as e:
            logger.warning(f"金额标准化失败: {amount_value}, 错误: {e}")
            return None
    
    async def _mock_extraction(self, file_path: str) -> Dict[str, Any]:
        """
        模拟OCR提取（当API不可用时使用）
        根据文件名和基本信息生成模拟数据
        """
        try:
            # 验证文件路径
            safe_path = validate_file_path(file_path)
            filename = safe_path.stem
            
            # 尝试从文件名提取信息
            invoice_number = None
            company_name = None
            
            # 匹配发票号模式
            invoice_patterns = [
                r'([A-Z]{2,}\d{8,})',  # 大写字母+数字
                r'(\d{8,})',           # 纯数字
                r'([A-Z0-9\-]{10,})',  # 字母数字组合
            ]
            
            for pattern in invoice_patterns:
                match = re.search(pattern, filename.upper())
                if match:
                    invoice_number = match.group(1)
                    break
            
            # 生成模拟数据
            mock_data = {
                "invoice_number": invoice_number or f"MOCK{hash(filename) % 100000:05d}",
                "seller_name": "模拟公司名称",
                "amount": 1000.00,
                "tax_amount": 130.00,
                "total_amount": 1130.00,
                "invoice_date": "2024-01-01",
                "confidence": 0.5,
                "extraction_method": "mock",
                "ocr_text": f"模拟提取的发票内容 - 文件: {filename}",
                "status": "mock_data"
            }
            
            logger.info(f"使用模拟OCR数据 - 文件: {file_path}")
            return mock_data
            
        except Exception as e:
            logger.error(f"生成模拟OCR数据失败: {e}")
            return {
                "status": "mock_error",
                "error": str(e),
                "confidence": 0.0,
                "extraction_method": "failed_mock"
            }
    
    async def health_check(self) -> Dict[str, Any]:
        """检查OCR服务健康状态"""
        try:
            if not self.api_token:
                return {
                    "status": "unavailable",
                    "reason": "API token not configured",
                    "mock_mode": True
                }
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/health",
                    headers={"Authorization": f"Bearer {self.api_token}"}
                )
                
                if response.status_code == 200:
                    return {
                        "status": "healthy",
                        "api_url": self.base_url,
                        "response_time": response.elapsed.total_seconds()
                    }
                else:
                    return {
                        "status": "error",
                        "status_code": response.status_code,
                        "api_url": self.base_url
                    }
                    
        except Exception as e:
            logger.error(f"OCR服务健康检查失败: {e}")
            return {
                "status": "error",
                "error": str(e),
                "api_url": self.base_url
            }