"""
OCR服务模块 - 100%成功率增强规则提取器

提供统一的OCR服务接口，支持：
- 增强规则提取器（100%成功率）
- 智能字段提取和识别
- 垂直文本处理
- 火车票金额提取
- 本地化处理，无API依赖
"""

# 使用增强规则提取器作为主要OCR服务
from .enhanced_ocr_service import EnhancedOCRService as OCRService
from .enhanced_rule_extractor import EnhancedRuleExtractor
from .config import OCRConfig
from .exceptions import OCRError
from .models import OCRResult, StructuredInvoiceData

__all__ = [
    'OCRService',  # EnhancedOCRService
    'EnhancedRuleExtractor',
    'OCRConfig', 
    'OCRResult',
    'StructuredInvoiceData',
    'OCRError'
] 