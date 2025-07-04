"""
依赖注入模块

提供 FastAPI 应用的依赖注入函数。
"""

from typing import Optional, Dict, Any, AsyncGenerator
from uuid import UUID
import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.auth import supabase_auth

logger = logging.getLogger(__name__)

# HTTP Bearer 安全方案
security = HTTPBearer(auto_error=False)


# ===== 数据库依赖 =====

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话"""
    async for session in get_db():
        yield session


# ===== 认证依赖 =====

class CurrentUser:
    """当前用户信息"""
    
    def __init__(
        self,
        id: UUID,
        email: str,
        role: str = "user",
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = id
        self.email = email
        self.role = role
        self.metadata = metadata or {}
    
    @property
    def is_admin(self) -> bool:
        """是否为管理员"""
        return self.role == "admin"
    
    def __repr__(self) -> str:
        return f"<CurrentUser(id={self.id}, email={self.email}, role={self.role})>"


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[CurrentUser]:
    """
    获取当前用户（可选）
    
    用于不强制要求认证的端点。
    
    Args:
        credentials: HTTP Bearer 凭证
        
    Returns:
        CurrentUser: 当前用户信息，如果未认证则返回 None
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        
        # 使用 Supabase Auth 验证 Token
        user_info = supabase_auth.validate_token(token)
        
        return CurrentUser(
            id=user_info["id"],
            email=user_info["email"],
            role=user_info["role"],
            metadata=user_info["metadata"]
        )
        
    except AuthenticationError as e:
        logger.warning(f"Authentication failed: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error validating token: {str(e)}")
        return None


async def get_current_user(
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional)
) -> CurrentUser:
    """
    获取当前用户（必需）
    
    用于强制要求认证的端点。
    
    Args:
        current_user: 当前用户（可选）
        
    Returns:
        CurrentUser: 当前用户信息
        
    Raises:
        AuthenticationError: 用户未认证
    """
    if not current_user:
        raise AuthenticationError("需要用户认证")
    
    return current_user


async def get_admin_user(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """
    获取管理员用户
    
    用于只有管理员才能访问的端点。
    
    Args:
        current_user: 当前用户
        
    Returns:
        CurrentUser: 管理员用户信息
        
    Raises:
        AuthorizationError: 用户不是管理员
    """
    if not current_user.is_admin:
        raise AuthorizationError("需要管理员权限")
    
    return current_user


# ===== 请求依赖 =====

async def get_request_id(request: Request) -> str:
    """
    获取请求 ID
    
    用于日志追踪。
    
    Args:
        request: FastAPI 请求对象
        
    Returns:
        str: 请求 ID
    """
    # 尝试从头部获取请求 ID
    request_id = request.headers.get("X-Request-ID")
    
    if not request_id:
        # 如果没有，生成一个
        import uuid
        request_id = str(uuid.uuid4())[:8]
    
    return request_id


async def get_client_ip(request: Request) -> str:
    """
    获取客户端 IP
    
    Args:
        request: FastAPI 请求对象
        
    Returns:
        str: 客户端 IP 地址
    """
    # 优先从代理头部获取真实 IP
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # fallback 到直接连接的 IP
    return request.client.host if request.client else "unknown"


# ===== 分页依赖 =====

class PaginationParams:
    """分页参数"""
    
    def __init__(self, page: int = 1, size: int = 20):
        self.page = max(1, page)
        self.size = max(1, min(100, size))  # 限制每页最多 100 条
        self.offset = (self.page - 1) * self.size
    
    @property
    def limit(self) -> int:
        """限制数量"""
        return self.size


def get_pagination_params(
    page: int = 1,
    size: int = 20
) -> PaginationParams:
    """
    获取分页参数
    
    Args:
        page: 页码（从1开始）
        size: 每页大小
        
    Returns:
        PaginationParams: 分页参数
    """
    return PaginationParams(page=page, size=size)


# ===== 验证依赖 =====

async def validate_uuid(
    id_value: str,
    field_name: str = "ID"
) -> UUID:
    """
    验证 UUID 格式
    
    Args:
        id_value: UUID 字符串
        field_name: 字段名称（用于错误消息）
        
    Returns:
        UUID: 验证后的 UUID
        
    Raises:
        HTTPException: UUID 格式无效
    """
    try:
        return UUID(id_value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"无效的 {field_name} 格式"
        )


# ===== 配置依赖 =====

def get_settings():
    """获取应用配置"""
    return settings


# ===== 工具函数 =====

def require_feature(feature_name: str):
    """
    要求特定功能启用的装饰器依赖
    
    Args:
        feature_name: 功能名称
        
    Returns:
        Depends: 依赖函数
    """
    def check_feature():
        # 这里可以添加功能开关逻辑
        # 目前假设所有功能都启用
        return True
    
    return Depends(check_feature)


def require_rate_limit(max_requests: int = 100, window_seconds: int = 3600):
    """
    要求速率限制的装饰器依赖
    
    Args:
        max_requests: 最大请求数
        window_seconds: 时间窗口（秒）
        
    Returns:
        Depends: 依赖函数
    """
    async def check_rate_limit(
        request: Request,
        client_ip: str = Depends(get_client_ip)
    ):
        # TODO: 实现真实的速率限制逻辑
        # 可以使用 Redis 存储速率限制信息
        return True
    
    return Depends(check_rate_limit)


# ===== 导出 =====

__all__ = [
    "get_db_session",
    "CurrentUser",
    "get_current_user_optional",
    "get_current_user",
    "get_admin_user",
    "get_request_id",
    "get_client_ip",
    "PaginationParams",
    "get_pagination_params",
    "validate_uuid",
    "get_settings",
    "require_feature",
    "require_rate_limit",
]