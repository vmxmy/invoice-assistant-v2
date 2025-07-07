"""
Supabase存储服务模块

处理文件存储、签名URL生成等操作。
"""

import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from uuid import UUID

from supabase import create_client, Client

from app.core.config import settings
from app.core.exceptions import BusinessLogicError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class StorageService:
    """Supabase存储服务类"""
    
    def __init__(self):
        # 初始化Supabase客户端
        if not settings.supabase_url or not settings.supabase_service_key:
            logger.warning("Supabase配置不完整，存储服务将使用本地文件")
            self.client = None
        else:
            self.client: Optional[Client] = create_client(
                settings.supabase_url, 
                settings.supabase_service_key
            )
        
        # 存储桶名称
        self.bucket_name = "invoices"
    
    def _get_storage_path(self, user_id: UUID, file_path: str) -> str:
        """
        生成存储路径
        
        Args:
            user_id: 用户ID
            file_path: 文件相对路径（可能已包含用户前缀）
            
        Returns:
            str: 存储路径
        """
        # 如果file_path已经包含用户前缀，直接使用
        if file_path.startswith(f"user_{user_id}/"):
            return file_path
        # 否则添加用户前缀
        return f"user_{user_id}/{file_path}"
    
    async def generate_download_url(
        self, 
        user_id: UUID, 
        file_path: str, 
        expires_in: int = 3600
    ) -> Dict[str, Any]:
        """
        生成文件下载的签名URL
        
        智能策略：优先从Supabase Storage获取，本地文件作为fallback
        
        Args:
            user_id: 用户ID
            file_path: 文件相对路径
            expires_in: URL过期时间（秒），默认1小时
            
        Returns:
            Dict: 包含下载URL和过期时间的字典
            
        Raises:
            BusinessLogicError: 生成URL失败
        """
        try:
            # 如果没有Supabase客户端，直接使用本地fallback
            if not self.client:
                logger.info(f"未配置Supabase客户端，使用本地文件为用户 {user_id}: {file_path}")
                return await self._generate_local_download_url(user_id, file_path, expires_in)
            
            # 尝试从Supabase Storage获取文件
            storage_path = self._get_storage_path(user_id, file_path)
            
            try:
                # 检查文件是否存在于Supabase Storage
                objects = self.client.storage.from_(self.bucket_name).list(
                    path=os.path.dirname(storage_path)
                )
                
                # 检查文件是否在列表中
                file_name = os.path.basename(storage_path)
                file_exists = False
                
                if 'error' not in objects:
                    file_exists = any(
                        obj.get('name') == file_name 
                        for obj in objects 
                        if isinstance(obj, dict)
                    )
                
                if file_exists:
                    # 文件存在于Supabase Storage，生成签名URL
                    response = self.client.storage.from_(self.bucket_name).create_signed_url(
                        storage_path, 
                        expires_in
                    )
                    
                    if 'error' not in response and 'signedURL' in response:
                        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
                        logger.info(f"从Supabase Storage为用户 {user_id} 生成签名URL: {storage_path}")
                        return {
                            "download_url": response['signedURL'],
                            "expires_at": expires_at.isoformat(),
                            "storage_path": storage_path
                        }
                    else:
                        logger.warning(f"Supabase Storage签名URL生成失败: {response.get('error')}")
                else:
                    logger.info(f"文件不存在于Supabase Storage: {storage_path}")
                
            except Exception as storage_error:
                logger.warning(f"Supabase Storage访问异常: {str(storage_error)}")
            
            # Supabase Storage失败或文件不存在，使用本地fallback
            logger.info(f"回退到本地文件为用户 {user_id}: {file_path}")
            return await self._generate_local_download_url(user_id, file_path, expires_in)
            
        except Exception as e:
            logger.error(f"生成下载URL失败: {str(e)}")
            raise BusinessLogicError(f"生成下载URL失败: {str(e)}")
    
    async def _generate_local_download_url(
        self, 
        user_id: UUID, 
        file_path: str, 
        expires_in: int
    ) -> Dict[str, Any]:
        """
        生成本地文件下载URL（fallback方案）
        
        Args:
            user_id: 用户ID
            file_path: 文件相对路径
            expires_in: URL过期时间（秒）
            
        Returns:
            Dict: 包含下载URL和过期时间的字典
        """
        # 检查文件是否存在
        # file_path 已经包含了完整的相对路径
        if file_path.startswith(f"user_{user_id}/"):
            # file_path 已经包含用户前缀
            full_path = os.path.join(settings.upload_dir, file_path)
            download_url = f"/api/v1/files/download/{file_path}"
        else:
            # file_path 不包含用户前缀，需要添加
            full_path = os.path.join(settings.upload_dir, f"user_{user_id}", file_path)
            download_url = f"/api/v1/files/download/user_{user_id}/{file_path}"
        
        if not os.path.exists(full_path):
            raise BusinessLogicError("文件不存在")
        
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        return {
            "download_url": download_url,
            "expires_at": expires_at.isoformat(),
            "storage_path": file_path
        }
    
    async def batch_generate_download_urls(
        self, 
        file_requests: list[Dict[str, Any]], 
        expires_in: int = 3600
    ) -> list[Dict[str, Any]]:
        """
        批量生成下载URL（并发处理）
        
        Args:
            file_requests: 文件请求列表，每个包含 user_id, file_path, invoice_id
            expires_in: URL过期时间（秒）
            
        Returns:
            list: 下载URL列表
        """
        import asyncio
        
        async def generate_single_url(request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            """生成单个下载URL"""
            try:
                url_info = await self.generate_download_url(
                    request['user_id'],
                    request['file_path'],
                    expires_in
                )
                
                return {
                    "invoice_id": request['invoice_id'],
                    "download_url": url_info['download_url'],
                    "expires_at": url_info['expires_at'],
                    "storage_path": url_info.get('storage_path', request['file_path'])
                }
                
            except Exception as e:
                logger.error(f"生成下载URL失败 (invoice_id: {request['invoice_id']}): {str(e)}")
                return None
        
        # 并发处理所有请求，最多10个并发
        max_concurrent = 10
        urls = []
        
        for i in range(0, len(file_requests), max_concurrent):
            batch = file_requests[i:i + max_concurrent]
            batch_tasks = [generate_single_url(req) for req in batch]
            batch_results = await asyncio.gather(*batch_tasks)
            
            # 过滤掉失败的结果
            urls.extend([url for url in batch_results if url is not None])
        
        return urls
    
    async def check_file_exists(self, user_id: UUID, file_path: str) -> bool:
        """
        检查文件是否存在
        
        Args:
            user_id: 用户ID
            file_path: 文件相对路径
            
        Returns:
            bool: 文件是否存在
        """
        try:
            if not self.client:
                # 本地文件检查
                if file_path.startswith(f"user_{user_id}/"):
                    full_path = os.path.join(settings.upload_dir, file_path)
                else:
                    full_path = os.path.join(settings.upload_dir, f"user_{user_id}", file_path)
                return os.path.exists(full_path)
            
            storage_path = self._get_storage_path(user_id, file_path)
            
            # 检查Supabase存储中的文件
            response = self.client.storage.from_(self.bucket_name).list(
                path=os.path.dirname(storage_path)
            )
            
            if 'error' in response:
                return False
            
            file_name = os.path.basename(storage_path)
            return any(file['name'] == file_name for file in response)
            
        except Exception as e:
            logger.error(f"检查文件存在性失败: {str(e)}")
            return False


# 创建全局存储服务实例
storage_service = StorageService()


def get_storage_service() -> StorageService:
    """获取存储服务实例（用于依赖注入）"""
    return storage_service