"""
数据库连接配置模块

提供异步数据库连接池和会话管理。
"""

import asyncio
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine
)
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool, QueuePool

from app.core.config import get_settings
from app.utils.logger import get_logger

# 获取配置和日志
settings = get_settings()
logger = get_logger("database")

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
    # 生产环境使用 QueuePool
    engine_config.update({
        "poolclass": QueuePool,
        "pool_size": settings.database_pool_size,
        "max_overflow": settings.database_max_overflow,
    })

# 创建异步数据库引擎
# 注意：Supabase 使用 pgbouncer，需要禁用 prepared statements
connect_args = {}
if "pooler.supabase.com" in settings.database_url:
    connect_args = {
        "server_settings": {"jit": "off"},
        "command_timeout": 60,
        "prepared_statement_cache_size": 0,  # 关闭 prepared statements
        "prepared_statement_name_func": lambda: f"__asyncpg_stmt_{hash(asyncio.current_task())}__",
    }

engine: AsyncEngine = create_async_engine(
    settings.database_url_async,
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
            await conn.run_sync(lambda conn: conn.scalar("SELECT 1"))
        
        logger.info("Database connection established successfully")
        logger.info(f"Database URL: {settings.database_url.split('@')[1]}")  # 隐藏密码部分
        
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


# 导出常用对象
__all__ = [
    "Base",
    "engine",
    "async_session_maker",
    "get_db",
    "get_db_context",
    "init_db",
    "close_db",
    "DatabaseSessionManager",
]