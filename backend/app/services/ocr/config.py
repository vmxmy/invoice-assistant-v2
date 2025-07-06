"""
OCR服务配置管理 - 增强规则提取器
"""

from dataclasses import dataclass
from typing import Optional
from app.core.config import settings


@dataclass
class OCRConfig:
    """增强规则提取器配置类"""
    
    # 保持兼容性的配置（增强规则提取器不需要API token）
    api_token: str = "enhanced_rule_extractor"  # 默认值，仅用于兼容性
    
    # 功能配置
    enable_vertical_text_fix: bool = True  # 是否启用垂直文本修复
    enable_amount_extraction: bool = True  # 是否启用金额提取
    enable_company_extraction: bool = True  # 是否启用公司名称提取
    enable_project_extraction: bool = True  # 是否启用项目名称提取
    
    @classmethod
    def from_settings(cls) -> 'OCRConfig':
        """从应用配置创建OCR配置"""
        return cls(
            api_token="enhanced_rule_extractor",  # 不需要真实API token
            enable_vertical_text_fix=getattr(settings, 'ocr_enable_vertical_fix', True),
            enable_amount_extraction=getattr(settings, 'ocr_enable_amount', True),
            enable_company_extraction=getattr(settings, 'ocr_enable_company', True),
            enable_project_extraction=getattr(settings, 'ocr_enable_project', True)
        ) 