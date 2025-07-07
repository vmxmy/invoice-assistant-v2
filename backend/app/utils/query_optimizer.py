"""
数据库查询优化工具

提供高效的分页查询和窗口函数优化。
"""

from typing import List, Tuple, Any, Optional, Type
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
from sqlalchemy.orm import DeclarativeBase


class QueryOptimizer:
    """查询优化器"""
    
    @staticmethod
    async def paginate_with_window_function(
        session: AsyncSession,
        base_query: Select,
        model_class: Type[DeclarativeBase],
        limit: int = 20,
        offset: int = 0,
        order_by=None
    ) -> Tuple[List[Any], int]:
        """
        使用窗口函数优化分页查询
        
        避免在大表上执行expensive的COUNT查询。
        
        Args:
            session: 数据库会话
            base_query: 基础查询
            model_class: 模型类
            limit: 限制数量
            offset: 偏移量
            order_by: 排序字段
            
        Returns:
            Tuple[List[Any], int]: (结果列表, 总数)
        """
        
        # 构建窗口函数查询
        if order_by is None:
            order_by = model_class.created_at.desc()
        
        # 使用窗口函数获取总数 - 避免subquery防止笛卡尔积
        # 方法1：重构为两个独立查询避免复杂JOIN
        # 先获取总数
        count_query = select(func.count()).select_from(base_query.alias())
        count_result = await session.execute(count_query)
        total_count = count_result.scalar()
        
        # 再获取分页数据
        data_query = base_query.order_by(order_by).offset(offset).limit(limit)
        data_result = await session.execute(data_query)
        items = data_result.scalars().all()
        
        return items, total_count
    
    @staticmethod
    async def efficient_count(
        session: AsyncSession,
        base_query: Select,
        use_estimate: bool = True,
        estimate_threshold: int = 10000
    ) -> int:
        """
        高效计数查询
        
        对于大表使用估算，小表使用精确计数。
        
        Args:
            session: 数据库会话
            base_query: 基础查询
            use_estimate: 是否使用估算
            estimate_threshold: 估算阈值
            
        Returns:
            int: 计数结果
        """
        
        if use_estimate:
            # 先尝试快速估算
            try:
                # 获取表统计信息（仅PostgreSQL）
                table_name = None
                if hasattr(base_query.column_descriptions[0]['type'], '__tablename__'):
                    table_name = base_query.column_descriptions[0]['type'].__tablename__
                
                if table_name:
                    estimate_query = text("""
                        SELECT reltuples::BIGINT AS estimate
                        FROM pg_class
                        WHERE relname = :table_name
                    """)
                    estimate_result = await session.execute(
                        estimate_query, 
                        {"table_name": table_name}
                    )
                    estimate = estimate_result.scalar()
                    
                    if estimate and estimate < estimate_threshold:
                        # 小表直接精确计数 - 避免subquery
                        count_query = select(func.count()).select_from(base_query.alias())
                        count_result = await session.execute(count_query)
                        return count_result.scalar()
                    elif estimate:
                        # 大表返回估算值
                        return int(estimate)
                        
            except Exception:
                # 估算失败，回退到精确计数
                pass
        
        # 精确计数 - 避免subquery防止笛卡尔积
        count_query = select(func.count()).select_from(base_query.alias())
        count_result = await session.execute(count_query)
        return count_result.scalar()
    
    @staticmethod
    def optimize_search_query(
        base_query: Select,
        search_fields: List[str],
        search_term: str,
        use_full_text: bool = True
    ) -> Select:
        """
        优化搜索查询
        
        使用全文搜索或ILIKE优化。
        
        Args:
            base_query: 基础查询
            search_fields: 搜索字段列表
            search_term: 搜索词
            use_full_text: 是否使用全文搜索
            
        Returns:
            Select: 优化后的查询
        """
        
        if not search_term or not search_fields:
            return base_query
        
        search_term = search_term.strip()
        
        if use_full_text and len(search_term) > 3:
            # 使用PostgreSQL全文搜索
            search_vector = func.to_tsvector('chinese', text(' || '.join([f'COALESCE({field}, \'\')' for field in search_fields])))
            search_query = func.plainto_tsquery('chinese', search_term)
            
            return base_query.where(search_vector.op('@@')(search_query))
        else:
            # 使用ILIKE搜索（适用于短词或非全文搜索场景）
            from sqlalchemy import or_
            
            search_pattern = f"%{search_term}%"
            search_conditions = [
                getattr(base_query.column_descriptions[0]['type'], field).ilike(search_pattern)
                for field in search_fields
            ]
            
            return base_query.where(or_(*search_conditions))
    
    @staticmethod
    async def batch_load_relations(
        session: AsyncSession,
        items: List[Any],
        relations: List[str],
        batch_size: int = 100
    ) -> None:
        """
        批量加载关联数据
        
        避免N+1查询问题。
        
        Args:
            session: 数据库会话
            items: 实体列表
            relations: 关联字段列表
            batch_size: 批次大小
        """
        
        if not items or not relations:
            return
        
        # 按批次处理
        for i in range(0, len(items), batch_size):
            batch = items[i:i + batch_size]
            
            for relation in relations:
                # 这里需要根据具体的关联关系实现
                # 示例：预加载用户档案
                if relation == 'profile' and hasattr(batch[0], 'user_id'):
                    from app.models.profile import Profile
                    
                    user_ids = [item.user_id for item in batch if item.user_id]
                    if user_ids:
                        profiles_query = select(Profile).where(Profile.auth_user_id.in_(user_ids))
                        profiles_result = await session.execute(profiles_query)
                        profiles = {p.auth_user_id: p for p in profiles_result.scalars().all()}
                        
                        # 设置关联
                        for item in batch:
                            if item.user_id in profiles:
                                setattr(item, 'profile', profiles[item.user_id])


class CachedQueryMixin:
    """缓存查询混入类"""
    
    _query_cache = {}
    _cache_ttl = 300  # 5分钟缓存
    
    @classmethod
    async def get_cached_query_result(
        cls,
        session: AsyncSession,
        cache_key: str,
        query_func,
        *args,
        **kwargs
    ) -> Any:
        """
        获取缓存的查询结果
        
        Args:
            session: 数据库会话
            cache_key: 缓存键
            query_func: 查询函数
            *args, **kwargs: 查询参数
            
        Returns:
            Any: 查询结果
        """
        
        import time
        
        current_time = time.time()
        
        # 检查缓存
        if cache_key in cls._query_cache:
            cached_data, timestamp = cls._query_cache[cache_key]
            if current_time - timestamp < cls._cache_ttl:
                return cached_data
        
        # 执行查询
        result = await query_func(session, *args, **kwargs)
        
        # 存储到缓存
        cls._query_cache[cache_key] = (result, current_time)
        
        return result
    
    @classmethod
    def clear_cache(cls, pattern: Optional[str] = None):
        """清除缓存"""
        if pattern is None:
            cls._query_cache.clear()
        else:
            keys_to_remove = [k for k in cls._query_cache.keys() if pattern in k]
            for key in keys_to_remove:
                del cls._query_cache[key]


# 装饰器用于自动优化查询
def optimize_query(use_window_function: bool = True, cache_key: Optional[str] = None):
    """
    查询优化装饰器
    
    Args:
        use_window_function: 是否使用窗口函数优化分页
        cache_key: 缓存键（如果需要缓存）
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            if cache_key:
                # 使用缓存
                return await CachedQueryMixin.get_cached_query_result(
                    args[0],  # session
                    cache_key,
                    func,
                    *args,
                    **kwargs
                )
            else:
                return await func(*args, **kwargs)
        return wrapper
    return decorator