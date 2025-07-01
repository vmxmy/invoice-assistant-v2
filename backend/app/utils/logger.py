"""
日志配置模块

提供统一的日志配置和工具函数。
"""

import logging
import sys
from typing import Optional

from app.core.config import get_settings

settings = get_settings()


def setup_logging(
    level: Optional[str] = None,
    format_string: Optional[str] = None
) -> logging.Logger:
    """
    设置应用日志配置
    
    Args:
        level: 日志级别，默认使用配置中的值
        format_string: 日志格式，默认使用配置中的值
    
    Returns:
        配置好的logger实例
    """
    # 使用配置中的默认值
    log_level = level or settings.log_level
    log_format = format_string or settings.log_format
    
    # 配置根logger
    logging.basicConfig(
        level=getattr(logging, log_level),
        format=log_format,
        stream=sys.stdout,
        force=True
    )
    
    # 获取应用专用logger
    logger = logging.getLogger("invoice_assistant")
    
    # 在开发环境下设置更详细的日志
    if settings.is_development:
        logger.setLevel(logging.DEBUG)
        
        # 添加文件处理器用于开发调试
        if not any(isinstance(h, logging.FileHandler) for h in logger.handlers):
            file_handler = logging.FileHandler("app.log")
            file_handler.setLevel(logging.DEBUG)
            file_formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s"
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str) -> logging.Logger:
    """
    获取指定名称的logger
    
    Args:
        name: logger名称
    
    Returns:
        logger实例
    """
    return logging.getLogger(f"invoice_assistant.{name}")


# 创建默认logger实例
logger = setup_logging()