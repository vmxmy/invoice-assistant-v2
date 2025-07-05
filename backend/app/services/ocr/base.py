"""
OCR客户端基类
"""

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx
import logging

from .config import OCRConfig
from .exceptions import OCRError, OCRAPIError, OCRTimeoutError
from .models import OCRResult
from .utils import PathValidator, RetryHelper

logger = logging.getLogger(__name__)


class BaseOCRClient(ABC):
    """OCR客户端抽象基类"""
    
    def __init__(self, config: OCRConfig):
        """
        初始化OCR客户端
        
        Args:
            config: OCR配置
        """
        self.config = config
        self.path_validator = PathValidator()
        self.retry_helper = RetryHelper(
            max_retries=config.max_retries,
            initial_delay=config.retry_delay,
            max_delay=config.max_retry_delay
        )
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        await self._ensure_client()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        await self.close()
    
    async def _ensure_client(self):
        """确保HTTP客户端已初始化"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.config.upload_timeout),
                headers={
                    'Authorization': f'Bearer {self.config.api_token}',
                    'User-Agent': 'invoice-assist-ocr/1.0'
                }
            )
    
    async def close(self):
        """关闭HTTP客户端"""
        if self._client:
            await self._client.aclose()
            self._client = None
    
    @abstractmethod
    async def extract_invoice_data(self, file_path: str) -> OCRResult:
        """
        提取发票数据的抽象方法
        
        Args:
            file_path: 文件路径
            
        Returns:
            OCRResult: OCR处理结果
            
        Raises:
            OCRError: OCR处理错误
        """
        pass
    
    async def health_check(self) -> Dict[str, Any]:
        """
        健康检查
        
        Returns:
            Dict: 健康状态信息
        """
        try:
            await self._ensure_client()
            
            start_time = time.time()
            
            # 发送健康检查请求
            response = await self._client.get(
                f"{self.config.base_url}/health",
                timeout=10.0
            )
            
            response_time = time.time() - start_time
            
            return {
                'status': 'healthy' if response.status_code == 200 else 'unhealthy',
                'response_time': response_time,
                'status_code': response.status_code,
                'timestamp': time.time()
            }
            
        except Exception as e:
            logger.error(f"健康检查失败: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': time.time()
            }
    
    def validate_file(self, file_path: str) -> None:
        """
        验证文件
        
        Args:
            file_path: 文件路径
            
        Raises:
            OCRValidationError: 文件验证失败
        """
        self.path_validator.validate_file_path(file_path)
    
    async def _call_api_with_retry(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> httpx.Response:
        """
        带重试的API调用
        
        Args:
            method: HTTP方法
            url: 请求URL
            **kwargs: 请求参数
            
        Returns:
            httpx.Response: 响应对象
            
        Raises:
            OCRAPIError: API调用失败
            OCRTimeoutError: 请求超时
        """
        await self._ensure_client()
        
        async def _make_request():
            try:
                response = await self._client.request(method, url, **kwargs)
                
                # 检查HTTP状态码
                if response.status_code >= 400:
                    error_text = response.text
                    raise OCRAPIError(
                        f"API请求失败: {response.status_code}",
                        status_code=response.status_code,
                        response_text=error_text,
                        request_url=url
                    )
                
                return response
                
            except httpx.TimeoutException:
                raise OCRTimeoutError(
                    f"API请求超时: {url}",
                    timeout_seconds=self.config.upload_timeout,
                    operation=f"{method} {url}"
                )
            except httpx.HTTPStatusError as e:
                raise OCRAPIError(
                    f"HTTP状态错误: {e.response.status_code}",
                    status_code=e.response.status_code,
                    response_text=e.response.text,
                    request_url=url
                )
            except httpx.RequestError as e:
                raise OCRAPIError(
                    f"请求错误: {str(e)}",
                    status_code=0,
                    request_url=url
                )
        
        # 使用重试机制
        return await self.retry_helper.retry_async(
            _make_request,
            retryable_exceptions=(OCRAPIError, OCRTimeoutError)
        )
    
    def _create_mock_result(self, file_path: str) -> OCRResult:
        """
        创建模拟OCR结果
        
        Args:
            file_path: 文件路径
            
        Returns:
            OCRResult: 模拟的OCR结果
        """
        from .models import StructuredInvoiceData, InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
        from decimal import Decimal
        from datetime import date
        
        # 创建模拟的结构化数据
        structured_data = StructuredInvoiceData(
            main_info=InvoiceMainInfo(
                invoice_number="MOCK123456789",
                invoice_code="MOCK001",
                invoice_type="增值税专用发票",
                invoice_date=date.today()
            ),
            seller_info=InvoicePartyInfo(
                name="模拟销售方公司",
                tax_id="91110000000000000X",
                address="北京市朝阳区模拟地址123号",
                phone="010-12345678"
            ),
            buyer_info=InvoicePartyInfo(
                name="模拟购买方公司",
                tax_id="91110000000000001Y",
                address="北京市海淀区模拟地址456号",
                phone="010-87654321"
            ),
            summary=InvoiceSummary(
                amount=Decimal('1000.00'),
                tax_amount=Decimal('130.00'),
                total_amount=Decimal('1130.00'),
                amount_in_words="壹仟壹佰叁拾元整"
            ),
            items=[
                {
                    'name': '模拟商品A',
                    'amount': 600.00,
                    'tax_rate': '13%'
                },
                {
                    'name': '模拟服务B',
                    'amount': 400.00,
                    'tax_rate': '13%'
                }
            ]
        )
        
        return OCRResult(
            status='success',
            confidence=0.95,
            extraction_method='mock',
            structured_data=structured_data,
            raw_text="这是模拟的OCR文本内容",
            processing_time=1.5
        ) 