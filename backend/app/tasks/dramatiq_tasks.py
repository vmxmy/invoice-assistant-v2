"""
Dramatiq任务定义
将现有的PostgreSQL任务转换为Dramatiq actors
"""

import dramatiq
from typing import Dict, Any, List
import json
import traceback
from datetime import datetime

from app.core.dramatiq_config import broker
from app.services.email_processor import EmailProcessor
from app.services.ocr_service import OCRService
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dramatiq.actor(queue_name="email_processing", max_retries=3, time_limit=30*60*1000)
def process_email_task(email_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理邮件任务
    
    Args:
        email_data: 邮件数据字典
        
    Returns:
        处理结果字典
    """
    task_id = email_data.get('task_id', 'unknown')
    user_id = email_data.get('user_id')
    
    try:
        logger.info(f"开始处理邮件任务: {task_id}, 用户: {user_id}")
        
        # 使用现有的邮件处理器
        processor = EmailProcessor()
        result = processor.process_email(email_data)
        
        logger.info(f"邮件任务完成: {task_id}")
        return {
            "status": "completed",
            "task_id": task_id,
            "result": result,
            "processed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        error_msg = f"邮件处理失败: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        
        # Dramatiq会自动处理重试
        raise Exception(error_msg)


@dramatiq.actor(queue_name="ocr_processing", max_retries=2, time_limit=20*60*1000)
def process_ocr_task(ocr_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理OCR任务
    
    Args:
        ocr_data: OCR数据字典
        
    Returns:
        OCR结果字典
    """
    task_id = ocr_data.get('task_id', 'unknown')
    file_path = ocr_data.get('file_path')
    
    try:
        logger.info(f"开始OCR处理: {task_id}, 文件: {file_path}")
        
        # 使用现有的OCR服务
        ocr_service = OCRService()
        result = ocr_service.extract_text(file_path)
        
        logger.info(f"OCR任务完成: {task_id}")
        return {
            "status": "completed",
            "task_id": task_id,
            "extracted_text": result,
            "processed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        error_msg = f"OCR处理失败: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise Exception(error_msg)


@dramatiq.actor(queue_name="notifications", max_retries=3, time_limit=5*60*1000)
def send_notification_task(notification_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    发送通知任务
    
    Args:
        notification_data: 通知数据字典
        
    Returns:
        发送结果字典
    """
    task_id = notification_data.get('task_id', 'unknown')
    notification_type = notification_data.get('type')
    recipient = notification_data.get('recipient')
    
    try:
        logger.info(f"发送通知: {task_id}, 类型: {notification_type}, 接收者: {recipient}")
        
        # 这里实现具体的通知逻辑
        # 例如: 发送邮件、推送消息等
        
        result = {
            "sent": True,
            "type": notification_type,
            "recipient": recipient,
            "sent_at": datetime.now().isoformat()
        }
        
        logger.info(f"通知发送完成: {task_id}")
        return {
            "status": "completed",
            "task_id": task_id,
            "result": result
        }
        
    except Exception as e:
        error_msg = f"通知发送失败: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise Exception(error_msg)


@dramatiq.actor(queue_name="file_cleanup", max_retries=1, time_limit=10*60*1000)
def cleanup_files_task(cleanup_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    文件清理任务
    
    Args:
        cleanup_data: 清理数据字典
        
    Returns:
        清理结果字典
    """
    task_id = cleanup_data.get('task_id', 'unknown')
    file_paths = cleanup_data.get('file_paths', [])
    
    try:
        logger.info(f"开始文件清理: {task_id}, 文件数: {len(file_paths)}")
        
        import os
        cleaned_files = []
        failed_files = []
        
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    cleaned_files.append(file_path)
                    logger.debug(f"已删除文件: {file_path}")
            except Exception as e:
                failed_files.append({"file": file_path, "error": str(e)})
                logger.warning(f"删除文件失败: {file_path} - {e}")
        
        result = {
            "cleaned_count": len(cleaned_files),
            "failed_count": len(failed_files),
            "cleaned_files": cleaned_files,
            "failed_files": failed_files
        }
        
        logger.info(f"文件清理完成: {task_id}, 成功: {len(cleaned_files)}, 失败: {len(failed_files)}")
        return {
            "status": "completed",
            "task_id": task_id,
            "result": result
        }
        
    except Exception as e:
        error_msg = f"文件清理失败: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise Exception(error_msg)


# 批量任务处理
@dramatiq.actor(queue_name="batch_processing", max_retries=1, time_limit=60*60*1000)
def process_batch_emails_task(batch_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    批量处理邮件任务
    
    Args:
        batch_data: 批量数据字典
        
    Returns:
        批量处理结果字典
    """
    task_id = batch_data.get('task_id', 'unknown')
    email_list = batch_data.get('emails', [])
    
    try:
        logger.info(f"开始批量处理邮件: {task_id}, 邮件数: {len(email_list)}")
        
        results = []
        for i, email_data in enumerate(email_list):
            try:
                # 为每个邮件创建子任务
                email_data['task_id'] = f"{task_id}-{i+1}"
                
                # 同步处理 (也可以异步发送给其他actor)
                result = process_email_task(email_data)
                results.append(result)
                
            except Exception as e:
                logger.error(f"批量处理中的邮件失败: {i+1} - {e}")
                results.append({
                    "status": "failed",
                    "task_id": f"{task_id}-{i+1}",
                    "error": str(e)
                })
        
        success_count = len([r for r in results if r.get('status') == 'completed'])
        
        logger.info(f"批量邮件处理完成: {task_id}, 成功: {success_count}/{len(email_list)}")
        return {
            "status": "completed",
            "task_id": task_id,
            "total_emails": len(email_list),
            "success_count": success_count,
            "results": results
        }
        
    except Exception as e:
        error_msg = f"批量邮件处理失败: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise Exception(error_msg)


# 便捷的任务发送函数
class TaskDispatcher:
    """任务分发器"""
    
    @staticmethod
    def send_email_task(email_data: Dict[str, Any], delay: int = 0) -> str:
        """发送邮件处理任务"""
        if delay > 0:
            message = process_email_task.send_with_options(
                args=[email_data],
                delay=delay * 1000  # 毫秒
            )
        else:
            message = process_email_task.send(email_data)
        
        logger.info(f"邮件任务已发送: {message.message_id}")
        return message.message_id
    
    @staticmethod
    def send_ocr_task(ocr_data: Dict[str, Any], priority: int = 0) -> str:
        """发送OCR处理任务"""
        message = process_ocr_task.send_with_options(
            args=[ocr_data],
            # priority=priority  # Dramatiq PostgreSQL broker暂不支持优先级
        )
        
        logger.info(f"OCR任务已发送: {message.message_id}")
        return message.message_id
    
    @staticmethod
    def send_notification_task(notification_data: Dict[str, Any]) -> str:
        """发送通知任务"""
        message = send_notification_task.send(notification_data)
        
        logger.info(f"通知任务已发送: {message.message_id}")
        return message.message_id
    
    @staticmethod
    def send_cleanup_task(cleanup_data: Dict[str, Any], delay: int = 0) -> str:
        """发送文件清理任务"""
        if delay > 0:
            message = cleanup_files_task.send_with_options(
                args=[cleanup_data],
                delay=delay * 1000
            )
        else:
            message = cleanup_files_task.send(cleanup_data)
        
        logger.info(f"清理任务已发送: {message.message_id}")
        return message.message_id
    
    @staticmethod
    def send_batch_task(batch_data: Dict[str, Any]) -> str:
        """发送批量处理任务"""
        message = process_batch_emails_task.send(batch_data)
        
        logger.info(f"批量任务已发送: {message.message_id}")
        return message.message_id


# 导出
__all__ = [
    'process_email_task',
    'process_ocr_task', 
    'send_notification_task',
    'cleanup_files_task',
    'process_batch_emails_task',
    'TaskDispatcher'
]