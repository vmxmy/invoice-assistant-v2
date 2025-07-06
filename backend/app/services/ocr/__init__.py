"""
OCR服务模块 - Invoice2Data提取器

提供统一的OCR服务接口，支持：
- Invoice2Data模板驱动的发票解析
- YAML模板灵活配置
- 本地化处理，无API依赖
- 异步批量处理
"""

# 使用Invoice2Data作为主要OCR服务
from .invoice2data_client import Invoice2DataClient as OCRService
from .invoice2data_client import Invoice2DataClient
from .config import OCRConfig
from .exceptions import OCRError
from .models import OCRResult, StructuredInvoiceData

__all__ = [
    'OCRService',  # Invoice2DataClient
    'Invoice2DataClient',
    'OCRConfig', 
    'OCRResult',
    'StructuredInvoiceData',
    'OCRError'
] 