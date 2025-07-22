"""邮箱账户API端点"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Path, Body, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, CurrentUser
from app.schemas.email_account import (
    EmailAccountCreate,
    EmailAccountUpdate,
    EmailAccountResponse,
    EmailAccountListResponse,
    EmailAccountTestRequest,
    EmailAccountTestResponse
)
from app.services.email_account_service import EmailAccountService

router = APIRouter()


@router.get("", response_model=EmailAccountListResponse)
async def get_email_accounts(
    skip: int = Query(0, ge=0, description="跳过记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回记录数"),
    is_active: Optional[bool] = Query(None, description="是否只返回启用的账户"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取邮箱账户列表
    
    - **skip**: 跳过记录数
    - **limit**: 返回记录数
    - **is_active**: 是否只返回启用的账户
    """
    accounts = await EmailAccountService.get_email_accounts(
        db=db,
        user_id=str(current_user.id),
        skip=skip,
        limit=limit,
        is_active=is_active
    )
    
    total = len(accounts)  # 简化处理，实际应该查询总数
    
    # 转换账户对象，包含同步状态
    items = []
    for account in accounts:
        account_dict = account.__dict__.copy()
        # 添加同步状态（如果存在）
        if hasattr(account, 'sync_state'):
            account_dict['sync_state'] = account.sync_state
        items.append(EmailAccountResponse.model_validate(account_dict))
    
    return EmailAccountListResponse(
        total=total,
        items=items,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("", response_model=EmailAccountResponse)
async def create_email_account(
    account_data: EmailAccountCreate = Body(..., description="邮箱账户信息"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """创建邮箱账户
    
    创建新的邮箱账户，会自动：
    - 检测邮箱服务商
    - 自动填充IMAP配置
    - 加密存储密码
    - 测试连接
    """
    account = await EmailAccountService.create_email_account(
        db=db,
        user_id=str(current_user.id),
        account_data=account_data
    )
    
    return EmailAccountResponse.model_validate(account)


@router.get("/{account_id}", response_model=EmailAccountResponse)
async def get_email_account(
    account_id: UUID = Path(..., description="邮箱账户ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """获取单个邮箱账户详情"""
    account = await EmailAccountService.get_email_account(
        db=db,
        account_id=str(account_id),
        user_id=str(current_user.id)
    )
    
    return EmailAccountResponse.model_validate(account)


@router.put("/{account_id}", response_model=EmailAccountResponse)
async def update_email_account(
    account_id: UUID = Path(..., description="邮箱账户ID"),
    update_data: EmailAccountUpdate = Body(..., description="更新数据"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """更新邮箱账户
    
    支持更新：
    - 显示名称
    - 密码
    - IMAP/SMTP配置
    - 扫描配置
    - 启用状态
    """
    account = await EmailAccountService.update_email_account(
        db=db,
        account_id=str(account_id),
        user_id=str(current_user.id),
        update_data=update_data
    )
    
    return EmailAccountResponse.model_validate(account)


@router.delete("/{account_id}")
async def delete_email_account(
    account_id: UUID = Path(..., description="邮箱账户ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """删除邮箱账户
    
    删除邮箱账户会同时删除：
    - 相关的扫描任务记录
    - 扫描历史
    """
    await EmailAccountService.delete_email_account(
        db=db,
        account_id=str(account_id),
        user_id=str(current_user.id)
    )
    
    return {"message": "删除邮箱账户成功"}


@router.post("/{account_id}/test", response_model=EmailAccountTestResponse)
async def test_email_connection(
    account_id: UUID = Path(..., description="邮箱账户ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
    test_data: EmailAccountTestRequest = Body(
        default=EmailAccountTestRequest(),
        description="测试连接参数"
    )
):
    """测试邮箱连接
    
    测试邮箱账户的连接状态：
    - 验证IMAP连接
    - 获取文件夹列表
    - 统计邮件数量
    - 更新连接状态
    """
    result = await EmailAccountService.test_connection(
        db=db,
        account_id=str(account_id),
        user_id=str(current_user.id),
        temp_password=test_data.password
    )
    
    return result


@router.post("/detect-config")
async def detect_imap_config(
    email_address: str = Body(..., embed=True, description="邮箱地址")
):
    """检测IMAP配置
    
    根据邮箱地址自动检测IMAP服务器配置
    """
    config = EmailAccountService.get_imap_config(email_address)
    
    return {
        "message": "检测IMAP配置成功",
        "data": config
    }


@router.post("/{account_id}/reset-sync")
async def reset_sync_state(
    account_id: UUID = Path(..., description="邮箱账户ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """重置同步状态
    
    删除该邮箱账户的所有同步记录和邮件索引，准备重新进行初次同步
    
    **警告**：此操作会删除所有已同步的邮件记录，但不会影响实际邮箱中的邮件
    """
    result = await EmailAccountService.reset_sync_state(
        db=db,
        account_id=str(account_id),
        user_id=str(current_user.id)
    )
    
    return result


@router.post("/{account_id}/reset-all")
async def reset_account_data(
    account_id: UUID = Path(..., description="邮箱账户ID"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """完全重置账户数据
    
    删除该邮箱账户的所有相关记录，包括：
    - 邮件索引 (email_index)
    - 同步状态 (email_sync_state)
    - 扫描任务 (email_scan_jobs)
    - 处理任务 (email_processing_tasks)
    
    **警告**：此操作不可逆，会删除所有历史记录
    """
    result = await EmailAccountService.reset_account_data(
        db=db,
        account_id=str(account_id),
        user_id=str(current_user.id)
    )
    
    return result