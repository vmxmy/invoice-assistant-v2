"""
Celery应用配置
用于处理异步任务，主要包括邮件处理和OCR任务
"""

from celery import Celery
from kombu import Queue

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# 创建Celery应用实例
celery_app = Celery(
    "invoice_processor",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.ocr_tasks"
    ]
)

# Celery配置
celery_app.conf.update(
    # 任务序列化
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # 任务路由和队列
    task_routes={
        "app.tasks.email_tasks.*": {"queue": "email_processing"},
        "app.tasks.ocr_tasks.*": {"queue": "ocr_processing"},
    },
    
    task_default_queue="default",
    task_queues=(
        Queue("default"),
        Queue("email_processing"),
        Queue("ocr_processing"),
    ),
    
    # 任务执行配置
    task_always_eager=False,  # 生产环境设为False，测试时可设为True
    task_eager_propagates=True,
    task_ignore_result=False,
    task_store_eager_result=True,
    
    # 任务重试配置
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=60,  # 默认重试延迟60秒
    task_max_retries=3,  # 最大重试次数
    
    # Worker配置
    worker_prefetch_multiplier=1,  # 每次预取任务数
    worker_max_tasks_per_child=1000,  # 每个worker处理的最大任务数
    worker_disable_rate_limits=False,
    
    # 任务结果配置
    result_expires=3600,  # 结果过期时间1小时
    result_persistent=True,
    
    # 任务监控
    task_send_sent_event=True,
    task_track_started=True,
    
    # 安全配置
    worker_hijack_root_logger=False,
    worker_log_color=False,
)

# 可选：配置任务注解
celery_app.autodiscover_tasks()

# 添加周期性任务（如果需要）
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    # 每天清理过期的任务结果
    'cleanup-expired-results': {
        'task': 'app.tasks.maintenance_tasks.cleanup_expired_results',
        'schedule': crontab(hour=2, minute=0),  # 每天凌晨2点
    },
    
    # 每小时检查长时间未完成的任务
    'check-stuck-tasks': {
        'task': 'app.tasks.maintenance_tasks.check_stuck_tasks',
        'schedule': crontab(minute=0),  # 每小时整点
    },
}

# 添加信号处理
@celery_app.task(bind=True)
def debug_task(self):
    """调试任务，用于测试Celery是否正常工作"""
    logger.info(f"Request: {self.request!r}")
    return {"status": "ok", "worker_id": self.request.id}


# 健康检查任务
@celery_app.task(bind=True)
def health_check(self):
    """健康检查任务"""
    import time
    start_time = time.time()
    
    # 执行一些基本检查
    try:
        # 检查数据库连接
        from app.core.database import get_sync_engine
        engine = get_sync_engine()
        with engine.connect() as conn:
            conn.execute("SELECT 1").fetchone()
        
        processing_time = time.time() - start_time
        
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "processing_time": processing_time,
            "worker_id": self.request.id,
            "task_id": self.request.id
        }
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "timestamp": time.time(),
            "error": str(e),
            "worker_id": self.request.id,
            "task_id": self.request.id
        }


# 任务装饰器函数
def create_task(**kwargs):
    """创建任务装饰器的工厂函数"""
    def decorator(func):
        return celery_app.task(bind=True, **kwargs)(func)
    return decorator


# 导出Celery应用
__all__ = ["celery_app", "create_task", "debug_task", "health_check"]