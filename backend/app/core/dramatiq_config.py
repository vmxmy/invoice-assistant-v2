"""
Dramatiq配置模块
配置PostgreSQL broker和中间件
"""

import dramatiq
from dramatiq_pg import PostgresBroker
from dramatiq.middleware import AgeLimit, TimeLimit, Retries, Callbacks
from dramatiq.results import Results

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


# 创建PostgreSQL broker
def create_dramatiq_broker():
    """创建并配置Dramatiq PostgreSQL broker"""
    
    # PostgreSQL连接URL转换
    broker_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
    
    # 配置中间件
    middleware = [
        # 任务超时限制
        TimeLimit(time_limit=30 * 60 * 1000),  # 30分钟超时
        
        # 任务年龄限制
        AgeLimit(max_age=24 * 60 * 60 * 1000),  # 24小时后丢弃
        
        # 重试机制
        Retries(max_retries=3, min_backoff=1000, max_backoff=60000),
        
        # 回调支持
        Callbacks(),
    ]
    
    # 创建broker
    broker = PostgresBroker(
        url=broker_url,
        middleware=middleware,
    )
    
    logger.info(f"Dramatiq broker已配置: {broker_url}")
    return broker


# 全局broker实例
broker = create_dramatiq_broker()

# 设置默认broker
dramatiq.set_broker(broker)


# 自定义中间件：任务监控
class TaskMonitoringMiddleware(dramatiq.Middleware):
    """任务监控中间件"""
    
    def before_process_message(self, broker, message):
        logger.info(f"开始处理任务: {message.actor_name} (ID: {message.message_id})")
    
    def after_process_message(self, broker, message, *, result=None, exception=None):
        if exception:
            logger.error(f"任务失败: {message.actor_name} (ID: {message.message_id}) - {exception}")
        else:
            logger.info(f"任务完成: {message.actor_name} (ID: {message.message_id})")
    
    def after_skip_message(self, broker, message):
        logger.warning(f"任务跳过: {message.actor_name} (ID: {message.message_id})")


# 添加监控中间件
broker.add_middleware(TaskMonitoringMiddleware())


# 导出配置
__all__ = ['broker', 'dramatiq']