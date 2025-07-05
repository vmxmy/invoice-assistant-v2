"""
OCR服务模块 - 基于Mineru V4 API

提供统一的OCR服务接口，支持：
- 批量文件上传处理
- 智能轮询机制
- ZIP结果下载解析
- 错误处理和重试
"""

from .service import OCRService
from .config import OCRConfig
from .exceptions import (
    OCRError,
    OCRTimeoutError,
    OCRAPIError,
    OCRZipProcessError,
    OCRPollTimeoutError
)
from .models import OCRResult, StructuredInvoiceData

__all__ = [
    'OCRService',
    'OCRConfig', 
    'OCRResult',
    'StructuredInvoiceData',
    'OCRError',
    'OCRTimeoutError',
    'OCRAPIError',
    'OCRZipProcessError',
    'OCRPollTimeoutError'
] 