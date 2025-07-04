"""
邮件处理任务
包含邮件解析、附件下载、发票创建等异步任务
"""

import asyncio
from typing import Dict, Any, Optional

from app.core.celery_app import celery_app, create_task
from app.services.email_processor import EmailProcessor
from app.utils.logger import get_logger

logger = get_logger(__name__)


@create_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 60},
    name="process_incoming_email"
)
def process_incoming_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理邮件任务
    
    Args:
        email_data: 邮件数据字典
        
    Returns:
        Dict: 处理结果
    """
    try:
        logger.info(f"开始处理邮件任务 - 用户: {email_data.get('user_id')}")
        
        # 创建邮件处理器
        from app.core.config import settings
        processor = EmailProcessor(settings.database_url_async)
        
        # 运行异步处理
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(processor.process_email(email_data))
            logger.info(f"邮件处理完成 - 任务ID: {self.request.id}, 结果: {result}")
            return result
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"邮件处理任务失败 - 任务ID: {self.request.id}, 错误: {exc}")
        
        # 判断是否需要重试
        if self.request.retries < self.max_retries:
            logger.info(f"任务将在60秒后重试 - 当前重试次数: {self.request.retries + 1}")
            raise self.retry(countdown=60, exc=exc)
        else:
            logger.error(f"任务达到最大重试次数，标记为失败 - 任务ID: {self.request.id}")
            return {
                "status": "failed",
                "error": str(exc),
                "task_id": self.request.id,
                "retries": self.request.retries
            }


@create_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 2, "countdown": 30},
    name="download_email_attachment"
)
def download_email_attachment(
    self, 
    attachment_url: str, 
    user_id: str, 
    filename: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    下载邮件附件任务
    
    Args:
        attachment_url: 附件下载URL
        user_id: 用户ID
        filename: 文件名
        metadata: 附加元数据
        
    Returns:
        Dict: 下载结果
    """
    try:
        logger.info(f"开始下载附件 - 用户: {user_id}, 文件: {filename}")
        
        import tempfile
        import httpx
        from pathlib import Path
        from app.services.file_service import FileService
        
        # 下载文件到临时位置
        temp_dir = Path(tempfile.gettempdir()) / "email_attachments"
        temp_dir.mkdir(exist_ok=True)
        temp_file = temp_dir / f"{self.request.id}_{filename}"
        
        # 异步下载
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            async def download():
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(attachment_url)
                    response.raise_for_status()
                    
                    with open(temp_file, "wb") as f:
                        f.write(response.content)
                    
                    return len(response.content)
            
            file_size = loop.run_until_complete(download())
            
            # 保存到文件服务
            async def save_file():
                file_service = FileService()
                return await file_service.save_invoice_file(
                    user_id=user_id,
                    file_path=str(temp_file),
                    original_filename=filename,
                    source="email_attachment",
                    metadata=metadata
                )
            
            file_info = loop.run_until_complete(save_file())
            
            # 清理临时文件
            temp_file.unlink(missing_ok=True)
            
            result = {
                "status": "completed",
                "file_info": file_info,
                "file_size": file_size,
                "task_id": self.request.id
            }
            
            logger.info(f"附件下载完成 - 任务ID: {self.request.id}, 文件: {filename}")
            return result
            
        finally:
            loop.close()
            
    except Exception as exc:
        logger.error(f"附件下载任务失败 - 任务ID: {self.request.id}, 错误: {exc}")
        
        # 清理可能的临时文件
        try:
            temp_file.unlink(missing_ok=True)
        except:
            pass
        
        if self.request.retries < self.max_retries:
            logger.info(f"附件下载将在30秒后重试 - 当前重试次数: {self.request.retries + 1}")
            raise self.retry(countdown=30, exc=exc)
        else:
            return {
                "status": "failed",
                "error": str(exc),
                "task_id": self.request.id,
                "retries": self.request.retries
            }


@create_task(
    bind=True,
    name="batch_process_emails"
)
def batch_process_emails(self, email_batch: list) -> Dict[str, Any]:
    """
    批量处理邮件任务
    
    Args:
        email_batch: 邮件数据列表
        
    Returns:
        Dict: 批量处理结果
    """
    try:
        logger.info(f"开始批量处理 {len(email_batch)} 封邮件")
        
        results = []
        for i, email_data in enumerate(email_batch):
            try:
                # 调用单个邮件处理任务
                task_result = process_incoming_email.delay(email_data)
                results.append({
                    "index": i,
                    "email_id": email_data.get("message_id"),
                    "task_id": task_result.id,
                    "status": "queued"
                })
            except Exception as e:
                logger.error(f"批量处理第 {i} 封邮件失败: {e}")
                results.append({
                    "index": i,
                    "email_id": email_data.get("message_id"),
                    "status": "failed",
                    "error": str(e)
                })
        
        summary = {
            "status": "completed",
            "total_emails": len(email_batch),
            "queued": len([r for r in results if r["status"] == "queued"]),
            "failed": len([r for r in results if r["status"] == "failed"]),
            "results": results,
            "task_id": self.request.id
        }
        
        logger.info(f"批量邮件处理完成 - 总数: {summary['total_emails']}, "
                   f"成功: {summary['queued']}, 失败: {summary['failed']}")
        
        return summary
        
    except Exception as exc:
        logger.error(f"批量邮件处理任务失败 - 任务ID: {self.request.id}, 错误: {exc}")
        return {
            "status": "failed",
            "error": str(exc),
            "task_id": self.request.id
        }


@create_task(
    bind=True,
    name="cleanup_temp_files"
)
def cleanup_temp_files(self, max_age_hours: int = 24) -> Dict[str, Any]:
    """
    清理临时文件任务
    
    Args:
        max_age_hours: 文件最大保留时间（小时）
        
    Returns:
        Dict: 清理结果
    """
    try:
        import tempfile
        import time
        from pathlib import Path
        
        logger.info(f"开始清理超过 {max_age_hours} 小时的临时文件")
        
        temp_dirs = [
            Path(tempfile.gettempdir()) / "email_attachments",
            Path(tempfile.gettempdir()) / "invoice_downloads",
        ]
        
        cleaned_files = 0
        total_size = 0
        
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for temp_dir in temp_dirs:
            if not temp_dir.exists():
                continue
                
            for file_path in temp_dir.rglob("*"):
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    
                    if file_age > max_age_seconds:
                        try:
                            file_size = file_path.stat().st_size
                            file_path.unlink()
                            cleaned_files += 1
                            total_size += file_size
                            logger.debug(f"清理临时文件: {file_path}")
                        except Exception as e:
                            logger.warning(f"清理文件失败 {file_path}: {e}")
        
        result = {
            "status": "completed",
            "cleaned_files": cleaned_files,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "task_id": self.request.id
        }
        
        logger.info(f"临时文件清理完成 - 清理文件数: {cleaned_files}, "
                   f"释放空间: {result['total_size_mb']} MB")
        
        return result
        
    except Exception as exc:
        logger.error(f"清理临时文件任务失败 - 任务ID: {self.request.id}, 错误: {exc}")
        return {
            "status": "failed",
            "error": str(exc),
            "task_id": self.request.id
        }