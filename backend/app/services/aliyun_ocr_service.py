"""
阿里云 OCR 服务层

统一的阿里云OCR服务，供所有API端点调用
"""

import io
import logging
from typing import Dict, Any, Optional
from datetime import datetime

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
        self.client = ocr_api20210707Client(config)
        self.runtime = util_models.RuntimeOptions()
    
    async def recognize_mixed_invoices(self, file_content: bytes) -> Dict[str, Any]:
        """
        使用混贴发票识别统一接口
        
        Args:
            file_content: PDF文件内容
            
        Returns:
            Dict[str, Any]: 阿里云OCR原始响应数据
            
        Raises:
            BusinessLogicError: OCR调用失败
        """
        try:
            # 记录开始时间
            start_time = datetime.utcnow()
            
            # 使用BinaryIO传递文件内容
            request = ocr_api20210707_models.RecognizeMixedInvoicesRequest(
                body=io.BytesIO(file_content)
            )
            
            # 调用阿里云API
            response = self.client.recognize_mixed_invoices_with_options(request, self.runtime)
            
            # 计算处理时间
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            
            if response.status_code == 200:
                result = response.body.to_map()
                # 添加处理时间到结果中
                result['processing_time'] = processing_time
                logger.info(f"阿里云OCR识别成功，耗时: {processing_time:.2f}秒")
                return result
            else:
                error_msg = f"阿里云OCR错误: 状态码 {response.status_code}"
                logger.error(error_msg)
                raise BusinessLogicError(error_msg)
                
        except Exception as e:
            logger.error(f"混贴发票识别失败: {str(e)}")
            raise BusinessLogicError(f"OCR识别失败: {str(e)}")
    
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