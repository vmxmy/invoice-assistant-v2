"""
Supabase Storage 服务

处理文件上传、下载和管理
"""

import os
from typing import Optional, BinaryIO
from datetime import datetime, timedelta
import logging

from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)


class SupabaseStorageService:
    """Supabase Storage 服务类"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_key  # 使用service key以获得完整权限
        )
        self.storage = self.client.storage
    
    async def upload_file(
        self,
        bucket_name: str,
        file_path: str,
        file_content: bytes,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        上传文件到Supabase Storage
        
        Args:
            bucket_name: 存储桶名称
            file_path: 文件路径（包含目录结构）
            file_content: 文件内容
            content_type: 文件MIME类型
            
        Returns:
            文件的公共URL或签名URL
        """
        try:
            # 确保bucket存在
            await self._ensure_bucket_exists(bucket_name)
            
            # 上传文件
            response = self.storage.from_(bucket_name).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": content_type}
            )
            
            # 生成访问URL（使用签名URL以确保安全）
            signed_url = self.storage.from_(bucket_name).create_signed_url(
                path=file_path,
                expires_in=3600 * 24 * 365  # 1年有效期
            )
            
            if signed_url.get("signedURL"):
                return signed_url["signedURL"]
            else:
                # 如果无法生成签名URL，返回公共URL
                public_url = self.storage.from_(bucket_name).get_public_url(file_path)
                return public_url
                
        except Exception as e:
            logger.error(f"上传文件失败: {str(e)}")
            raise Exception(f"文件上传失败: {str(e)}")
    
    async def download_file(
        self,
        bucket_name: str,
        file_path: str
    ) -> bytes:
        """
        从Supabase Storage下载文件
        
        Args:
            bucket_name: 存储桶名称
            file_path: 文件路径
            
        Returns:
            文件内容
        """
        try:
            response = self.storage.from_(bucket_name).download(file_path)
            return response
        except Exception as e:
            logger.error(f"下载文件失败: {str(e)}")
            raise Exception(f"文件下载失败: {str(e)}")
    
    async def delete_file(
        self,
        bucket_name: str,
        file_path: str
    ) -> bool:
        """
        删除Supabase Storage中的文件
        
        Args:
            bucket_name: 存储桶名称
            file_path: 文件路径
            
        Returns:
            是否删除成功
        """
        try:
            response = self.storage.from_(bucket_name).remove([file_path])
            return True
        except Exception as e:
            logger.error(f"删除文件失败: {str(e)}")
            return False
    
    async def list_files(
        self,
        bucket_name: str,
        path: str = "",
        limit: int = 100,
        offset: int = 0
    ) -> list:
        """
        列出存储桶中的文件
        
        Args:
            bucket_name: 存储桶名称
            path: 目录路径
            limit: 返回数量限制
            offset: 偏移量
            
        Returns:
            文件列表
        """
        try:
            response = self.storage.from_(bucket_name).list(
                path=path,
                options={
                    "limit": limit,
                    "offset": offset
                }
            )
            return response
        except Exception as e:
            logger.error(f"列出文件失败: {str(e)}")
            return []
    
    async def _ensure_bucket_exists(self, bucket_name: str) -> None:
        """
        确保存储桶存在，如果不存在则创建
        
        Args:
            bucket_name: 存储桶名称
        """
        try:
            # 尝试获取bucket信息
            buckets = self.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            
            if bucket_name not in bucket_names:
                # 创建bucket
                self.storage.create_bucket(
                    bucket_name,
                    options={
                        "public": False,  # 私有bucket
                        "file_size_limit": 10485760,  # 10MB
                        "allowed_mime_types": ["application/pdf", "image/jpeg", "image/png"]
                    }
                )
                logger.info(f"创建存储桶: {bucket_name}")
        except Exception as e:
            logger.warning(f"检查/创建存储桶失败: {str(e)}")
            # 如果失败，假设bucket已存在，继续执行
    
    def get_signed_url(
        self,
        bucket_name: str,
        file_path: str,
        expires_in: int = 3600
    ) -> str:
        """
        生成文件的签名URL
        
        Args:
            bucket_name: 存储桶名称
            file_path: 文件路径
            expires_in: 有效期（秒）
            
        Returns:
            签名URL
        """
        try:
            signed_url = self.storage.from_(bucket_name).create_signed_url(
                path=file_path,
                expires_in=expires_in
            )
            return signed_url.get("signedURL", "")
        except Exception as e:
            logger.error(f"生成签名URL失败: {str(e)}")
            return ""