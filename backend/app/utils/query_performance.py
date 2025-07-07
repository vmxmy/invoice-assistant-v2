"""
查询性能优化工具

提供数据库索引建议、查询分析和性能监控功能。
"""

import time
import logging
from typing import Dict, Any, List, Optional
from functools import wraps
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.sql import Select

from app.models.invoice import Invoice
from app.models.profile import Profile

logger = logging.getLogger(__name__)


class QueryPerformanceAnalyzer:
    """查询性能分析器"""
    
    @staticmethod
    async def suggest_indexes(session: AsyncSession) -> Dict[str, List[str]]:
        """
        分析常用查询并建议数据库索引
        
        Returns:
            Dict[str, List[str]]: 表名到索引建议的映射
        """
        suggestions = {
            "invoices": [
                "CREATE INDEX IF NOT EXISTS idx_invoices_user_id_deleted_at ON invoices(user_id, deleted_at) WHERE deleted_at IS NULL;",
                "CREATE INDEX IF NOT EXISTS idx_invoices_status_user_id ON invoices(status, user_id) WHERE deleted_at IS NULL;",
                "CREATE INDEX IF NOT EXISTS idx_invoices_created_at_desc ON invoices(created_at DESC) WHERE deleted_at IS NULL;",
                "CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date) WHERE deleted_at IS NULL;",
                "CREATE INDEX IF NOT EXISTS idx_invoices_seller_name_gin ON invoices USING gin(seller_name gin_trgm_ops);",
                "CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number) WHERE deleted_at IS NULL;",
            ],
            "profiles": [
                "CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id) WHERE deleted_at IS NULL;",
                "CREATE INDEX IF NOT EXISTS idx_profiles_display_name_gin ON profiles USING gin(display_name gin_trgm_ops);",
            ]
        }
        
        return suggestions
    
    @staticmethod
    async def analyze_query_performance(
        session: AsyncSession, 
        query: Select,
        threshold_ms: float = 100.0
    ) -> Dict[str, Any]:
        """
        分析查询性能
        
        Args:
            session: 数据库会话
            query: 要分析的查询
            threshold_ms: 性能阈值（毫秒）
            
        Returns:
            Dict[str, Any]: 性能分析结果
        """
        # 执行EXPLAIN ANALYZE
        explain_query = text(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {str(query.compile())}")
        
        start_time = time.time()
        explain_result = await session.execute(explain_query)
        execution_time = (time.time() - start_time) * 1000
        
        explain_data = explain_result.scalar()
        
        analysis = {
            "execution_time_ms": execution_time,
            "is_slow": execution_time > threshold_ms,
            "explain_plan": explain_data,
            "recommendations": []
        }
        
        # 基于执行时间提供建议
        if execution_time > threshold_ms:
            analysis["recommendations"].append(
                f"查询执行时间 {execution_time:.2f}ms 超过阈值 {threshold_ms}ms，建议优化"
            )
            
        return analysis
    
    @staticmethod
    async def check_missing_indexes(session: AsyncSession) -> List[Dict[str, Any]]:
        """
        检查缺失的索引
        
        Returns:
            List[Dict[str, Any]]: 缺失索引的建议
        """
        # PostgreSQL特定的查询，检查频繁使用但没有索引的列
        check_query = text("""
            SELECT 
                schemaname,
                tablename,
                attname as column_name,
                n_distinct,
                correlation,
                null_frac
            FROM pg_stats 
            WHERE schemaname = 'public' 
            AND tablename IN ('invoices', 'profiles')
            AND n_distinct > 100  -- 高基数列
            ORDER BY tablename, attname;
        """)
        
        result = await session.execute(check_query)
        rows = result.fetchall()
        
        suggestions = []
        for row in rows:
            if row.tablename == 'invoices' and row.column_name in ['user_id', 'status', 'invoice_date']:
                suggestions.append({
                    "table": row.tablename,
                    "column": row.column_name,
                    "reason": f"高基数列 (n_distinct: {row.n_distinct})",
                    "suggestion": f"CREATE INDEX idx_{row.tablename}_{row.column_name} ON {row.tablename}({row.column_name});"
                })
                
        return suggestions


class QueryMonitor:
    """查询监控器"""
    
    def __init__(self):
        self.slow_queries: List[Dict[str, Any]] = []
        self.query_stats: Dict[str, Dict[str, Any]] = {}
    
    @asynccontextmanager
    async def monitor_query(self, query_name: str, threshold_ms: float = 100.0):
        """
        监控查询性能的上下文管理器
        
        Args:
            query_name: 查询名称
            threshold_ms: 慢查询阈值
        """
        start_time = time.time()
        
        try:
            yield
        finally:
            execution_time = (time.time() - start_time) * 1000
            
            # 记录查询统计
            if query_name not in self.query_stats:
                self.query_stats[query_name] = {
                    "total_calls": 0,
                    "total_time_ms": 0,
                    "avg_time_ms": 0,
                    "max_time_ms": 0,
                    "slow_query_count": 0
                }
            
            stats = self.query_stats[query_name]
            stats["total_calls"] += 1
            stats["total_time_ms"] += execution_time
            stats["avg_time_ms"] = stats["total_time_ms"] / stats["total_calls"]
            stats["max_time_ms"] = max(stats["max_time_ms"], execution_time)
            
            # 记录慢查询
            if execution_time > threshold_ms:
                stats["slow_query_count"] += 1
                self.slow_queries.append({
                    "query_name": query_name,
                    "execution_time_ms": execution_time,
                    "timestamp": time.time()
                })
                
                logger.warning(
                    f"慢查询检测: {query_name} 执行时间 {execution_time:.2f}ms "
                    f"(阈值: {threshold_ms}ms)"
                )
    
    def get_performance_report(self) -> Dict[str, Any]:
        """
        获取性能报告
        
        Returns:
            Dict[str, Any]: 性能统计报告
        """
        return {
            "query_stats": self.query_stats,
            "slow_queries": self.slow_queries[-10:],  # 最近10个慢查询
            "total_slow_queries": len(self.slow_queries)
        }
    
    def reset_stats(self):
        """重置统计数据"""
        self.slow_queries.clear()
        self.query_stats.clear()


def monitor_query_performance(query_name: str, threshold_ms: float = 100.0):
    """
    查询性能监控装饰器
    
    Args:
        query_name: 查询名称
        threshold_ms: 慢查询阈值
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            monitor = QueryMonitor()
            async with monitor.monitor_query(query_name, threshold_ms):
                return await func(*args, **kwargs)
        return wrapper
    return decorator


# 全局查询监控器实例
query_monitor = QueryMonitor()


class OptimizedPagination:
    """优化的分页查询"""
    
    @staticmethod
    async def paginate_efficiently(
        session: AsyncSession,
        base_query: Select,
        page: int,
        page_size: int,
        order_by=None,
        use_cursor: bool = False
    ) -> Dict[str, Any]:
        """
        高效分页查询
        
        Args:
            session: 数据库会话
            base_query: 基础查询
            page: 页码
            page_size: 每页大小
            order_by: 排序字段
            use_cursor: 是否使用游标分页（适用于大数据集）
            
        Returns:
            Dict[str, Any]: 分页结果
        """
        # 计算偏移量
        offset = (page - 1) * page_size
        
        async with query_monitor.monitor_query("paginated_query"):
            if use_cursor and order_by is not None:
                # 游标分页（更适合大数据集）
                data_query = base_query.order_by(order_by).limit(page_size + 1)
                result = await session.execute(data_query)
                items = result.scalars().all()
                
                has_next = len(items) > page_size
                if has_next:
                    items = items[:-1]  # 移除多查询的一条记录
                
                return {
                    "items": items,
                    "has_next": has_next,
                    "has_prev": page > 1,
                    "page": page,
                    "page_size": page_size
                }
            else:
                # 传统偏移分页
                # 使用单个查询获取数据和总数
                count_query = select(func.count()).select_from(base_query.alias())
                
                data_query = base_query
                if order_by is not None:
                    data_query = data_query.order_by(order_by)
                data_query = data_query.offset(offset).limit(page_size)
                
                # 并行执行计数和数据查询
                count_result = await session.execute(count_query)
                data_result = await session.execute(data_query)
                
                total = count_result.scalar()
                items = data_result.scalars().all()
                
                return {
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "has_next": offset + page_size < total,
                    "has_prev": page > 1
                }