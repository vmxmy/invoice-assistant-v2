"""
查询监控中间件

自动为所有数据库查询添加性能监控。
"""

import time
import logging
from typing import Callable, Any
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.utils.query_monitor import query_monitoring

logger = logging.getLogger(__name__)


class QueryMonitoringMiddleware(BaseHTTPMiddleware):
    """查询监控中间件"""
    
    def __init__(self, app, enable_monitoring: bool = True):
        super().__init__(app)
        self.enable_monitoring = enable_monitoring
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """处理请求并记录查询性能"""
        if not self.enable_monitoring:
            return await call_next(request)
        
        # 获取请求信息
        endpoint = f"{request.method} {request.url.path}"
        
        # 记录请求开始时间
        start_time = time.time()
        
        try:
            # 在请求处理期间监控数据库查询
            async with query_monitoring.monitor_query(
                query_name=f"endpoint_{endpoint.replace('/', '_')}",
                track_result_count=False
            ):
                response = await call_next(request)
            
            # 记录请求总时间
            request_time = (time.time() - start_time) * 1000
            
            # 记录请求级别的性能信息
            if request_time > 1000:  # 超过1秒的请求
                logger.warning(
                    f"慢请求检测 - {endpoint}: {request_time:.2f}ms "
                    f"(状态码: {response.status_code})"
                )
            elif request_time > 500:  # 超过500ms的请求
                logger.info(
                    f"请求性能 - {endpoint}: {request_time:.2f}ms "
                    f"(状态码: {response.status_code})"
                )
            
            # 添加性能头信息
            response.headers["X-Response-Time"] = f"{request_time:.2f}ms"
            
            return response
            
        except Exception as e:
            # 记录错误和响应时间
            request_time = (time.time() - start_time) * 1000
            logger.error(
                f"请求错误 - {endpoint}: {request_time:.2f}ms, "
                f"错误: {str(e)}"
            )
            raise


class DatabaseQueryMonitor:
    """数据库查询监控器（用于SQLAlchemy事件）"""
    
    def __init__(self):
        self.active_queries = {}
    
    def before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        """查询执行前的钩子"""
        context._query_start_time = time.time()
        
        # 简化SQL语句用于标识
        query_type = self._identify_query_type(statement)
        context._query_type = query_type
    
    def after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        """查询执行后的钩子"""
        if hasattr(context, '_query_start_time'):
            execution_time = (time.time() - context._query_start_time) * 1000
            query_type = getattr(context, '_query_type', 'unknown')
            
            # 记录慢查询
            if execution_time > 100:  # 超过100ms的SQL查询
                logger.warning(
                    f"慢SQL查询 - {query_type}: {execution_time:.2f}ms"
                )
                
                # 可选：记录完整SQL（仅在调试模式下）
                from app.core.config import settings
                if settings.debug:
                    logger.debug(f"慢SQL详情: {statement[:200]}...")
    
    def _identify_query_type(self, statement: str) -> str:
        """识别查询类型"""
        statement_upper = statement.upper().strip()
        
        if statement_upper.startswith('SELECT'):
            if 'COUNT(' in statement_upper:
                return 'count_query'
            elif 'JOIN' in statement_upper:
                return 'join_query'
            elif 'ORDER BY' in statement_upper:
                return 'ordered_query'
            else:
                return 'select_query'
        elif statement_upper.startswith('INSERT'):
            return 'insert_query'
        elif statement_upper.startswith('UPDATE'):
            return 'update_query'
        elif statement_upper.startswith('DELETE'):
            return 'delete_query'
        else:
            return 'other_query'


def setup_sqlalchemy_monitoring():
    """设置SQLAlchemy查询监控"""
    from sqlalchemy import event
    from app.core.database import engine
    
    monitor = DatabaseQueryMonitor()
    
    # 注册SQLAlchemy事件监听器
    event.listen(engine.sync_engine, "before_cursor_execute", monitor.before_cursor_execute)
    event.listen(engine.sync_engine, "after_cursor_execute", monitor.after_cursor_execute)
    
    logger.info("已启用SQLAlchemy查询监控")


def create_monitoring_report() -> dict:
    """创建监控报告"""
    try:
        report = query_monitoring.get_performance_report()
        
        # 添加系统信息
        import psutil
        import os
        
        system_info = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage_percent": psutil.disk_usage('/').percent,
            "process_id": os.getpid(),
        }
        
        report["system_info"] = system_info
        return report
        
    except Exception as e:
        logger.error(f"创建监控报告失败: {e}")
        return {"error": str(e)}


# 全局监控报告生成器
def get_current_monitoring_status() -> dict:
    """获取当前监控状态"""
    return {
        "monitoring_enabled": True,
        "queries_monitored": len(query_monitoring.metrics_history),
        "baselines_established": len(query_monitoring.detector.baselines),
        "recent_regressions": len([
            alert for alert in query_monitoring.detector.baselines.values()
            if hasattr(alert, 'last_regression') and alert.last_regression
        ])
    }