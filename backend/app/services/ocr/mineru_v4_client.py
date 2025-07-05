"""
Mineru V4 API客户端实现
"""

import asyncio
import time
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
import logging
import httpx

from .base import BaseOCRClient
from .config import OCRConfig
from .exceptions import OCRError, OCRAPIError, OCRPollTimeoutError, OCRZipProcessError
from .models import OCRResult, BatchUploadResponse, BatchStatusResponse
from .utils import ZipProcessor, SmartPoller
from .constants import MAX_CONCURRENT_UPLOADS

logger = logging.getLogger(__name__)


class MineruV4Client(BaseOCRClient):
    """Mineru V4 API客户端"""
    
    def __init__(self, config: OCRConfig):
        """
        初始化V4客户端
        
        Args:
            config: OCR配置
        """
        super().__init__(config)
        self.zip_processor = ZipProcessor(config.download_timeout)
        self.poller = SmartPoller(
            initial_interval=config.initial_poll_interval,
            max_interval=config.max_poll_interval,
            backoff_factor=config.poll_backoff_factor,
            timeout=config.poll_timeout
        )
        # 创建并发控制信号量
        self._upload_semaphore = asyncio.Semaphore(MAX_CONCURRENT_UPLOADS)
    
    async def extract_invoice_data(self, file_path: str) -> OCRResult:
        """
        提取发票数据（V4 API批量处理）
        
        Args:
            file_path: 文件路径
            
        Returns:
            OCRResult: OCR处理结果
        """
        start_time = time.time()
        
        try:
            # 验证文件（Mock模式下也需要验证）
            self.validate_file(file_path)
            
            # 如果是Mock模式，直接返回模拟数据
            if self.config.mock_mode:
                logger.info(f"Mock模式：返回模拟OCR结果 - {file_path}")
                result = self._create_mock_result(file_path)
                result.processing_time = time.time() - start_time
                return result
            
            logger.info(f"开始处理文件: {file_path}")
            
            # 1. 获取批量上传URL
            batch_response = await self._create_batch_upload([file_path])
            batch_id = batch_response.batch_id
            
            logger.info(f"获取批次ID: {batch_id}")
            
            # 2. 上传文件到预签名URL
            await self._upload_files_to_batch(batch_response, [file_path])
            
            logger.info(f"文件上传完成，开始轮询结果")
            
            # 3. 轮询批次状态直到完成
            result_data = await self._poll_batch_completion(batch_id)
            
            # 4. 下载并解析ZIP结果
            extract_results = result_data.get('extract_result', [])
            if extract_results and extract_results[0].get('full_zip_url'):
                zip_result = await self.zip_processor.download_and_extract(
                    extract_results[0]['full_zip_url'],
                    self.config.zip_cache_dir
                )
                
                # 创建OCR结果
                ocr_result = OCRResult(
                    status=zip_result['status'],
                    confidence=zip_result['confidence'],
                    extraction_method=zip_result['extraction_method'],
                    structured_data=zip_result['structured_data'],
                    raw_text=str(zip_result.get('raw_data', '')),
                    processing_time=time.time() - start_time,
                    batch_id=batch_id
                )
                
                logger.info(f"OCR处理完成，耗时: {ocr_result.processing_time:.2f}秒")
                return ocr_result
            
            else:
                # 没有结果URL，返回错误
                return OCRResult(
                    status='error',
                    confidence=0.0,
                    extraction_method='mineru_v4',
                    error='未获取到处理结果',
                    processing_time=time.time() - start_time,
                    batch_id=batch_id
                )
                
        except Exception as e:
            logger.error(f"OCR处理失败: {e}")
            
            # 返回错误结果而不是抛出异常
            return OCRResult(
                status='error',
                confidence=0.0,
                extraction_method='mineru_v4',
                error=str(e),
                processing_time=time.time() - start_time
            )
    
    async def _create_batch_upload(self, file_paths: List[str]) -> BatchUploadResponse:
        """
        创建批量上传请求
        
        Args:
            file_paths: 文件路径列表
            
        Returns:
            BatchUploadResponse: 批量上传响应
        """
        # 准备文件信息 - 根据API要求使用 'name' 字段
        files_info = []
        for file_path in file_paths:
            path = Path(file_path)
            files_info.append({
                'name': path.name,
                'size': path.stat().st_size
            })
        
        # 发送批量上传请求 - 使用工作中的端点
        response = await self._call_api_with_retry(
            'POST',
            f"{self.config.base_url}/v4/file-urls/batch",
            json={
                'files': files_info
            }
        )
        
        data = response.json()
        
        # 检查API响应格式
        if data.get('code') != 0:
            raise OCRAPIError(f"API响应错误: {data.get('msg', 'Unknown error')}")
        
        api_data = data.get('data', {})
        
        # 根据实际API响应构建返回结果  
        return BatchUploadResponse(
            batch_id=api_data['batch_id'],
            upload_urls=api_data['file_urls'],  # API直接返回URL字符串列表
            expires_at=api_data.get('expires_at')
        )
    
    async def _upload_files_to_batch(
        self, 
        batch_response: BatchUploadResponse, 
        file_paths: List[str]
    ) -> None:
        """
        上传文件到预签名URL
        
        Args:
            batch_response: 批量上传响应
            file_paths: 文件路径列表
        """
        upload_tasks = []
        
        for i, file_path in enumerate(file_paths):
            if i < len(batch_response.upload_urls):
                upload_url = batch_response.upload_urls[i]
                task = self._upload_single_file(file_path, upload_url)
                upload_tasks.append(task)
        
        # 并发上传所有文件
        await asyncio.gather(*upload_tasks)
    
    async def _upload_single_file(self, file_path: str, upload_url: str) -> None:
        """
        上传单个文件到预签名URL（带并发控制）
        
        Args:
            file_path: 文件路径
            upload_url: 预签名上传URL
        """
        async with self._upload_semaphore:  # 并发控制
            import aiofiles
            
            # 使用aiofiles异步读取文件内容
            async with aiofiles.open(file_path, 'rb') as f:
                file_content = await f.read()
            
            # 对于OSS预签名URL，直接PUT文件内容（不设置Content-Type）
            try:
                async with httpx.AsyncClient(timeout=self.config.upload_timeout) as client:
                    response = await client.put(
                        upload_url,
                        content=file_content,
                        headers={"Content-Type": ""}  # 明确设置空的Content-Type以匹配OSS签名
                    )
                    
                    if response.status_code not in [200, 201, 204]:
                        raise OCRAPIError(
                            f"文件上传失败: {response.status_code}",
                            status_code=response.status_code,
                            response_text=response.text,
                            request_url=upload_url
                        )
                
                logger.debug(f"文件上传成功: {file_path}")
                
            except Exception as e:
                logger.error(f"文件上传失败 - 文件: {file_path}, 错误: {e}")
                raise
    
    async def _poll_batch_completion(self, batch_id: str) -> Dict[str, Any]:
        """
        轮询批次完成状态
        
        Args:
            batch_id: 批次ID
            
        Returns:
            Dict: 批次结果数据
        """
        async def check_batch_status() -> tuple[bool, Dict[str, Any]]:
            """检查批次状态"""
            response = await self._call_api_with_retry(
                'GET',
                f"{self.config.base_url}/v4/extract-results/batch/{batch_id}"
            )
            
            data = response.json()
            
            # 检查API响应格式
            if data.get('code') != 0:
                # 如果任务不存在等错误，考虑是否需要继续轮询
                if data.get('code') == -60012:  # task not found
                    return False, data  # 继续轮询
                else:
                    # 其他错误
                    return True, data
            
            api_data = data.get('data', {})
            
            # 检查extract_result数组中的状态
            extract_results = api_data.get('extract_result', [])
            if not extract_results:
                return False, api_data  # 继续轮询
            
            # 检查所有文件的状态
            all_done = all(result.get('state') in ['done', 'failed', 'error'] for result in extract_results)
            
            return all_done, api_data
        
        # 使用智能轮询器
        return await self.poller.poll_until_complete(check_batch_status)
    
    async def batch_extract_invoice_data(self, file_paths: List[str]) -> List[OCRResult]:
        """
        批量提取发票数据
        
        Args:
            file_paths: 文件路径列表
            
        Returns:
            List[OCRResult]: OCR结果列表
        """
        if self.config.mock_mode:
            # Mock模式：为每个文件返回模拟结果
            results = []
            for file_path in file_paths:
                result = self._create_mock_result(file_path)
                results.append(result)
            return results
        
        # 验证所有文件
        for file_path in file_paths:
            self.validate_file(file_path)
        
        start_time = time.time()
        
        try:
            # 1. 创建批量上传
            batch_response = await self._create_batch_upload(file_paths)
            batch_id = batch_response.batch_id
            
            logger.info(f"批量处理开始，批次ID: {batch_id}, 文件数量: {len(file_paths)}")
            
            # 2. 上传所有文件
            await self._upload_files_to_batch(batch_response, file_paths)
            
            # 3. 轮询完成状态
            result_data = await self._poll_batch_completion(batch_id)
            
            # 4. 处理结果
            extract_results = result_data.get('extract_result', [])
            if extract_results and extract_results[0].get('full_zip_url'):
                # 下载并解析ZIP结果
                zip_result = await self.zip_processor.download_and_extract(
                    extract_results[0]['full_zip_url'],
                    self.config.zip_cache_dir
                )
                
                # 这里需要根据实际API响应格式来分割多个文件的结果
                # 目前先返回单个结果
                processing_time = time.time() - start_time
                
                result = OCRResult(
                    status=zip_result['status'],
                    confidence=zip_result['confidence'],
                    extraction_method=zip_result['extraction_method'],
                    structured_data=zip_result['structured_data'],
                    raw_text=str(zip_result.get('raw_data', '')),
                    processing_time=processing_time,
                    batch_id=batch_id
                )
                
                # 为每个文件返回相同的结果（简化处理）
                return [result] * len(file_paths)
            
            else:
                # 没有结果，为每个文件返回错误
                error_result = OCRResult(
                    status='error',
                    confidence=0.0,
                    extraction_method='mineru_v4',
                    error='批量处理未获取到结果',
                    processing_time=time.time() - start_time,
                    batch_id=batch_id
                )
                return [error_result] * len(file_paths)
                
        except Exception as e:
            logger.error(f"批量OCR处理失败: {e}")
            
            # 为每个文件返回错误结果
            error_result = OCRResult(
                status='error',
                confidence=0.0,
                extraction_method='mineru_v4',
                error=str(e),
                processing_time=time.time() - start_time
            )
            return [error_result] * len(file_paths) 