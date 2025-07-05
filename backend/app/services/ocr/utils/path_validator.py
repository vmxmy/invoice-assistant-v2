"""
路径验证工具
"""

import os
from pathlib import Path
from typing import Union
from ..exceptions import OCRValidationError
from ..constants import ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB


class PathValidator:
    """文件路径验证器"""
    
    @classmethod
    def validate_file_path(cls, file_path: Union[str, Path]) -> Path:
        """
        验证文件路径安全性
        
        Args:
            file_path: 文件路径
            
        Returns:
            Path: 验证后的Path对象
            
        Raises:
            OCRValidationError: 路径验证失败
        """
        try:
            # 转换为Path对象
            path = Path(file_path)
            
            # 检查路径是否存在
            if not path.exists():
                raise OCRValidationError(f"文件不存在: {file_path}")
            
            # 检查是否为文件
            if not path.is_file():
                raise OCRValidationError(f"路径不是文件: {file_path}")
            
            # 检查文件扩展名
            if path.suffix.lower() not in ALLOWED_FILE_EXTENSIONS:
                raise OCRValidationError(
                    f"不支持的文件类型: {path.suffix}. "
                    f"支持的类型: {', '.join(ALLOWED_FILE_EXTENSIONS)}"
                )
            
            # 检查文件大小
            file_size = path.stat().st_size
            if file_size > MAX_FILE_SIZE_BYTES:
                raise OCRValidationError(
                    f"文件过大: {file_size / 1024 / 1024:.1f}MB. "
                    f"最大允许: {MAX_FILE_SIZE_MB}MB"
                )
            
            # 检查文件是否可读
            if not os.access(path, os.R_OK):
                raise OCRValidationError(f"文件无法读取: {file_path}")
            
            return path
            
        except OSError as e:
            raise OCRValidationError(f"文件系统错误: {e}")
    
    @classmethod
    def is_supported_file(cls, file_path: Union[str, Path]) -> bool:
        """
        检查文件是否支持OCR处理
        
        Args:
            file_path: 文件路径
            
        Returns:
            bool: 是否支持
        """
        try:
            cls.validate_file_path(file_path)
            return True
        except OCRValidationError:
            return False
    
    @classmethod
    def get_file_info(cls, file_path: Union[str, Path]) -> dict:
        """
        获取文件信息
        
        Args:
            file_path: 文件路径
            
        Returns:
            dict: 文件信息
        """
        path = cls.validate_file_path(file_path)
        stat = path.stat()
        
        return {
            'path': str(path.absolute()),
            'name': path.name,
            'size': stat.st_size,
            'size_mb': round(stat.st_size / 1024 / 1024, 2),
            'extension': path.suffix.lower(),
            'modified_time': stat.st_mtime,
            'is_supported': True
        } 