"""
用户管理相关 API 端点

处理用户信息的查询等操作（主要用于管理员功能）。
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.dependencies import CurrentUser, get_admin_user, get_db_session, PaginationParams, get_pagination_params
from app.models.profile import Profile

router = APIRouter()


# ===== Pydantic 模型 =====

class UserSummary(BaseModel):
    """用户摘要信息"""
    id: UUID
    auth_user_id: UUID
    display_name: Optional[str] = None
    is_active: bool = True
    is_premium: bool = False
    total_invoices: int = 0
    created_at: str
    updated_at: str
    
    @classmethod
    def from_profile(cls, profile: Profile):
        """从 Profile 模型创建响应模型"""
        return cls(
            id=profile.id,
            auth_user_id=profile.auth_user_id,
            display_name=profile.display_name,
            is_active=profile.is_active,
            is_premium=profile.is_premium,
            total_invoices=profile.total_invoices,
            created_at=profile.created_at.isoformat(),
            updated_at=profile.updated_at.isoformat()
        )


class UsersListResponse(BaseModel):
    """用户列表响应"""
    users: List[UserSummary]
    total: int
    page: int
    size: int
    pages: int


# ===== API 端点 =====

@router.get("/", response_model=UsersListResponse)
async def list_users(
    admin_user: CurrentUser = Depends(get_admin_user),
    pagination: PaginationParams = Depends(get_pagination_params),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db_session)
):
    """
    获取用户列表（管理员专用）
    
    支持分页和搜索功能。
    """
    
    # 构建查询
    query = select(Profile).where(Profile.deleted_at.is_(None))
    
    # 添加搜索条件
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            Profile.display_name.ilike(search_pattern)
        )
    
    # 获取总数
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 分页查询
    query = query.offset(pagination.offset).limit(pagination.limit)
    query = query.order_by(Profile.created_at.desc())
    
    result = await db.execute(query)
    profiles = result.scalars().all()
    
    # 计算页数
    pages = (total + pagination.size - 1) // pagination.size
    
    return UsersListResponse(
        users=[UserSummary.from_profile(profile) for profile in profiles],
        total=total,
        page=pagination.page,
        size=pagination.size,
        pages=pages
    )


@router.get("/{user_id}", response_model=UserSummary)
async def get_user(
    user_id: UUID,
    admin_user: CurrentUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session)
):
    """
    获取指定用户信息（管理员专用）
    """
    
    # 查询用户档案
    stmt = select(Profile).where(
        Profile.auth_user_id == user_id,
        Profile.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return UserSummary.from_profile(profile)


@router.get("/stats/overview")
async def get_user_stats(
    admin_user: CurrentUser = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db_session)
):
    """
    获取用户统计信息（管理员专用）
    """
    
    # 总用户数
    total_users_stmt = select(func.count()).select_from(Profile).where(Profile.deleted_at.is_(None))
    total_result = await db.execute(total_users_stmt)
    total_users = total_result.scalar()
    
    # 活跃用户数
    active_users_stmt = select(func.count()).select_from(Profile).where(
        Profile.deleted_at.is_(None),
        Profile.is_active == True
    )
    active_result = await db.execute(active_users_stmt)
    active_users = active_result.scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users
    }