"""
Supabase 认证模块

集成 Supabase Auth 进行用户认证和授权。
"""

import jwt
import logging
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.exceptions import AuthenticationError, AuthorizationError

logger = logging.getLogger(__name__)


class SupabaseAuth:
    """Supabase 认证服务"""
    
    def __init__(self):
        self.jwt_secret = settings.supabase_jwt_secret
        self.supabase_url = settings.supabase_url
        
        # 生产环境强制要求JWT密钥
        if settings.is_production and not self.jwt_secret:
            raise RuntimeError("SUPABASE_JWT_SECRET is required in production environment")
        
        if not self.jwt_secret:
            logger.warning("SUPABASE_JWT_SECRET not configured - using fallback authentication for development only")
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """
        验证 JWT Token
        
        Args:
            token: JWT Token 字符串
            
        Returns:
            Dict: 解码后的 payload
            
        Raises:
            AuthenticationError: Token 无效或过期
        """
        try:
            # 生产环境禁止测试令牌
            if settings.is_production and (not self.jwt_secret or token.startswith("test-")):
                raise AuthenticationError("Invalid authentication method in production")
            
            # 如果没有配置 JWT Secret，使用测试模式（仅开发环境）
            if not self.jwt_secret:
                if not settings.debug:
                    raise AuthenticationError("JWT Secret not configured")
                return self._verify_test_token(token)
            
            # 首先检查是否是测试 token（开发模式下）
            if settings.debug and token.startswith("test-"):
                return self._verify_test_token(token)
            
            # 验证 JWT
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": False,  # Supabase 可能不设置 audience
                }
            )
            
            # 检查必需字段
            if "sub" not in payload:
                raise AuthenticationError("Token 缺少用户 ID")
            
            if "exp" in payload:
                exp = payload["exp"]
                if datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
                    raise AuthenticationError("Token 已过期")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token 已过期")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"无效的 Token: {str(e)}")
        except Exception as e:
            logger.error(f"JWT verification error: {str(e)}")
            raise AuthenticationError("Token 验证失败")
    
    def _verify_test_token(self, token: str) -> Dict[str, Any]:
        """
        测试模式的 Token 验证
        
        仅用于开发环境，不依赖真实的 JWT Secret。
        生产环境严格禁止使用。
        """
        # 严格检查环境
        if settings.is_production:
            raise AuthenticationError("Test tokens are strictly forbidden in production")
        
        if not settings.debug:
            raise AuthenticationError("测试 Token 只能在开发模式下使用")
        
        logger.warning(f"Using test authentication - DEVELOPMENT ONLY: {token}")
        
        # 预定义的测试 token
        test_tokens = {
            "test-user-token": {
                "sub": "00000000-0000-0000-0000-000000000001",
                "email": "test@example.com",
                "role": "authenticated",
                "user_metadata": {
                    "name": "Test User"
                },
                "app_metadata": {
                    "provider": "email",
                    "providers": ["email"]
                },
                "aud": "authenticated",
                "exp": 9999999999,  # 很久以后才过期
                "iat": 1700000000,
            },
            "test-admin-token": {
                "sub": "00000000-0000-0000-0000-000000000002",
                "email": "admin@example.com",
                "role": "authenticated",
                "user_metadata": {
                    "name": "Admin User",
                    "role": "admin"
                },
                "app_metadata": {
                    "provider": "email",
                    "providers": ["email"],
                    "role": "admin"
                },
                "aud": "authenticated",
                "exp": 9999999999,
                "iat": 1700000000,
            }
        }
        
        if token in test_tokens:
            logger.info(f"Using test token: {token}")
            return test_tokens[token]
        
        raise AuthenticationError(f"未知的测试 Token: {token}")
    
    def extract_user_info(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        从 JWT payload 提取用户信息
        
        Args:
            payload: JWT payload
            
        Returns:
            Dict: 用户信息
        """
        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Token 中缺少用户 ID")
        
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            raise AuthenticationError("无效的用户 ID 格式")
        
        # 提取用户信息
        email = payload.get("email", "")
        user_metadata = payload.get("user_metadata", {})
        app_metadata = payload.get("app_metadata", {})
        
        # 确定用户角色
        role = "user"  # 默认角色
        
        # 从 app_metadata 中获取角色
        if app_metadata.get("role") == "admin":
            role = "admin"
        elif user_metadata.get("role") == "admin":
            role = "admin"
        
        return {
            "id": user_uuid,
            "email": email,
            "role": role,
            "metadata": {
                "user_metadata": user_metadata,
                "app_metadata": app_metadata,
                "auth_provider": app_metadata.get("provider", "unknown")
            }
        }
    
    def validate_token(self, token: str) -> Dict[str, Any]:
        """
        验证 Token 并返回用户信息
        
        Args:
            token: JWT Token
            
        Returns:
            Dict: 用户信息
        """
        payload = self.verify_jwt_token(token)
        return self.extract_user_info(payload)


# 创建全局认证实例
supabase_auth = SupabaseAuth()


# ===== 辅助函数 =====

def extract_bearer_token(authorization: str) -> str:
    """
    从 Authorization 头部提取 Bearer Token
    
    Args:
        authorization: Authorization 头部值
        
    Returns:
        str: Token 字符串
        
    Raises:
        AuthenticationError: 头部格式无效
    """
    if not authorization:
        raise AuthenticationError("缺少 Authorization 头部")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthenticationError("无效的 Authorization 头部格式")
    
    return parts[1]


def validate_user_access(user_id: UUID, resource_user_id: UUID) -> None:
    """
    验证用户是否有权访问特定资源
    
    Args:
        user_id: 当前用户 ID
        resource_user_id: 资源所属用户 ID
        
    Raises:
        AuthorizationError: 用户无权访问
    """
    if user_id != resource_user_id:
        raise AuthorizationError("无权访问此资源")


def require_admin_role(user_role: str) -> None:
    """
    要求管理员角色
    
    Args:
        user_role: 用户角色
        
    Raises:
        AuthorizationError: 不是管理员
    """
    if user_role != "admin":
        raise AuthorizationError("需要管理员权限")


# ===== 导出 =====

__all__ = [
    "SupabaseAuth",
    "supabase_auth",
    "extract_bearer_token",
    "validate_user_access",
    "require_admin_role",
]