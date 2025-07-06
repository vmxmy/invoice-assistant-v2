"""
OCR服务配置管理 - Invoice2Data客户端
"""

from dataclasses import dataclass
from typing import Optional
from app.core.config import settings


@dataclass
class OCRConfig:
    """Invoice2Data客户端配置类"""
    
    # 基本配置
    api_token: str = "invoice2data_client"  # 默认值，用于标识
    api_base: str = "local"  # 本地处理，无需API
    max_retries: int = 3  # 最大重试次数
    timeout: float = 30.0  # 超时时间（秒）
    
    # 功能配置
    enable_batch_processing: bool = True  # 是否启用批量处理
    enable_intelligent_postprocessing: bool = True  # 是否启用智能后处理
    
    @classmethod
    def from_settings(cls) -> 'OCRConfig':
        """从应用配置创建OCR配置"""
        return cls(
            api_token="invoice2data_client",
            api_base="local",
            max_retries=getattr(settings, 'ocr_max_retries', 3),
            timeout=getattr(settings, 'ocr_timeout', 30.0),
            enable_batch_processing=getattr(settings, 'ocr_enable_batch', True),
            enable_intelligent_postprocessing=getattr(settings, 'ocr_enable_postprocessing', True)
        ) 