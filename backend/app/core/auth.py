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
        
        # JWT密钥是必需的（在生产环境）
        if not self.jwt_secret:
            if settings.is_production:
                raise RuntimeError("SUPABASE_JWT_SECRET is required for authentication in production")
            else:
                logger.warning("SUPABASE_JWT_SECRET not configured - authentication will not work properly")
    
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
            # JWT Secret 是必需的
            if not self.jwt_secret:
                raise AuthenticationError("JWT Secret not configured")
            
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
    
    def verify_admin_role(self, user_info: Dict[str, Any]) -> bool:
        """
        验证用户是否具有管理员角色
        
        Args:
            user_info: 用户信息
            
        Returns:
            bool: 是否为管理员
        """
        return user_info.get("role") == "admin"


# 创建全局认证实例
try:
    supabase_auth = SupabaseAuth()
except RuntimeError as e:
    logger.error(f"Failed to initialize Supabase auth: {e}")
    # 在非生产环境下，创建一个空的实例以避免导入错误
    if not settings.is_production:
        supabase_auth = None
    else:
        raise