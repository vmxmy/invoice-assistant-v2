"""
用户档案相关 API 端点

处理用户档案的创建、查询、更新等操作。
"""

from typing import Optional
from uuid import UUID
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, model_serializer

from app.core.dependencies import CurrentUser, get_current_user, get_db_session
from app.models.profile import Profile

router = APIRouter()


# ===== Pydantic 模型 =====

class ProfileCreate(BaseModel):
    """创建档案请求模型"""
    display_name: Optional[str] = Field(None, max_length=100, description="显示名称")
    avatar_url: Optional[str] = Field(None, max_length=500, description="头像URL")
    bio: Optional[str] = Field(None, description="个人简介")
    preferences: Optional[dict] = Field(default_factory=dict, description="用户偏好设置")
    email_config: Optional[dict] = Field(default_factory=dict, description="邮件配置")


class ProfileUpdate(BaseModel):
    """更新档案请求模型"""
    display_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    bio: Optional[str] = Field(None, description="个人简介")
    preferences: Optional[dict] = Field(None, description="用户偏好设置")
    email_config: Optional[dict] = Field(None, description="邮件配置")


class ProfileResponse(BaseModel):
    """档案响应模型"""
    id: UUID
    auth_user_id: UUID
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    preferences: dict = {}
    email_config: dict = {}
    total_invoices: int = 0
    last_invoice_date: Optional[str] = None
    is_active: bool = True
    is_premium: bool = False
    premium_expires_at: Optional[str] = None
    created_at: str
    updated_at: str
    
    @classmethod
    def from_profile(cls, profile: Profile):
        """从 Profile 模型创建响应模型"""
        return cls(
            id=profile.id,
            auth_user_id=profile.auth_user_id,
            display_name=profile.display_name,
            avatar_url=profile.avatar_url,
            bio=profile.bio,
            preferences=profile.preferences or {},
            email_config=profile.email_config or {},
            total_invoices=profile.total_invoices,
            last_invoice_date=profile.last_invoice_date.isoformat() if profile.last_invoice_date else None,
            is_active=profile.is_active,
            is_premium=profile.is_premium,
            premium_expires_at=profile.premium_expires_at.isoformat() if profile.premium_expires_at else None,
            created_at=profile.created_at.isoformat(),
            updated_at=profile.updated_at.isoformat()
        )


# ===== API 端点 =====

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """获取当前用户的档案"""
    
    # 查询用户档案
    stmt = select(Profile).where(Profile.auth_user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户档案不存在"
        )
    
    return ProfileResponse.from_profile(profile)


@router.post("/me", response_model=ProfileResponse)
async def create_or_update_my_profile(
    profile_data: ProfileCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """创建或更新当前用户的档案"""
    
    # 检查是否已存在档案
    stmt = select(Profile).where(Profile.auth_user_id == current_user.id)
    result = await db.execute(stmt)
    existing_profile = result.scalar_one_or_none()
    
    if existing_profile:
        # 更新现有档案
        for field, value in profile_data.dict(exclude_unset=True).items():
            setattr(existing_profile, field, value)
        
        await db.commit()
        await db.refresh(existing_profile)
        return ProfileResponse.from_profile(existing_profile)
    else:
        # 创建新档案
        profile = Profile(
            auth_user_id=current_user.id,
            **profile_data.dict(exclude_unset=True)
        )
        
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return ProfileResponse.from_profile(profile)


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    profile_data: ProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """更新当前用户的档案"""
    
    # 查询现有档案
    stmt = select(Profile).where(Profile.auth_user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户档案不存在，请先创建档案"
        )
    
    # 更新字段
    update_data = profile_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    await db.commit()
    await db.refresh(profile)
    return ProfileResponse.from_profile(profile)


@router.delete("/me")
async def deactivate_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """停用当前用户的档案（软删除）"""
    
    # 查询现有档案
    stmt = select(Profile).where(Profile.auth_user_id == current_user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户档案不存在"
        )
    
    # 软删除
    profile.soft_delete()
    
    await db.commit()
    
    return {"message": "档案已停用"}