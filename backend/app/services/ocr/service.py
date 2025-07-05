"""
统一OCR服务入口
"""

import asyncio
from typing import Dict, Any, List, Optional
import logging

from .config import OCRConfig
from .mineru_v4_client import MineruV4Client
from .models import OCRResult
from .exceptions import OCRError, OCRConfigError

logger = logging.getLogger(__name__)


class OCRService:
    """
    统一OCR服务入口
    
    提供向后兼容的接口，内部使用Mineru V4客户端
    """
    
    def __init__(self, config: Optional[OCRConfig] = None):
        """
        初始化OCR服务
        
        Args:
            config: OCR配置，如果为None则从settings创建
        """
        if config is None:
            try:
                config = OCRConfig.from_settings()
            except Exception as e:
                logger.error(f"创建OCR配置失败: {e}")
                raise OCRConfigError(f"OCR配置初始化失败: {str(e)}")
        
        self.config = config
        self._client: Optional[MineruV4Client] = None
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        await self._ensure_client()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close()
    
    async def _ensure_client(self):
        """确保客户端已初始化"""
        if self._client is None:
            self._client = MineruV4Client(self.config)
            await self._client.__aenter__()
    
    async def close(self):
        """关闭服务"""
        if self._client:
            await self._client.__aexit__(None, None, None)
            self._client = None
    
    async def extract_invoice_data(self, file_path: str) -> Dict[str, Any]:
        """
        提取发票数据（向后兼容接口）
        
        Args:
            file_path: 文件路径
            
        Returns:
            Dict: OCR结果字典（兼容原有格式）
        """
        await self._ensure_client()
        
        try:
            # 使用V4客户端处理
            result = await self._client.extract_invoice_data(file_path)
            
            # 转换为向后兼容的字典格式
            return self._convert_to_legacy_format(result)
            
        except Exception as e:
            logger.error(f"OCR处理失败: {e}")
            
            # 返回错误格式（向后兼容）
            return {
                "status": "error",
                "error": str(e),
                "confidence": 0.0,
                "extraction_method": "mineru_v4"
            }
    
    async def extract_invoice_data_v2(self, file_path: str) -> OCRResult:
        """
        提取发票数据（新版接口）
        
        Args:
            file_path: 文件路径
            
        Returns:
            OCRResult: 结构化OCR结果
        """
        await self._ensure_client()
        return await self._client.extract_invoice_data(file_path)
    
    async def batch_extract_invoice_data(self, file_paths: List[str]) -> List[OCRResult]:
        """
        批量提取发票数据
        
        Args:
            file_paths: 文件路径列表
            
        Returns:
            List[OCRResult]: OCR结果列表
        """
        await self._ensure_client()
        return await self._client.batch_extract_invoice_data(file_paths)
    
    async def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            Dict: 健康状态
        """
        await self._ensure_client()
        return await self._client.health_check()
    
    def _convert_to_legacy_format(self, result: OCRResult) -> Dict[str, Any]:
        """
        将新格式的OCRResult转换为向后兼容的字典格式
        
        Args:
            result: OCRResult对象
            
        Returns:
            Dict: 向后兼容的字典格式
        """
        legacy_result = {
            "status": result.status,
            "confidence": result.confidence,
            "extraction_method": result.extraction_method,
            "processing_time": result.processing_time
        }
        
        # 添加错误信息
        if result.error:
            legacy_result["error"] = result.error
        
        # 添加原始文本
        if result.raw_text:
            legacy_result["raw_text"] = result.raw_text
        
        # 添加批次ID
        if result.batch_id:
            legacy_result["batch_id"] = result.batch_id
        
        # 转换结构化数据为字典格式
        if result.structured_data:
            try:
                # 将Pydantic模型转换为字典
                structured_dict = result.structured_data.dict()
                legacy_result["structured_data"] = structured_dict
                
                # 为了向后兼容，也提取一些关键字段到顶层
                main_info = structured_dict.get("main_info", {})
                legacy_result.update({
                    "invoice_number": main_info.get("invoice_number"),
                    "invoice_date": main_info.get("invoice_date"),
                    "invoice_type": main_info.get("invoice_type"),
                })
                
                # 提取金额信息
                summary = structured_dict.get("summary", {})
                legacy_result.update({
                    "total_amount": summary.get("total_amount"),
                    "amount": summary.get("amount"),
                    "tax_amount": summary.get("tax_amount"),
                })
                
                # 提取当事方信息
                seller_info = structured_dict.get("seller_info", {})
                buyer_info = structured_dict.get("buyer_info", {})
                legacy_result.update({
                    "seller_name": seller_info.get("name"),
                    "buyer_name": buyer_info.get("name"),
                })
                
            except Exception as e:
                logger.warning(f"结构化数据转换失败: {e}")
                legacy_result["structured_data"] = None
        
        return legacy_result


# 创建全局实例（用于向后兼容）
_global_ocr_service: Optional[OCRService] = None


def get_ocr_service() -> OCRService:
    """
    获取全局OCR服务实例
    
    Returns:
        OCRService: OCR服务实例
    """
    global _global_ocr_service
    
    if _global_ocr_service is None:
        _global_ocr_service = OCRService()
    
    return _global_ocr_service


async def extract_invoice_data(file_path: str) -> Dict[str, Any]:
    """
    全局函数：提取发票数据（向后兼容）
    
    Args:
        file_path: 文件路径
        
    Returns:
        Dict: OCR结果
    """
    service = get_ocr_service()
    async with service:
        return await service.extract_invoice_data(file_path) 