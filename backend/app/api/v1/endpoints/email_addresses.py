"""
邮件地址管理 API 端点
"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field, EmailStr

from app.core.dependencies import CurrentUser, get_current_user, get_db_session
from app.models.email_address import EmailAddress, EmailAddressType, EmailAddressStatus
from app.services.email_address_service import EmailAddressService
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


# ===== Pydantic 模型 =====

class EmailAddressCreate(BaseModel):
    """创建邮件地址请求"""
    address_type: EmailAddressType = Field(default=EmailAddressType.custom, description="地址类型")
    alias: Optional[str] = Field(None, max_length=50, description="地址别名")
    description: Optional[str] = Field(None, max_length=200, description="地址描述")
    expires_days: Optional[int] = Field(None, gt=0, le=365, description="有效期天数")
    allowed_senders: Optional[List[EmailStr]] = Field(default_factory=list, description="允许的发件人")
    custom_local_part: Optional[str] = Field(None, max_length=20, description="自定义地址前缀")


class EmailAddressUpdate(BaseModel):
    """更新邮件地址请求"""
    alias: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=200)
    status: Optional[EmailAddressStatus] = Field(None, description="地址状态")
    is_default: Optional[bool] = Field(None, description="是否为默认地址")
    allowed_senders: Optional[List[EmailStr]] = Field(None, description="允许的发件人")
    config: Optional[Dict[str, Any]] = Field(None, description="配置选项")


class EmailAddressResponse(BaseModel):
    """邮件地址响应"""
    id: UUID
    email_address: str
    local_part: str
    domain: str
    address_type: str
    alias: Optional[str] = None
    description: Optional[str] = None
    status: str
    is_default: bool
    total_emails_received: int
    last_email_received_at: Optional[str] = None
    expires_at: Optional[str] = None
    allowed_senders: List[str] = []
    config: Dict[str, Any] = {}
    created_at: str
    updated_at: str
    
    # 计算属性
    is_active: bool
    is_expired: bool
    display_name: str
    usage_stats: Dict[str, Any]

    class Config:
        from_attributes = True


class EmailAddressListResponse(BaseModel):
    """邮件地址列表响应"""
    addresses: List[EmailAddressResponse]
    total_count: int
    active_count: int
    default_address: Optional[EmailAddressResponse] = None


class EmailAddressStatsResponse(BaseModel):
    """邮件地址统计响应"""
    total_addresses: int
    active_addresses: int
    total_emails_received: int
    addresses_by_type: Dict[str, int]
    addresses_by_status: Dict[str, int]
    most_used_address: Optional[EmailAddressResponse] = None


# ===== API 端点 =====

@router.get("/", response_model=EmailAddressListResponse, summary="获取邮件地址列表")
async def get_email_addresses(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    address_type: Optional[EmailAddressType] = Query(None, description="按类型筛选"),
    status: Optional[EmailAddressStatus] = Query(None, description="按状态筛选"),
    include_expired: bool = Query(False, description="包含过期地址")
):
    """获取用户所有邮件地址"""
    try:
        service = EmailAddressService(db)
        addresses = await service.get_user_addresses(
            user_id=current_user.id,
            address_type=address_type,
            status=status,
            include_expired=include_expired
        )
        
        # 获取统计信息
        total_count = len(addresses)
        active_count = len([addr for addr in addresses if addr.is_active])
        default_address = next((addr for addr in addresses if addr.is_default), None)
        
        return EmailAddressListResponse(
            addresses=[EmailAddressResponse.model_validate(addr) for addr in addresses],
            total_count=total_count,
            active_count=active_count,
            default_address=EmailAddressResponse.model_validate(default_address) if default_address else None
        )
        
    except Exception as e:
        logger.error(f"获取邮件地址列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取邮件地址列表失败"
        )


@router.post("/", response_model=EmailAddressResponse, status_code=status.HTTP_201_CREATED, summary="创建邮件地址")
async def create_email_address(
    address_data: EmailAddressCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """为用户创建新的邮件地址"""
    try:
        service = EmailAddressService(db)
        
        # 检查用户地址数量限制
        existing_count = await service.count_user_addresses(current_user.id)
        max_addresses = 10  # 可以从配置文件读取
        
        if existing_count >= max_addresses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"用户邮件地址数量已达上限 ({max_addresses})"
            )
        
        # 创建邮件地址
        new_address = await service.create_address(
            user_id=current_user.id,
            address_type=address_data.address_type,
            alias=address_data.alias,
            description=address_data.description,
            expires_days=address_data.expires_days,
            allowed_senders=address_data.allowed_senders,
            custom_local_part=address_data.custom_local_part
        )
        
        logger.info(f"用户 {current_user.id} 创建邮件地址: {new_address.email_address}")
        return EmailAddressResponse.model_validate(new_address)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建邮件地址失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="创建邮件地址失败"
        )


@router.get("/{address_id}", response_model=EmailAddressResponse, summary="获取邮件地址详情")
async def get_email_address(
    address_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """获取指定邮件地址的详细信息"""
    try:
        service = EmailAddressService(db)
        address = await service.get_user_address(current_user.id, address_id)
        
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邮件地址不存在"
            )
        
        return EmailAddressResponse.model_validate(address)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取邮件地址详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取邮件地址详情失败"
        )


@router.put("/{address_id}", response_model=EmailAddressResponse, summary="更新邮件地址")
async def update_email_address(
    address_id: UUID,
    update_data: EmailAddressUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """更新邮件地址信息"""
    try:
        service = EmailAddressService(db)
        
        # 检查地址是否存在且属于当前用户
        address = await service.get_user_address(current_user.id, address_id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邮件地址不存在"
            )
        
        # 更新地址信息
        updated_address = await service.update_address(address, update_data.model_dump(exclude_unset=True))
        
        logger.info(f"用户 {current_user.id} 更新邮件地址: {address.email_address}")
        return EmailAddressResponse.model_validate(updated_address)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新邮件地址失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新邮件地址失败"
        )


@router.delete("/{address_id}", summary="删除邮件地址")
async def delete_email_address(
    address_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    force: bool = Query(False, description="强制删除（即使有关联发票）")
):
    """删除邮件地址"""
    try:
        service = EmailAddressService(db)
        
        # 检查地址是否存在且属于当前用户
        address = await service.get_user_address(current_user.id, address_id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邮件地址不存在"
            )
        
        # 检查是否为默认地址
        if address.is_default:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无法删除默认邮件地址，请先设置其他地址为默认"
            )
        
        # 检查是否有关联的发票
        if not force and address.total_emails_received > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="此地址已接收过邮件，无法删除。使用 force=true 强制删除。"
            )
        
        # 删除地址
        await service.delete_address(address)
        
        logger.info(f"用户 {current_user.id} 删除邮件地址: {address.email_address}")
        return {"message": "邮件地址已删除"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除邮件地址失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除邮件地址失败"
        )


@router.post("/{address_id}/set-default", response_model=EmailAddressResponse, summary="设置默认地址")
async def set_default_address(
    address_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """设置指定地址为默认地址"""
    try:
        service = EmailAddressService(db)
        
        # 检查地址是否存在且属于当前用户
        address = await service.get_user_address(current_user.id, address_id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邮件地址不存在"
            )
        
        # 设置为默认地址
        updated_address = await service.set_default_address(current_user.id, address_id)
        
        logger.info(f"用户 {current_user.id} 设置默认邮件地址: {address.email_address}")
        return EmailAddressResponse.model_validate(updated_address)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"设置默认地址失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="设置默认地址失败"
        )


@router.post("/{address_id}/activate", response_model=EmailAddressResponse, summary="激活地址")
async def activate_address(
    address_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """激活已停用的邮件地址"""
    try:
        service = EmailAddressService(db)
        
        address = await service.get_user_address(current_user.id, address_id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邮件地址不存在"
            )
        
        if address.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="地址已处于激活状态"
            )
        
        # 激活地址
        address.reactivate()
        await db.commit()
        await db.refresh(address)
        
        logger.info(f"用户 {current_user.id} 激活邮件地址: {address.email_address}")
        return EmailAddressResponse.model_validate(address)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"激活地址失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="激活地址失败"
        )


@router.post("/{address_id}/deactivate", response_model=EmailAddressResponse, summary="停用地址")
async def deactivate_address(
    address_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
    reason: Optional[str] = Query(None, description="停用原因")
):
    """停用邮件地址"""
    try:
        service = EmailAddressService(db)
        
        address = await service.get_user_address(current_user.id, address_id)
        if not address:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="邮件地址不存在"
            )
        
        if address.is_default:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无法停用默认地址"
            )
        
        # 停用地址
        address.deactivate(reason)
        await db.commit()
        await db.refresh(address)
        
        logger.info(f"用户 {current_user.id} 停用邮件地址: {address.email_address}")
        return EmailAddressResponse.model_validate(address)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"停用地址失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="停用地址失败"
        )


@router.get("/stats/overview", response_model=EmailAddressStatsResponse, summary="获取邮件地址统计")
async def get_address_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """获取用户邮件地址使用统计"""
    try:
        service = EmailAddressService(db)
        stats = await service.get_user_stats(current_user.id)
        
        return EmailAddressStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"获取邮件地址统计失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取统计信息失败"
        )


@router.post("/generate-default", response_model=EmailAddressResponse, summary="生成默认地址")
async def generate_default_address(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    """为新用户生成默认邮件地址"""
    try:
        service = EmailAddressService(db)
        
        # 检查是否已有默认地址
        existing_default = await service.get_default_address(current_user.id)
        if existing_default:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户已有默认邮件地址"
            )
        
        # 生成默认地址
        default_address = await service.create_default_address(current_user.id)
        
        logger.info(f"为用户 {current_user.id} 生成默认邮件地址: {default_address.email_address}")
        return EmailAddressResponse.model_validate(default_address)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成默认地址失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成默认地址失败"
        )