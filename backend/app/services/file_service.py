"""
文件服务模块

处理文件上传、存储、管理等操作。
"""

import os
import hashlib
import mimetypes
from typing import Optional, List, Tuple, Union
from uuid import UUID, uuid4
from pathlib import Path
from datetime import datetime, timezone

from fastapi import UploadFile, HTTPException, status
import aiofiles

from app.core.config import settings
from app.core.exceptions import ValidationError, BusinessLogicError

import logging
logger = logging.getLogger(__name__)


class FileService:
    """文件服务类"""
    
    # 支持的文件类型
    ALLOWED_MIME_TYPES = {
        "application/pdf": [".pdf"],
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/gif": [".gif"],
        "image/webp": [".webp"]
    }
    
    # 最大文件大小 (10MB)
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    def __init__(self):
        self.upload_dir = Path(settings.upload_dir)
        self.downloads_dir = Path(settings.downloads_dir)
        
        # 确保目录存在
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.downloads_dir.mkdir(parents=True, exist_ok=True)
    
    async def validate_file(self, file: UploadFile) -> None:
        """
        验证上传的文件
        
        Args:
            file: 上传的文件对象
            
        Raises:
            ValidationError: 文件验证失败
        """
        # 检查文件大小
        if file.size and file.size > self.MAX_FILE_SIZE:
            raise ValidationError(
                f"文件大小超过限制 ({self.MAX_FILE_SIZE // (1024*1024)}MB)"
            )
        
        # 检查文件名
        if not file.filename:
            raise ValidationError("文件名不能为空")
        
        # 检查文件扩展名
        file_ext = Path(file.filename).suffix.lower()
        if not file_ext:
            raise ValidationError("文件必须有扩展名")
        
        # 检查MIME类型
        allowed_extensions = []
        for mime_type, extensions in self.ALLOWED_MIME_TYPES.items():
            allowed_extensions.extend(extensions)
        
        if file_ext not in allowed_extensions:
            raise ValidationError(
                f"不支持的文件类型。支持的类型: {', '.join(allowed_extensions)}"
            )
        
        # 验证MIME类型一致性
        expected_mime = None
        for mime_type, extensions in self.ALLOWED_MIME_TYPES.items():
            if file_ext in extensions:
                expected_mime = mime_type
                break
        
        if file.content_type and file.content_type != expected_mime:
            logger.warning(
                f"MIME类型不匹配: 文件扩展名 {file_ext} 对应 {expected_mime}, "
                f"但收到 {file.content_type}"
            )
    
    async def calculate_file_hash(self, file_path_or_content: Union[str, bytes, Path]) -> str:
        """
        计算文件哈希值
        
        Args:
            file_path_or_content: 文件路径或文件内容
            
        Returns:
            str: SHA256 哈希值
        """
        if isinstance(file_path_or_content, (str, Path)):
            # 如果是文件路径，读取文件内容
            file_path = Path(file_path_or_content)
            async with aiofiles.open(file_path, 'rb') as f:
                content = await f.read()
        else:
            # 如果是bytes类型，直接使用
            content = file_path_or_content
            
        return hashlib.sha256(content).hexdigest()
    
    def get_user_upload_dir(self, user_id: UUID) -> Path:
        """
        获取用户专用的上传目录
        
        Args:
            user_id: 用户ID
            
        Returns:
            Path: 用户上传目录路径
        """
        user_dir = self.upload_dir / f"user_{user_id}"
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir
    
    def generate_unique_filename(self, original_filename: str, file_hash: str) -> str:
        """
        生成唯一的文件名
        
        Args:
            original_filename: 原始文件名
            file_hash: 文件哈希值
            
        Returns:
            str: 唯一文件名
        """
        file_ext = Path(original_filename).suffix.lower()
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid4())[:8]
        
        # 使用哈希值前8位 + 时间戳 + 唯一ID + 扩展名
        return f"{file_hash[:8]}_{timestamp}_{unique_id}{file_ext}"
    
    async def save_uploaded_file(
        self, 
        file: UploadFile, 
        user_id: UUID
    ) -> Tuple[str, str, int, str]:
        """
        保存上传的文件
        
        Args:
            file: 上传的文件对象
            user_id: 用户ID
            
        Returns:
            Tuple[str, str, int, str]: (文件路径, 文件哈希, 文件大小, 原始文件名)
            
        Raises:
            BusinessLogicError: 文件保存失败
        """
        try:
            # 读取文件内容
            content = await file.read()
            file_size = len(content)
            
            # 验证文件大小
            if file_size > self.MAX_FILE_SIZE:
                raise ValidationError(
                    f"文件大小 ({file_size // (1024*1024)}MB) 超过限制"
                )
            
            # 计算哈希值
            file_hash = await self.calculate_file_hash(content)
            
            # 获取用户目录
            user_dir = self.get_user_upload_dir(user_id)
            
            # 生成唯一文件名
            unique_filename = self.generate_unique_filename(
                file.filename, file_hash
            )
            
            # 完整的文件路径
            file_path = user_dir / unique_filename
            
            # 保存文件
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(content)
            
            logger.info(f"文件保存成功: {file_path}")
            
            return (
                str(file_path.relative_to(self.upload_dir)),  # 相对路径
                file_hash,
                file_size,
                file.filename
            )
            
        except Exception as e:
            logger.error(f"保存文件失败: {str(e)}")
            raise BusinessLogicError(f"文件保存失败: {str(e)}")
    
    async def delete_file(self, file_path: str) -> bool:
        """
        删除文件
        
        Args:
            file_path: 文件相对路径
            
        Returns:
            bool: 是否删除成功
        """
        try:
            full_path = self.upload_dir / file_path
            if full_path.exists():
                full_path.unlink()
                logger.info(f"文件删除成功: {full_path}")
                return True
            else:
                logger.warning(f"文件不存在: {full_path}")
                return False
        except Exception as e:
            logger.error(f"删除文件失败: {str(e)}")
            return False
    
    async def get_file_info(self, file_path: str) -> Optional[dict]:
        """
        获取文件信息
        
        Args:
            file_path: 文件相对路径
            
        Returns:
            dict: 文件信息，如果文件不存在返回 None
        """
        try:
            full_path = self.upload_dir / file_path
            if not full_path.exists():
                return None
            
            stat = full_path.stat()
            
            return {
                "path": file_path,
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc),
                "modified_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
                "mime_type": mimetypes.guess_type(str(full_path))[0],
                "exists": True
            }
        except Exception as e:
            logger.error(f"获取文件信息失败: {str(e)}")
            return None
    
    def get_file_url(self, file_path: str) -> str:
        """
        生成文件访问URL
        
        Args:
            file_path: 文件相对路径
            
        Returns:
            str: 文件访问URL
        """
        # 在生产环境中，这应该返回CDN或静态文件服务的URL
        # 目前返回API端点URL
        return f"/api/v1/files/download/{file_path}"
    
    async def check_file_exists(self, file_hash: str, user_id: UUID) -> Optional[str]:
        """
        检查相同哈希值的文件是否已存在
        
        Args:
            file_hash: 文件哈希值
            user_id: 用户ID
            
        Returns:
            str: 如果存在返回文件路径，否则返回 None
        """
        user_dir = self.get_user_upload_dir(user_id)
        
        # 遍历用户目录下的所有文件
        for file_path in user_dir.iterdir():
            if file_path.is_file() and file_path.name.startswith(file_hash[:8]):
                return str(file_path.relative_to(self.upload_dir))
        
        return None


# 创建全局文件服务实例
file_service = FileService()


# ===== 工具函数 =====

def get_file_service() -> FileService:
    """获取文件服务实例（用于依赖注入）"""
    return file_service


async def validate_pdf_file(file: UploadFile) -> None:
    """
    专门验证PDF文件
    
    Args:
        file: 上传的文件对象
        
    Raises:
        ValidationError: PDF文件验证失败
    """
    await file_service.validate_file(file)
    
    if not file.filename.lower().endswith('.pdf'):
        raise ValidationError("只支持PDF文件")
    
    if file.content_type != "application/pdf":
        raise ValidationError("文件类型必须是 application/pdf")


# ===== 导出 =====

__all__ = [
    "FileService",
    "file_service",
    "get_file_service",
    "validate_pdf_file",
]