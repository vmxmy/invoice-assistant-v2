"""
认证相关 API 端点

处理用户认证、登录、登出等操作。
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional

from app.core.dependencies import CurrentUser, get_current_user_optional, security
from app.core.auth import supabase_auth
from app.core.exceptions import AuthenticationError

router = APIRouter()


@router.post("/verify-token")
async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    验证 JWT Token
    
    验证客户端提供的 JWT Token 是否有效。
    """
    try:
        if not credentials:
            return {
                "valid": False,
                "error": "缺少Authorization头部"
            }
        
        token = credentials.credentials
        user_info = supabase_auth.validate_token(token)
        
        return {
            "valid": True,
            "user": {
                "id": str(user_info["id"]),
                "email": user_info["email"],
                "role": user_info["role"]
            }
        }
    except AuthenticationError as e:
        return {
            "valid": False,
            "error": str(e)
        }


@router.get("/me")
async def get_current_user_info(
    current_user: CurrentUser = Depends(get_current_user_optional)
) -> dict:
    """
    获取当前用户信息
    
    返回当前认证用户的详细信息。
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未认证用户"
        )
    
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "is_admin": current_user.is_admin,
        "metadata": current_user.metadata
    }


@router.get("/status")
async def auth_status(
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional)
) -> dict:
    """
    获取认证状态
    
    返回当前请求的认证状态信息。
    """
    if current_user:
        return {
            "authenticated": True,
            "user_id": str(current_user.id),
            "email": current_user.email,
            "role": current_user.role
        }
    else:
        return {
            "authenticated": False,
            "user_id": None,
            "email": None,
            "role": None
        }