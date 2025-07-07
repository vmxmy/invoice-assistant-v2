"""
数据库连接配置模块

提供异步数据库连接池和会话管理，兼容 Supabase pgbouncer。
"""

import asyncio
import logging
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool, QueuePool, AsyncAdaptedQueuePool
from sqlalchemy import text

from app.core.config import settings

# 获取配置和日志
logger = logging.getLogger(__name__)

# 创建 SQLAlchemy 基类
Base = declarative_base()

# 数据库引擎配置
engine_config = {
    "echo": settings.debug,  # 开发环境下打印 SQL
    "echo_pool": settings.debug,
    "pool_pre_ping": True,  # 连接前检查连接是否有效
    "pool_recycle": 3600,  # 1小时后回收连接
}

# 根据环境选择连接池策略
if settings.is_development:
    # 开发环境使用 NullPool，每次都创建新连接
    engine_config["poolclass"] = NullPool
else:
    # 生产环境使用 NullPool
    engine_config["poolclass"] = NullPool  # 使用 NullPool 避免异步引擎兼容性问题

# 创建异步数据库引擎
# Supabase 使用 pgbouncer，需要特殊配置
connect_args = {}

# 检测是否为 Supabase 环境
is_supabase = "pooler.supabase.com" in settings.database_url or "supabase.co" in settings.database_url

if is_supabase:
    logger.info("Detected Supabase environment, configuring for pgbouncer compatibility")
    # 使用 psycopg (异步版本) 而不是 asyncpg，与 pgbouncer 兼容更好
    if "postgresql+asyncpg://" in settings.database_url:
        async_db_url = settings.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://")
    elif "postgresql://" in settings.database_url:
        async_db_url = settings.database_url.replace("postgresql://", "postgresql+psycopg://")
    else:
        async_db_url = settings.database_url
    
    # pgbouncer 兼容配置 (psycopg 格式)
    connect_args = {
        "connect_timeout": 10,
        "options": "-c jit=off -c statement_timeout=300000 -c application_name=invoice_assist_v2"
    }
    
    # 生产环境使用小型连接池，开发环境使用 NullPool
    if settings.is_production:
        engine_config["poolclass"] = NullPool  # 使用 NullPool 避免异步引擎兼容性问题
        # NullPool 不需要 pool_timeout 和 pool_recycle 参数
        logger.info("Using NullPool for Supabase production")
    else:
        engine_config["poolclass"] = NullPool
        logger.info("Using NullPool for Supabase development")
else:
    # 非 Supabase 环境，使用 asyncpg
    if "postgresql+asyncpg://" not in settings.database_url:
        async_db_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")
    else:
        async_db_url = settings.database_url

engine: AsyncEngine = create_async_engine(
    async_db_url,
    connect_args=connect_args,
    **engine_config
)

# 创建异步会话工厂
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话的依赖注入函数
    
    用于 FastAPI 的 Depends 注入。
    
    Yields:
        AsyncSession: 数据库会话
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {str(e)}")
            raise
        finally:
            await session.close()


# 为了兼容性添加别名
get_db_session = get_db


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话的上下文管理器
    
    用于非 FastAPI 环境下的数据库操作。
    
    Yields:
        AsyncSession: 数据库会话
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    初始化数据库连接
    
    在应用启动时调用，用于测试数据库连接。
    """
    try:
        # 测试连接
        async with engine.begin() as conn:
            await conn.scalar(text("SELECT 1"))
        
        logger.info("Database connection established successfully")
        # 隐藏敏感信息的URL显示
        safe_url = settings.database_url.split('@')[1] if '@' in settings.database_url else settings.database_url
        logger.info(f"Database URL: {safe_url}")
        
        if settings.is_development:
            logger.debug("Using NullPool for development")
        else:
            logger.info(f"Using QueuePool with size={settings.database_pool_size}")
            
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        raise


async def close_db() -> None:
    """
    关闭数据库连接
    
    在应用关闭时调用。
    """
    await engine.dispose()
    logger.info("Database connection closed")


class DatabaseSessionManager:
    """
    数据库会话管理器
    
    提供更细粒度的会话控制。
    """
    
    def __init__(self):
        self._session: AsyncSession | None = None
    
    async def __aenter__(self) -> AsyncSession:
        self._session = async_session_maker()
        return self._session
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            if exc_type:
                await self._session.rollback()
            else:
                await self._session.commit()
            await self._session.close()
            self._session = None
    
    @property
    def session(self) -> AsyncSession:
        if self._session is None:
            raise RuntimeError("Database session not initialized")
        return self._session


# 为了兼容性添加别名
get_async_db = get_db

# 导出常用对象
__all__ = [
    "Base",
    "engine",
    "async_session_maker",
    "get_db",
    "get_async_db",
    "get_db_context",
    "init_db",
    "close_db",
    "DatabaseSessionManager",
]