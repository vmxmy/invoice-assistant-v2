"""
OCR服务配置管理
"""

from dataclasses import dataclass
from typing import Optional
from app.core.config import settings
from .constants import (
    DEFAULT_API_BASE_URL,
    DEFAULT_UPLOAD_TIMEOUT,
    DEFAULT_POLL_TIMEOUT,
    DEFAULT_DOWNLOAD_TIMEOUT,
    DEFAULT_MAX_RETRIES,
    DEFAULT_RETRY_DELAY,
    DEFAULT_MAX_RETRY_DELAY,
    DEFAULT_INITIAL_POLL_INTERVAL,
    DEFAULT_MAX_POLL_INTERVAL,
    DEFAULT_POLL_BACKOFF_FACTOR
)


@dataclass
class OCRConfig:
    """OCR服务配置类"""
    
    # API配置
    api_token: str
    base_url: str = DEFAULT_API_BASE_URL
    
    # 超时配置 (秒)
    upload_timeout: int = DEFAULT_UPLOAD_TIMEOUT
    poll_timeout: int = DEFAULT_POLL_TIMEOUT
    download_timeout: int = DEFAULT_DOWNLOAD_TIMEOUT
    
    # 重试配置
    max_retries: int = DEFAULT_MAX_RETRIES
    retry_delay: float = DEFAULT_RETRY_DELAY
    max_retry_delay: float = DEFAULT_MAX_RETRY_DELAY
    
    # 轮询配置
    initial_poll_interval: int = DEFAULT_INITIAL_POLL_INTERVAL
    max_poll_interval: int = DEFAULT_MAX_POLL_INTERVAL
    poll_backoff_factor: float = DEFAULT_POLL_BACKOFF_FACTOR
    
    # 功能配置
    mock_mode: bool = False
    enable_zip_cache: bool = True
    zip_cache_dir: Optional[str] = None
    
    @classmethod
    def from_settings(cls) -> 'OCRConfig':
        """从应用配置创建OCR配置"""
        return cls(
            api_token=getattr(settings, 'mineru_api_token', ''),
            base_url=getattr(settings, 'mineru_api_base_url', 'https://mineru.net'),
            mock_mode=not bool(getattr(settings, 'mineru_api_token', '')),
            poll_timeout=getattr(settings, 'ocr_poll_timeout', 600),
            max_retries=getattr(settings, 'ocr_max_retries', 3),
            enable_zip_cache=getattr(settings, 'ocr_enable_zip_cache', True)
        )
    
    def __post_init__(self):
        """配置验证"""
        if not self.mock_mode and not self.api_token:
            raise ValueError("API token is required when mock_mode is False")
        
        if self.poll_timeout <= 0:
            raise ValueError("poll_timeout must be positive")
        
        if self.max_retries < 0:
            raise ValueError("max_retries must be non-negative")
        
        if self.initial_poll_interval <= 0:
            raise ValueError("initial_poll_interval must be positive") 