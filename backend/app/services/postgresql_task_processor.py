"""
PostgreSQL任务处理器
替代Redis+Celery的完整方案，使用PostgreSQL数据库作为任务队列
"""

import asyncio
import json
import logging
import signal
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Callable, Union
from pathlib import Path

import asyncpg
from app.core.config import settings
from app.services.email_processor import EmailProcessor
from app.services.ocr_service import OCRService
from app.services.notification_service import NotificationService, NotificationRequest
from app.utils.logger import get_logger

logger = get_logger(__name__)


class PostgreSQLTaskProcessor:
    """PostgreSQL任务处理器，替代Celery Worker"""
    
    def __init__(self, database_url: str = None, worker_name: str = None):
        """
        初始化任务处理器
        
        Args:
            database_url: 数据库连接URL
            worker_name: Worker名称，用于标识
        """
        self.database_url = database_url or settings.database_url_async
        self.worker_name = worker_name or f"worker-{uuid.uuid4().hex[:8]}"
        self.connection: Optional[asyncpg.Connection] = None
        self.is_running = False
        self.task_handlers: Dict[str, Callable] = {}
        
        # 服务组件
        self.email_processor = EmailProcessor(self.database_url)
        self.ocr_service = OCRService()
        self.notification_service = NotificationService(settings)
        
        # 注册任务处理器
        self._register_task_handlers()
        
        # 信号处理
        self._setup_signal_handlers()
    
    def _register_task_handlers(self):
        """注册任务处理函数"""
        self.task_handlers = {
            'process_email': self.handle_process_email,
            'ocr_extract': self.handle_ocr_extract,
            'send_notification': self.handle_send_notification,
            'cleanup_files': self.handle_cleanup_files,
        }
    
    def _setup_signal_handlers(self):
        """设置信号处理器"""
        def signal_handler(signum, frame):
            logger.info(f"收到信号 {signum}，开始优雅关闭...")
            self.stop()
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def connect(self):
        """连接数据库"""
        try:
            # 使用asyncpg直接连接，禁用prepared statements以兼容pgbouncer
            db_url = self.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
            self.connection = await asyncpg.connect(db_url, statement_cache_size=0)
            
            # 监听新任务通知
            await self.connection.add_listener('new_task', self.on_new_task_notification)
            
            logger.info(f"Worker {self.worker_name} 已连接到数据库")
            
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            raise
    
    async def disconnect(self):
        """断开数据库连接"""
        if self.connection:
            await self.connection.close()
            self.connection = None
            logger.info(f"Worker {self.worker_name} 已断开数据库连接")
        
        # 关闭通知服务
        if hasattr(self, 'notification_service'):
            await self.notification_service.close()
    
    async def on_new_task_notification(self, connection, pid, channel, payload):
        """接收到新任务通知时的回调"""
        try:
            task_info = json.loads(payload)
            logger.debug(f"收到新任务通知: {task_info}")
            
            # 立即尝试处理待处理的任务
            await self.process_available_tasks()
            
        except Exception as e:
            logger.error(f"处理任务通知失败: {e}")
    
    async def fetch_next_task(self, task_types: List[str] = None) -> Optional[Dict[str, Any]]:
        """获取下一个待处理任务"""
        try:
            if not self.connection:
                raise RuntimeError("数据库连接未建立")
            
            # 调用数据库函数获取任务
            if task_types:
                # 转换为PostgreSQL数组格式
                task_types_array = '{' + ','.join([f'"{t}"' for t in task_types]) + '}'
                result = await self.connection.fetchrow(
                    "SELECT * FROM fetch_next_task($1::task_type[])",
                    task_types_array
                )
            else:
                result = await self.connection.fetchrow(
                    "SELECT * FROM fetch_next_task()"
                )
            
            if result:
                # 转换为字典格式
                task = dict(result)
                logger.info(f"获取到任务: {task['id']} ({task['task_type']})")
                return task
            
            return None
            
        except Exception as e:
            logger.error(f"获取任务失败: {e}")
            return None
    
    async def complete_task(self, task_id: str, result: Dict[str, Any] = None):
        """标记任务完成"""
        try:
            if not self.connection:
                raise RuntimeError("数据库连接未建立")
            
            success = await self.connection.fetchval(
                "SELECT complete_task($1, $2)",
                task_id,
                json.dumps(result) if result else None
            )
            
            if success:
                logger.info(f"任务 {task_id} 标记为完成")
            else:
                logger.warning(f"任务 {task_id} 完成标记失败")
                
        except Exception as e:
            logger.error(f"标记任务完成失败: {e}")
    
    async def fail_task(self, task_id: str, error_message: str, should_retry: bool = True):
        """标记任务失败"""
        try:
            if not self.connection:
                raise RuntimeError("数据库连接未建立")
            
            success = await self.connection.fetchval(
                "SELECT fail_task($1, $2, $3)",
                task_id,
                error_message,
                should_retry
            )
            
            if success:
                action = "重新排队" if should_retry else "标记为失败"
                logger.info(f"任务 {task_id} {action}: {error_message}")
            else:
                logger.warning(f"任务 {task_id} 失败处理失败")
                
        except Exception as e:
            logger.error(f"标记任务失败失败: {e}")
    
    async def process_task(self, task: Dict[str, Any]):
        """处理单个任务"""
        task_id = str(task['id'])
        task_type = task['task_type']
        payload = task['payload']
        
        try:
            logger.info(f"开始处理任务 {task_id} ({task_type})")
            
            # 获取任务处理器
            handler = self.task_handlers.get(task_type)
            if not handler:
                raise ValueError(f"未知任务类型: {task_type}")
            
            # 执行任务处理
            result = await handler(payload)
            
            # 标记任务完成
            await self.complete_task(task_id, result)
            
            logger.info(f"任务 {task_id} 处理完成")
            
        except Exception as e:
            error_msg = f"任务处理失败: {str(e)}"
            logger.error(f"任务 {task_id} {error_msg}")
            
            # 判断是否应该重试
            should_retry = self._should_retry_task(e, task)
            await self.fail_task(task_id, error_msg, should_retry)
    
    def _should_retry_task(self, error: Exception, task: Dict[str, Any]) -> bool:
        """判断任务是否应该重试"""
        # 网络相关错误应该重试
        if isinstance(error, (ConnectionError, TimeoutError)):
            return True
        
        # 如果重试次数未达到上限，则重试
        if task['retry_count'] < task['max_retries']:
            return True
        
        return False
    
    async def process_available_tasks(self):
        """处理所有可用任务"""
        processed_count = 0
        
        while self.is_running:
            task = await self.fetch_next_task()
            if not task:
                break
            
            await self.process_task(task)
            processed_count += 1
        
        if processed_count > 0:
            logger.info(f"批次处理完成，共处理 {processed_count} 个任务")
    
    async def cleanup_timeout_tasks(self):
        """清理超时任务"""
        try:
            if not self.connection:
                return
            
            timeout_count = await self.connection.fetchval(
                "SELECT cleanup_timeout_tasks()"
            )
            
            if timeout_count > 0:
                logger.info(f"清理了 {timeout_count} 个超时任务")
                
        except Exception as e:
            logger.error(f"清理超时任务失败: {e}")
    
    async def run(self, poll_interval: float = 5.0):
        """运行Worker主循环"""
        self.is_running = True
        logger.info(f"Worker {self.worker_name} 开始运行")
        
        try:
            await self.connect()
            
            while self.is_running:
                try:
                    # 处理可用任务
                    await self.process_available_tasks()
                    
                    # 清理超时任务
                    await self.cleanup_timeout_tasks()
                    
                    # 等待下一次轮询
                    await asyncio.sleep(poll_interval)
                    
                except asyncio.CancelledError:
                    logger.info("Worker任务被取消")
                    break
                except Exception as e:
                    logger.error(f"Worker运行出错: {e}")
                    await asyncio.sleep(min(poll_interval * 2, 30))  # 指数退避
        
        finally:
            await self.disconnect()
            logger.info(f"Worker {self.worker_name} 已停止")
    
    def stop(self):
        """停止Worker"""
        self.is_running = False
        logger.info(f"Worker {self.worker_name} 收到停止信号")
    
    # 任务处理器实现
    
    async def handle_process_email(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """处理邮件任务"""
        try:
            logger.info(f"开始处理邮件: {payload.get('sender', 'unknown')}")
            
            # 使用现有的邮件处理器
            result = await self.email_processor.process_email(payload)
            
            return {
                "status": "success",
                "result": result,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"邮件处理失败: {e}")
            raise
    
    async def handle_ocr_extract(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """处理OCR提取任务"""
        try:
            file_path = payload.get('file_path')
            if not file_path:
                raise ValueError("缺少文件路径")
            
            logger.info(f"开始OCR提取: {file_path}")
            
            # 调用OCR服务
            result = await self.ocr_service.extract_invoice_data(file_path)
            
            return {
                "status": "success",
                "result": result,
                "file_path": file_path,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"OCR提取失败: {e}")
            raise
    
    async def handle_send_notification(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """处理发送通知任务"""
        try:
            # 构建通知请求
            notification_request = NotificationRequest(
                type=payload.get('type', 'email'),
                recipient=payload.get('recipient'),
                subject=payload.get('subject'),
                message=payload.get('message'),
                metadata=payload.get('metadata'),
                priority=payload.get('priority', 'normal')
            )
            
            logger.info(f"发送{notification_request.type}通知给 {notification_request.recipient}")
            
            # 使用通知服务发送
            response = await self.notification_service.send_notification(notification_request)
            
            # 记录结果
            if response.status == "success":
                logger.info(f"通知发送成功: {response.notification_id}")
            else:
                logger.error(f"通知发送失败: {response.error}")
            
            return {
                "status": response.status,
                "notification_id": response.notification_id,
                "notification_type": response.notification_type,
                "recipient": response.recipient,
                "sent_at": response.sent_at,
                "error": response.error
            }
            
        except Exception as e:
            logger.error(f"发送通知失败: {e}")
            raise
    
    async def handle_cleanup_files(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """处理文件清理任务"""
        try:
            file_paths = payload.get('file_paths', [])
            max_age_days = payload.get('max_age_days', 7)
            
            logger.info(f"开始清理文件，最大保留天数: {max_age_days}")
            
            cleaned_count = 0
            for file_path in file_paths:
                try:
                    path = Path(file_path)
                    if path.exists():
                        # 检查文件年龄
                        file_age = datetime.now(timezone.utc) - datetime.fromtimestamp(
                            path.stat().st_mtime, tz=timezone.utc
                        )
                        
                        if file_age.days >= max_age_days:
                            path.unlink()
                            cleaned_count += 1
                            logger.debug(f"删除文件: {file_path}")
                            
                except Exception as e:
                    logger.warning(f"删除文件失败 {file_path}: {e}")
            
            return {
                "status": "success",
                "cleaned_count": cleaned_count,
                "total_files": len(file_paths),
                "cleaned_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"文件清理失败: {e}")
            raise


class TaskQueue:
    """任务队列接口，用于入队任务"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or settings.database_url_async
    
    def _ensure_uuid(self, value: str) -> uuid.UUID:
        """确保值是有效的UUID，如果不是则生成一个新的UUID"""
        if not value:
            return None
        
        try:
            # 尝试解析为UUID
            return uuid.UUID(value)
        except ValueError:
            # 如果不是有效UUID，基于字符串生成一个确定性的UUID
            import hashlib
            namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # 标准namespace UUID
            return uuid.uuid5(namespace, value)
    
    async def enqueue(
        self,
        task_type: str,
        payload: Dict[str, Any],
        user_id: str = None,
        priority: int = 0,
        delay_seconds: int = 0,
        max_retries: int = 3,
        correlation_id: str = None
    ) -> str:
        """
        将任务加入队列
        
        Args:
            task_type: 任务类型
            payload: 任务数据
            user_id: 用户ID
            priority: 优先级 (0-100)
            delay_seconds: 延迟执行秒数
            max_retries: 最大重试次数
            correlation_id: 关联ID
            
        Returns:
            str: 任务ID
        """
        try:
            # 直接使用asyncpg连接，禁用prepared statements以兼容pgbouncer
            db_url = self.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
            conn = await asyncpg.connect(db_url, statement_cache_size=0)
            try:
                # 调用数据库函数
                task_id = await conn.fetchval(
                    """
                    SELECT enqueue_task(
                        $1::task_type,
                        $2::jsonb,
                        $3::uuid,
                        $4,
                        $5,
                        $6,
                        $7
                    )
                    """,
                    task_type,
                    json.dumps(payload),
                    self._ensure_uuid(user_id) if user_id else None,
                    priority,
                    delay_seconds,
                    max_retries,
                    correlation_id
                )
                
                logger.info(f"任务已入队: {task_id} ({task_type})")
                return str(task_id)
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error(f"任务入队失败: {e}")
            raise
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务状态"""
        try:
            db_url = self.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
            conn = await asyncpg.connect(db_url, statement_cache_size=0)
            try:
                result = await conn.fetchrow(
                    """
                    SELECT 
                        id, task_type, status, created_at, started_at, completed_at,
                        error_message, retry_count, max_retries,
                        CASE 
                            WHEN status = 'completed' THEN payload->'result'
                            ELSE NULL 
                        END as result
                    FROM task_queue 
                    WHERE id = $1
                    """,
                    self._ensure_uuid(task_id)
                )
                
                if result:
                    return {
                        "task_id": str(result['id']),
                        "type": result['task_type'],
                        "status": result['status'],
                        "result": result['result'],
                        "created_at": result['created_at'].isoformat(),
                        "started_at": result['started_at'].isoformat() if result['started_at'] else None,
                        "completed_at": result['completed_at'].isoformat() if result['completed_at'] else None,
                        "error_message": result['error_message'],
                        "retry_count": result['retry_count'],
                        "max_retries": result['max_retries']
                    }
                
                return None
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error(f"获取任务状态失败: {e}")
            raise
    
    async def get_task_stats(self, user_id: str = None, hours_back: int = 24) -> List[Dict[str, Any]]:
        """获取任务统计"""
        try:
            db_url = self.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
            conn = await asyncpg.connect(db_url, statement_cache_size=0)
            try:
                results = await conn.fetch(
                    "SELECT * FROM get_task_stats($1::uuid, $2)",
                    self._ensure_uuid(user_id) if user_id else None,
                    hours_back
                )
                
                return [
                    {
                        "task_type": row['task_type'],
                        "status": row['status'],
                        "count": row['count'],
                        "avg_duration_seconds": float(row['avg_duration_seconds']) if row['avg_duration_seconds'] else None
                    }
                    for row in results
                ]
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error(f"获取任务统计失败: {e}")
            raise


# 全局任务队列实例
task_queue = TaskQueue()


async def enqueue_email_processing(email_data: Dict[str, Any]) -> str:
    """便捷函数：将邮件处理任务加入队列"""
    return await task_queue.enqueue(
        task_type="process_email",
        payload=email_data,
        user_id=email_data.get('user_id'),
        priority=5,  # 中等优先级
        correlation_id=email_data.get('message_id')
    )


if __name__ == "__main__":
    # 独立运行Worker
    import sys
    
    async def main():
        worker_name = sys.argv[1] if len(sys.argv) > 1 else None
        processor = PostgreSQLTaskProcessor(worker_name=worker_name)
        
        try:
            await processor.run()
        except KeyboardInterrupt:
            logger.info("收到中断信号，正在停止...")
        except Exception as e:
            logger.error(f"Worker运行失败: {e}")
            sys.exit(1)
    
    asyncio.run(main())