"""
路径验证工具模块

提供安全的文件路径验证功能，防止路径遍历攻击。
"""

import os
import re
from pathlib import Path
from typing import Optional
from app.core.exceptions import ValidationError


def validate_file_path(file_path: str, base_dir: Optional[str] = None) -> str:
    """
    验证并规范化文件路径，防止路径遍历攻击
    
    Args:
        file_path: 待验证的文件路径
        base_dir: 基础目录，用于限制访问范围
        
    Returns:
        str: 安全的规范化路径
        
    Raises:
        ValidationError: 路径不安全或无效
    """
    if not file_path:
        raise ValidationError("文件路径不能为空")
    
    # 移除潜在的恶意字符
    if any(char in file_path for char in ['<', '>', '|', '"', '*', '?']):
        raise ValidationError("文件路径包含非法字符")
    
    # 规范化路径
    try:
        normalized_path = os.path.normpath(file_path)
    except Exception as e:
        raise ValidationError(f"无效的文件路径: {str(e)}")
    
    # 检查路径遍历攻击
    if '..' in file_path or '..' in normalized_path or normalized_path.startswith('/'):
        raise ValidationError("检测到路径遍历攻击尝试")
    
    # 检查路径是否包含绝对路径
    if os.path.isabs(normalized_path):
        raise ValidationError("不允许使用绝对路径")
    
    # 如果指定了基础目录，验证路径是否在允许范围内
    if base_dir:
        base_path = Path(base_dir).resolve()
        full_path = (base_path / normalized_path).resolve()
        
        # 确保解析后的路径仍在基础目录内
        try:
            full_path.relative_to(base_path)
        except ValueError:
            raise ValidationError("文件路径超出允许的访问范围")
    
    return normalized_path


def validate_filename(filename: str) -> str:
    """
    验证文件名的安全性
    
    Args:
        filename: 文件名
        
    Returns:
        str: 安全的文件名
        
    Raises:
        ValidationError: 文件名不安全
    """
    if not filename:
        raise ValidationError("文件名不能为空")
    
    # 长度限制
    if len(filename) > 255:
        raise ValidationError("文件名过长（最大255字符）")
    
    # 检查非法字符
    illegal_chars = ['<', '>', ':', '"', '|', '?', '*', '/', '\\']
    if any(char in filename for char in illegal_chars):
        raise ValidationError(f"文件名包含非法字符: {illegal_chars}")
    
    # 检查保留名称（Windows）
    reserved_names = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ]
    
    name_without_ext = filename.split('.')[0].upper()
    if name_without_ext in reserved_names:
        raise ValidationError(f"文件名使用了系统保留名称: {name_without_ext}")
    
    # 检查以点开头或结尾
    if filename.startswith('.') or filename.endswith('.'):
        raise ValidationError("文件名不能以点开头或结尾")
    
    # 检查连续的点
    if '..' in filename:
        raise ValidationError("文件名不能包含连续的点")
    
    return filename


def sanitize_filename(filename: str) -> str:
    """
    清理文件名，移除或替换不安全的字符
    
    Args:
        filename: 原始文件名
        
    Returns:
        str: 清理后的安全文件名
    """
    if not filename:
        return "unnamed_file"
    
    # 替换非法字符为下划线
    illegal_chars = ['<', '>', ':', '"', '|', '?', '*', '/', '\\']
    cleaned = filename
    for char in illegal_chars:
        cleaned = cleaned.replace(char, '_')
    
    # 移除连续的下划线和点
    cleaned = re.sub(r'[_.]{2,}', '_', cleaned)
    
    # 确保不以点开头或结尾
    cleaned = cleaned.strip('.')
    
    # 长度限制
    if len(cleaned) > 200:  # 保留一些空间给扩展名和时间戳
        name_part = cleaned.rsplit('.', 1)[0][:200]
        ext_part = cleaned.rsplit('.', 1)[1] if '.' in cleaned else ''
        cleaned = f"{name_part}.{ext_part}" if ext_part else name_part
    
    # 如果清理后为空，使用默认名称
    if not cleaned or cleaned == '_':
        cleaned = "unnamed_file"
    
    return cleaned


def get_safe_upload_path(user_id: str, filename: str, upload_dir: str) -> str:
    """
    生成安全的上传路径
    
    Args:
        user_id: 用户ID
        filename: 文件名
        upload_dir: 上传目录
        
    Returns:
        str: 安全的文件路径
    """
    # 验证用户ID
    if not user_id or not isinstance(user_id, str):
        raise ValidationError("无效的用户ID")
    
    # 清理文件名
    safe_filename = sanitize_filename(filename)
    
    # 创建用户子目录
    user_subdir = user_id.replace('-', '')[:8]  # 使用用户ID的前8位作为子目录
    
    # 构建相对路径
    relative_path = os.path.join(user_subdir, safe_filename)
    
    # 验证最终路径
    safe_path = validate_file_path(relative_path, upload_dir)
    
    return safe_path


def is_safe_file_extension(filename: str, allowed_extensions: set) -> bool:
    """
    检查文件扩展名是否安全
    
    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名集合（小写）
        
    Returns:
        bool: 是否为安全的扩展名
    """
    if not filename or '.' not in filename:
        return False
    
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in allowed_extensions