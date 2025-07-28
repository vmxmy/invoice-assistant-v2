"""
阿里云 OCR 服务层

统一的阿里云OCR服务，供所有API端点调用
"""

import io
import logging
from typing import Dict, Any, Optional
from datetime import datetime

import asyncio
import httpx
from datetime import timedelta
from alibabacloud_ocr_api20210707.client import Client as ocr_api20210707Client
from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_ocr_api20210707 import models as ocr_api20210707_models
from alibabacloud_tea_util import models as util_models

from app.core.config import Settings
from app.core.exceptions import BusinessLogicError

logger = logging.getLogger(__name__)


class AliyunOCRService:
    """阿里云 OCR 服务"""
    
    def __init__(self, settings: Settings):
        """初始化阿里云OCR客户端
        
        Args:
            settings: 应用配置对象
        """
        self.settings = settings
        config = open_api_models.Config(
            access_key_id=settings.alicloud_access_key_id,
            access_key_secret=settings.alicloud_access_key_secret
        )
        config.endpoint = f'ocr-api.{settings.alicloud_ocr_region}.aliyuncs.com'
        
        # 配置网络超时
        config.read_timeout = 60000  # 60秒读取超时
        config.connect_timeout = 10000  # 10秒连接超时
        
        self.client = ocr_api20210707Client(config)
        
        # 配置运行时选项
        self.runtime = util_models.RuntimeOptions()
        self.runtime.read_timeout = 60000  # 60秒
        self.runtime.connect_timeout = 10000  # 10秒
        self.runtime.max_idle_conns = 5  # 最大空闲连接数
        
        # 重试配置
        self.max_retries = 3
        self.retry_delay = 2  # 秒
        
        # 异步任务处理
        self._processing_tasks = {}  # 存储处理中的任务
    
    async def recognize_mixed_invoices(self, file_content: bytes) -> Dict[str, Any]:
        """
        使用混贴发票识别统一接口（带重试机制）
        
        Args:
            file_content: PDF文件内容
            
        Returns:
            Dict[str, Any]: 阿里云OCR原始响应数据
            
        Raises:
            BusinessLogicError: OCR调用失败
        """
        for attempt in range(self.max_retries):
            try:
                # 记录开始时间
                start_time = datetime.utcnow()
                
                # 使用BinaryIO传递文件内容
                request = ocr_api20210707_models.RecognizeMixedInvoicesRequest(
                    body=io.BytesIO(file_content)
                )
                
                # 在线程池中执行阻塞的API调用
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None, 
                    lambda: self.client.recognize_mixed_invoices_with_options(request, self.runtime)
                )
                
                # 计算处理时间
                processing_time = (datetime.utcnow() - start_time).total_seconds()
                
                if response.status_code == 200:
                    result = response.body.to_map()
                    # 添加处理时间到结果中
                    result['processing_time'] = processing_time
                    logger.info(f"阿里云OCR识别成功，耗时: {processing_time:.2f}秒，尝试次数: {attempt + 1}")
                    return result
                else:
                    error_msg = f"阿里云OCR错误: 状态码 {response.status_code}"
                    logger.error(error_msg)
                    if attempt == self.max_retries - 1:
                        raise BusinessLogicError(error_msg)
                    continue
                    
            except asyncio.TimeoutError:
                logger.warning(f"OCR调用超时，尝试 {attempt + 1}/{self.max_retries}")
                if attempt == self.max_retries - 1:
                    raise BusinessLogicError("OCR识别超时，请稍后重试")
                await asyncio.sleep(self.retry_delay * (attempt + 1))  # 递增延迟
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"混贴发票识别失败 (尝试 {attempt + 1}/{self.max_retries}): {error_msg}")
                
                # 判断是否为网络相关错误，可以重试
                if any(keyword in error_msg.lower() for keyword in ['timeout', 'network', 'connection', 'read timed out']):
                    if attempt < self.max_retries - 1:
                        await asyncio.sleep(self.retry_delay * (attempt + 1))
                        continue
                
                # 最后一次尝试或非网络错误直接抛出
                if attempt == self.max_retries - 1:
                    raise BusinessLogicError(f"OCR识别失败: {error_msg}")
        
        raise BusinessLogicError("OCR识别失败: 达到最大重试次数")
    
    async def recognize_invoice_raw(self, file_content: bytes) -> Dict[str, Any]:
        """
        获取原始OCR数据（不做任何解析）
        
        这是给 /api/v1/ocr/recognize 端点使用的纯OCR调用
        
        Args:
            file_content: PDF文件内容
            
        Returns:
            Dict[str, Any]: 阿里云OCR原始响应，包含完整的未处理数据
        """
        return await self.recognize_mixed_invoices(file_content)
    
    def validate_file(self, file_content: bytes, filename: str) -> None:
        """
        验证文件是否符合OCR要求
        
        Args:
            file_content: 文件内容
            filename: 文件名
            
        Raises:
            BusinessLogicError: 验证失败
        """
        # 验证文件类型
        if not filename.lower().endswith('.pdf'):
            raise BusinessLogicError("仅支持 PDF 格式文件")
        
        # 验证文件大小 (10MB)
        if len(file_content) > 10 * 1024 * 1024:
            raise BusinessLogicError("文件大小不能超过 10MB")
        
        # 验证文件内容不为空
        if not file_content:
            raise BusinessLogicError("文件内容为空")
    
    async def start_async_ocr_task(self, task_id: str, file_content: bytes) -> str:
        """
        启动异步OCR识别任务
        
        Args:
            task_id: 任务ID
            file_content: PDF文件内容
            
        Returns:
            str: 任务ID
        """
        if task_id in self._processing_tasks:
            raise BusinessLogicError(f"任务 {task_id} 已在处理中")
        
        # 创建异步任务
        task = asyncio.create_task(self._process_ocr_async(task_id, file_content))
        self._processing_tasks[task_id] = {
            'task': task,
            'status': 'processing',
            'started_at': datetime.utcnow(),
            'result': None,
            'error': None
        }
        
        logger.info(f"启动异步OCR任务: {task_id}")
        return task_id
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取任务状态
        
        Args:
            task_id: 任务ID
            
        Returns:
            Dict[str, Any]: 任务状态信息
        """
        if task_id not in self._processing_tasks:
            return {'status': 'not_found', 'message': '任务不存在'}
        
        task_info = self._processing_tasks[task_id]
        
        # 检查任务是否完成
        if task_info['task'].done():
            try:
                if task_info['status'] == 'processing':
                    result = await task_info['task']
                    task_info['status'] = 'completed'
                    task_info['result'] = result
                    task_info['completed_at'] = datetime.utcnow()
            except Exception as e:
                task_info['status'] = 'failed'
                task_info['error'] = str(e)
                task_info['completed_at'] = datetime.utcnow()
        
        return {
            'task_id': task_id,
            'status': task_info['status'],
            'started_at': task_info['started_at'].isoformat(),
            'completed_at': task_info.get('completed_at', '').isoformat() if task_info.get('completed_at') else None,
            'result': task_info.get('result'),
            'error': task_info.get('error'),
            'processing_time': (
                (task_info.get('completed_at', datetime.utcnow()) - task_info['started_at']).total_seconds()
            )
        }
    
    async def get_task_result(self, task_id: str) -> Dict[str, Any]:
        """
        获取任务结果（等待完成）
        
        Args:
            task_id: 任务ID
            
        Returns:
            Dict[str, Any]: OCR识别结果
        """
        if task_id not in self._processing_tasks:
            raise BusinessLogicError(f"任务 {task_id} 不存在")
        
        task_info = self._processing_tasks[task_id]
        
        try:
            # 等待任务完成
            result = await task_info['task']
            task_info['status'] = 'completed'
            task_info['result'] = result
            return result
        except Exception as e:
            task_info['status'] = 'failed'
            task_info['error'] = str(e)
            raise BusinessLogicError(f"OCR任务失败: {str(e)}")
        finally:
            # 清理已完成的任务
            if task_id in self._processing_tasks:
                del self._processing_tasks[task_id]
    
    async def _process_ocr_async(self, task_id: str, file_content: bytes) -> Dict[str, Any]:
        """
        内部异步OCR处理方法
        
        Args:
            task_id: 任务ID
            file_content: PDF文件内容
            
        Returns:
            Dict[str, Any]: OCR识别结果
        """
        try:
            logger.info(f"开始处理异步OCR任务: {task_id}")
            result = await self.recognize_mixed_invoices(file_content)
            logger.info(f"异步OCR任务完成: {task_id}")
            return result
        except Exception as e:
            logger.error(f"异步OCR任务失败: {task_id}, 错误: {str(e)}")
            raise
    
    def cleanup_completed_tasks(self, hours: int = 1):
        """
        清理已完成的任务
        
        Args:
            hours: 清理多少小时前完成的任务
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        tasks_to_remove = []
        
        for task_id, task_info in self._processing_tasks.items():
            if task_info['task'].done() and task_info.get('completed_at', datetime.utcnow()) < cutoff_time:
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self._processing_tasks[task_id]
            logger.info(f"清理已完成的OCR任务: {task_id}")
        
        return len(tasks_to_remove)


# 依赖注入函数
from fastapi import Depends
from app.core.config import get_settings


def get_aliyun_ocr_service(
    settings: Settings = Depends(get_settings)
) -> AliyunOCRService:
    """获取阿里云OCR服务实例（依赖注入）
    
    Args:
        settings: 应用配置对象
        
    Returns:
        AliyunOCRService: OCR服务实例
    """
    return AliyunOCRService(settings)