"""邮箱账户服务"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
import logging

from app.models.email_account import EmailAccount
from app.models.email_index import EmailSyncState, EmailIndex
from app.models.email_scan_job import EmailScanJob
from app.models.task import EmailProcessingTask
from app.schemas.email_account import (
    EmailAccountCreate,
    EmailAccountUpdate,
    EmailAccountResponse,
    EmailAccountTestResponse
)
from app.services.email.imap_client import IMAPClient
from app.utils.encryption import encrypt_email_password, decrypt_email_password
from app.core.exceptions import NotFoundError, BusinessException

logger = logging.getLogger(__name__)


class EmailAccountService:
    """邮箱账户服务类"""
    
    @staticmethod
    async def create_email_account(
        db: AsyncSession,
        user_id: str,
        account_data: EmailAccountCreate
    ) -> EmailAccount:
        """创建邮箱账户
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            account_data: 邮箱账户数据
            
        Returns:
            创建的邮箱账户
        """
        # 检查是否已存在相同的邮箱地址
        stmt = select(EmailAccount).filter(
            and_(
                EmailAccount.user_id == user_id,
                EmailAccount.email_address == account_data.email_address
            )
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        if existing:
            raise BusinessException("该邮箱地址已经添加过了")
        
        # 自动检测并设置邮箱服务商配置
        if not account_data.email_provider or not account_data.imap_host:
            email_domain = account_data.email_address.split('@')[1].lower()
            provider_config = EmailAccount.Config.SUPPORTED_PROVIDERS.get(
                email_domain.split('.')[0]  # 提取主域名，如 qq, 163 等
            )
            
            if provider_config:
                if not account_data.email_provider:
                    account_data.email_provider = email_domain.split('.')[0]
                if not account_data.imap_host:
                    account_data.imap_host = provider_config["imap_host"]
                if not account_data.imap_port:
                    account_data.imap_port = provider_config["imap_port"]
                if account_data.imap_use_ssl is None:
                    account_data.imap_use_ssl = provider_config["imap_use_ssl"]
        
        # 加密密码
        encrypted_password = encrypt_email_password(account_data.password)
        
        # 创建邮箱账户
        email_account = EmailAccount(
            user_id=user_id,
            email_address=account_data.email_address,
            email_provider=account_data.email_provider,
            display_name=account_data.display_name,
            encrypted_password=encrypted_password,
            imap_host=account_data.imap_host,
            imap_port=account_data.imap_port,
            imap_use_ssl=account_data.imap_use_ssl,
            scan_folder=account_data.scan_folder,
            scan_rules=account_data.scan_rules,
            is_active=account_data.is_active
        )
        
        db.add(email_account)
        await db.commit()
        await db.refresh(email_account)
        
        # 测试连接
        test_result = await EmailAccountService.test_connection(db, email_account.id, user_id)
        if not test_result.success:
            logger.warning(f"新创建的邮箱账户连接测试失败: {test_result.message}")
        
        return email_account
    
    @staticmethod
    async def get_email_accounts(
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[EmailAccount]:
        """获取用户的邮箱账户列表
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            skip: 跳过记录数
            limit: 返回记录数
            is_active: 是否只返回启用的账户
            
        Returns:
            邮箱账户列表
        """
        stmt = select(EmailAccount).filter(EmailAccount.user_id == user_id)
        
        if is_active is not None:
            stmt = stmt.filter(EmailAccount.is_active == is_active)
        
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        accounts = result.scalars().all()
        
        # 为每个账户获取同步状态
        for account in accounts:
            sync_state = await EmailAccountService.get_sync_state(db, str(account.id))
            # 将同步状态附加到账户对象（使用动态属性）
            account.sync_state = sync_state
            
        return accounts
    
    @staticmethod
    async def get_email_account(
        db: AsyncSession,
        account_id: str,
        user_id: str
    ) -> EmailAccount:
        """获取单个邮箱账户
        
        Args:
            db: 数据库会话
            account_id: 邮箱账户ID
            user_id: 用户ID
            
        Returns:
            邮箱账户
            
        Raises:
            NotFoundException: 账户不存在
        """
        stmt = select(EmailAccount).filter(
            and_(
                EmailAccount.id == account_id,
                EmailAccount.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            raise NotFoundError(resource="邮箱账户", message=f"邮箱账户 {account_id} 不存在")
        
        return account
    
    @staticmethod
    async def update_email_account(
        db: AsyncSession,
        account_id: str,
        user_id: str,
        update_data: EmailAccountUpdate
    ) -> EmailAccount:
        """更新邮箱账户
        
        Args:
            db: 数据库会话
            account_id: 邮箱账户ID
            user_id: 用户ID
            update_data: 更新数据
            
        Returns:
            更新后的邮箱账户
        """
        account = await EmailAccountService.get_email_account(db, account_id, user_id)
        
        # 更新字段
        update_dict = update_data.dict(exclude_unset=True)
        
        # 如果更新密码，需要加密
        if 'password' in update_dict:
            account.encrypted_password = encrypt_email_password(update_dict.pop('password'))
        
        for field, value in update_dict.items():
            setattr(account, field, value)
        
        account.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(account)
        
        return account
    
    @staticmethod
    async def delete_email_account(
        db: AsyncSession,
        account_id: str,
        user_id: str
    ) -> bool:
        """删除邮箱账户
        
        Args:
            db: 数据库会话
            account_id: 邮箱账户ID
            user_id: 用户ID
            
        Returns:
            是否删除成功
        """
        account = await EmailAccountService.get_email_account(db, account_id, user_id)
        
        await db.delete(account)
        await db.commit()
        
        return True
    
    @staticmethod
    async def test_connection(
        db: AsyncSession,
        account_id: str,
        user_id: str,
        temp_password: Optional[str] = None
    ) -> EmailAccountTestResponse:
        """测试邮箱连接
        
        Args:
            db: 数据库会话
            account_id: 邮箱账户ID
            user_id: 用户ID
            temp_password: 临时密码（用于测试新密码）
            
        Returns:
            测试结果
        """
        account = await EmailAccountService.get_email_account(db, account_id, user_id)
        
        # 获取密码
        if temp_password:
            password = temp_password
        else:
            password = decrypt_email_password(account.encrypted_password)
        
        # 创建IMAP客户端
        client = IMAPClient(
            host=account.imap_host,
            port=account.imap_port,
            use_ssl=account.imap_use_ssl
        )
        
        try:
            # 尝试连接
            success = client.connect(account.email_address, password)
            
            if success:
                # 获取文件夹列表
                folders = client.list_folders()
                
                # 选择收件箱
                if client.select_folder("INBOX"):
                    # 搜索邮件数量
                    email_ids = client.search_emails("ALL")
                    email_count = len(email_ids)
                else:
                    email_count = 0
                
                # 更新连接状态
                account.is_verified = True
                account.last_error = None
                
                await db.commit()
                
                return EmailAccountTestResponse(
                    success=True,
                    message="连接成功",
                    folders=folders,
                    email_count=email_count
                )
            else:
                # 更新连接状态
                account.is_verified = False
                account.last_error = "登录失败，请检查邮箱地址和密码"
                
                await db.commit()
                
                return EmailAccountTestResponse(
                    success=False,
                    message="登录失败，请检查邮箱地址和密码"
                )
                
        except Exception as e:
            error_msg = str(e)
            logger.error(f"测试邮箱连接失败: {error_msg}")
            
            # 更新连接状态
            account.is_verified = False
            account.last_error = error_msg
            
            await db.commit()
            
            return EmailAccountTestResponse(
                success=False,
                message=f"连接失败: {error_msg}",
                details={"error": error_msg}
            )
        finally:
            # 断开连接
            client.disconnect()
    
    @staticmethod
    def get_imap_config(email_address: str) -> Dict[str, Any]:
        """根据邮箱地址获取IMAP配置
        
        Args:
            email_address: 邮箱地址
            
        Returns:
            IMAP配置信息
        """
        domain = email_address.split('@')[-1].lower()
        
        # IMAP配置映射
        imap_configs = {
            'qq.com': {
                'host': 'imap.qq.com',
                'port': 993,
                'use_ssl': True,
                'provider': 'qq'
            },
            '163.com': {
                'host': 'imap.163.com',
                'port': 993,
                'use_ssl': True,
                'provider': '163'
            },
            '126.com': {
                'host': 'imap.126.com',
                'port': 993,
                'use_ssl': True,
                'provider': '126'
            },
            'gmail.com': {
                'host': 'imap.gmail.com',
                'port': 993,
                'use_ssl': True,
                'provider': 'gmail'
            },
            'outlook.com': {
                'host': 'outlook.office365.com',
                'port': 993,
                'use_ssl': True,
                'provider': 'outlook'
            },
            'hotmail.com': {
                'host': 'outlook.office365.com',
                'port': 993,
                'use_ssl': True,
                'provider': 'hotmail'
            },
            'yahoo.com': {
                'host': 'imap.mail.yahoo.com',
                'port': 993,
                'use_ssl': True,
                'provider': 'yahoo'
            },
            'sina.com': {
                'host': 'imap.sina.com',
                'port': 993,
                'use_ssl': True,
                'provider': 'sina'
            },
            'sohu.com': {
                'host': 'imap.sohu.com',
                'port': 993,
                'use_ssl': True,
                'provider': 'sohu'
            }
        }
        
        return imap_configs.get(domain, {
            'host': '',
            'port': 993,
            'use_ssl': True,
            'provider': 'other'
        })
    
    @staticmethod
    async def get_sync_state(
        db: AsyncSession,
        account_id: str,
        folder_name: str = 'INBOX'
    ) -> Optional[Dict[str, Any]]:
        """获取邮箱账户的同步状态
        
        Args:
            db: 数据库会话
            account_id: 邮箱账户ID
            folder_name: 文件夹名称
            
        Returns:
            同步状态信息
        """
        stmt = select(EmailSyncState).filter(
            and_(
                EmailSyncState.account_id == account_id,
                EmailSyncState.folder_name == folder_name
            )
        )
        result = await db.execute(stmt)
        sync_state = result.scalar_one_or_none()
        
        if sync_state:
            return {
                'sync_mode': sync_state.sync_mode,
                'last_full_sync_time': sync_state.last_full_sync_time.isoformat() if sync_state.last_full_sync_time else None,
                'last_incremental_sync_time': sync_state.last_incremental_sync_time.isoformat() if sync_state.last_incremental_sync_time else None,
                'total_emails_indexed': sync_state.total_emails_indexed,
                'is_synced': sync_state.sync_mode in ['incremental', 'full_sync_completed']
            }
        else:
            return {
                'sync_mode': 'never_synced',
                'last_full_sync_time': None,
                'last_incremental_sync_time': None,
                'total_emails_indexed': 0,
                'is_synced': False
            }
    
    @staticmethod
    async def reset_sync_state(
        db: AsyncSession,
        account_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """重置邮箱账户的同步状态
        
        删除所有相关的同步记录和邮件索引，准备重新进行初次同步
        
        Args:
            db: 数据库会话
            account_id: 邮箱账户ID
            user_id: 用户ID
            
        Returns:
            重置结果
        """
        # 验证账户所有权
        stmt = select(EmailAccount).filter(
            and_(
                EmailAccount.id == account_id,
                EmailAccount.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            raise NotFoundError("邮箱账户不存在")
        
        try:
            # 删除邮件索引
            await db.execute(
                EmailIndex.__table__.delete().where(
                    EmailIndex.account_id == account_id
                )
            )
            
            # 删除同步状态
            await db.execute(
                EmailSyncState.__table__.delete().where(
                    EmailSyncState.account_id == account_id
                )
            )
            
            # 提交事务
            await db.commit()
            
            # 返回结果
            return {
                "success": True,
                "message": "同步状态已重置，可以开始初次同步",
                "deleted_items": {
                    "email_index": "已清空",
                    "sync_state": "已重置"
                }
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"重置同步状态失败: {str(e)}")
            raise BusinessException(f"重置同步状态失败: {str(e)}")
    
    @staticmethod
    async def reset_account_data(
        db: AsyncSession,
        account_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """重置账户的所有相关数据
        
        删除该账户的所有相关记录，包括：
        - 邮件索引 (email_index)
        - 同步状态 (email_sync_state)
        - 扫描任务 (email_scan_jobs)
        - 处理任务 (email_processing_tasks)
        
        Args:
            db: 数据库会话
            account_id: 邮箱账户ID
            user_id: 用户ID
            
        Returns:
            重置结果
        """
        # 验证账户所有权
        stmt = select(EmailAccount).filter(
            and_(
                EmailAccount.id == account_id,
                EmailAccount.user_id == user_id
            )
        )
        result = await db.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            raise NotFoundError("邮箱账户不存在")
        
        try:
            deleted_counts = {}
            
            # 1. 删除邮件索引
            result = await db.execute(
                EmailIndex.__table__.delete().where(
                    EmailIndex.account_id == account_id
                )
            )
            deleted_counts['email_index'] = result.rowcount
            
            # 2. 删除同步状态
            result = await db.execute(
                EmailSyncState.__table__.delete().where(
                    EmailSyncState.account_id == account_id
                )
            )
            deleted_counts['sync_state'] = result.rowcount
            
            # 3. 删除扫描任务
            result = await db.execute(
                EmailScanJob.__table__.delete().where(
                    EmailScanJob.email_account_id == account_id
                )
            )
            deleted_counts['scan_jobs'] = result.rowcount
            
            # 4. 删除处理任务
            # EmailProcessingTask 使用 task_data JSONB 字段存储 email_account_id
            from sqlalchemy import text
            result = await db.execute(
                text("""
                    DELETE FROM email_processing_tasks 
                    WHERE task_data->>'email_account_id' = :account_id
                """),
                {"account_id": str(account_id)}
            )
            deleted_counts['processing_tasks'] = result.rowcount
            
            # 提交事务
            await db.commit()
            
            logger.info(f"账户 {account_id} 的所有相关数据已重置: {deleted_counts}")
            
            # 返回结果
            return {
                "success": True,
                "message": "账户数据已完全重置",
                "deleted_counts": deleted_counts,
                "account_email": account.email_address
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"重置账户数据失败: {str(e)}")
            raise BusinessException(f"重置账户数据失败: {str(e)}")