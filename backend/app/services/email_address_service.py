"""
邮件地址管理服务
"""

import secrets
import string
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.email_address import EmailAddress, EmailAddressType, EmailAddressStatus
from app.models.profile import Profile
from app.services.mailgun_service import MailgunService
from app.utils.logger import get_logger

logger = get_logger(__name__)


class EmailAddressService:
    """邮件地址管理服务"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.mailgun_service = MailgunService()
        self.domain = getattr(settings, 'mailgun_domain', 'invoice.example.com')
    
    async def create_address(
        self,
        user_id: UUID,
        address_type: EmailAddressType = EmailAddressType.custom,
        alias: Optional[str] = None,
        description: Optional[str] = None,
        expires_days: Optional[int] = None,
        allowed_senders: Optional[List[str]] = None,
        custom_local_part: Optional[str] = None
    ) -> EmailAddress:
        """创建新的邮件地址"""
        
        # 生成邮件地址本地部分
        if custom_local_part:
            # 验证自定义前缀
            if not self._is_valid_local_part(custom_local_part):
                raise ValueError("自定义前缀格式无效")
            local_part = f"invoice-{custom_local_part}-{str(user_id)}"
        else:
            # 根据类型生成前缀
            type_prefix = self._get_type_prefix(address_type)
            if address_type == EmailAddressType.temporary:
                # 临时地址使用随机字符串
                random_suffix = self._generate_random_string(8)
                local_part = f"invoice-{type_prefix}-{random_suffix}-{str(user_id)}"
            else:
                local_part = f"invoice-{type_prefix}-{str(user_id)}"
        
        # 构造完整邮件地址
        email_address = f"{local_part}@{self.domain}"
        
        # 检查地址是否已存在
        existing = await self._get_address_by_email(email_address)
        if existing:
            raise ValueError("邮件地址已存在")
        
        # 计算过期时间
        expires_at = None
        if expires_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
        
        # 检查是否为第一个地址（设为默认）
        user_addresses_count = await self.count_user_addresses(user_id)
        is_default = (user_addresses_count == 0)
        
        # 创建地址记录
        new_address = EmailAddress(
            user_id=user_id,
            email_address=email_address,
            local_part=local_part,
            domain=self.domain,
            address_type=address_type.value,
            alias=alias,
            description=description,
            status=EmailAddressStatus.active.value,
            is_default=is_default,
            expires_at=expires_at,
            allowed_senders=allowed_senders or [],
            config=self._get_default_config(address_type)
        )
        
        self.db.add(new_address)
        await self.db.commit()
        await self.db.refresh(new_address)
        
        # 在Mailgun中配置路由（如果需要）
        try:
            await self.mailgun_service.ensure_route_exists(email_address)
        except Exception as e:
            logger.warning(f"Mailgun路由配置失败: {e}")
        
        return new_address
    
    async def create_default_address(self, user_id: UUID) -> EmailAddress:
        """为新用户创建默认邮件地址"""
        return await self.create_address(
            user_id=user_id,
            address_type=EmailAddressType.primary,
            alias="默认地址",
            description="系统自动生成的默认发票接收地址"
        )
    
    async def get_user_addresses(
        self,
        user_id: UUID,
        address_type: Optional[EmailAddressType] = None,
        status: Optional[EmailAddressStatus] = None,
        include_expired: bool = False
    ) -> List[EmailAddress]:
        """获取用户的邮件地址列表"""
        
        query = select(EmailAddress).where(
            and_(
                EmailAddress.user_id == user_id,
                EmailAddress.deleted_at.is_(None)
            )
        )
        
        # 按类型筛选
        if address_type:
            query = query.where(EmailAddress.address_type == address_type.value)
        
        # 按状态筛选
        if status:
            query = query.where(EmailAddress.status == status.value)
        
        # 是否包含过期地址
        if not include_expired:
            now = datetime.now(timezone.utc)
            query = query.where(
                or_(
                    EmailAddress.expires_at.is_(None),
                    EmailAddress.expires_at > now
                )
            )
        
        query = query.order_by(EmailAddress.is_default.desc(), EmailAddress.created_at.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_user_address(self, user_id: UUID, address_id: UUID) -> Optional[EmailAddress]:
        """获取用户的特定邮件地址"""
        query = select(EmailAddress).where(
            and_(
                EmailAddress.id == address_id,
                EmailAddress.user_id == user_id,
                EmailAddress.deleted_at.is_(None)
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_default_address(self, user_id: UUID) -> Optional[EmailAddress]:
        """获取用户的默认邮件地址"""
        query = select(EmailAddress).where(
            and_(
                EmailAddress.user_id == user_id,
                EmailAddress.is_default == True,
                EmailAddress.deleted_at.is_(None)
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_address_by_email(self, email_address: str) -> Optional[EmailAddress]:
        """根据邮件地址获取记录"""
        return await self._get_address_by_email(email_address)
    
    async def _get_address_by_email(self, email_address: str) -> Optional[EmailAddress]:
        """内部方法：根据邮件地址获取记录"""
        query = select(EmailAddress).where(
            and_(
                EmailAddress.email_address == email_address.lower(),
                EmailAddress.deleted_at.is_(None)
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_address(self, address: EmailAddress, updates: Dict[str, Any]) -> EmailAddress:
        """更新邮件地址"""
        
        # 处理特殊字段
        if 'allowed_senders' in updates:
            address.allowed_senders = updates.pop('allowed_senders')
        
        if 'config' in updates:
            address.update_config(updates.pop('config'))
        
        # 处理默认地址设置
        if updates.get('is_default') and not address.is_default:
            await self._clear_other_defaults(address.user_id)
        
        # 更新其他字段
        for field, value in updates.items():
            if hasattr(address, field) and value is not None:
                setattr(address, field, value)
        
        await self.db.commit()
        await self.db.refresh(address)
        
        return address
    
    async def set_default_address(self, user_id: UUID, address_id: UUID) -> EmailAddress:
        """设置默认邮件地址"""
        
        # 清除其他默认设置
        await self._clear_other_defaults(user_id)
        
        # 设置新的默认地址
        address = await self.get_user_address(user_id, address_id)
        if not address:
            raise ValueError("邮件地址不存在")
        
        address.is_default = True
        await self.db.commit()
        await self.db.refresh(address)
        
        return address
    
    async def delete_address(self, address: EmailAddress) -> None:
        """删除邮件地址（软删除）"""
        address.soft_delete()
        await self.db.commit()
        
        # 从Mailgun中移除路由（如果需要）
        try:
            await self.mailgun_service.remove_route(address.email_address)
        except Exception as e:
            logger.warning(f"Mailgun路由移除失败: {e}")
    
    async def count_user_addresses(self, user_id: UUID) -> int:
        """统计用户邮件地址数量"""
        query = select(func.count(EmailAddress.id)).where(
            and_(
                EmailAddress.user_id == user_id,
                EmailAddress.deleted_at.is_(None)
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def increment_email_count(self, email_address: str) -> None:
        """增加邮件接收计数"""
        address = await self.get_address_by_email(email_address)
        if address:
            address.increment_email_count()
            await self.db.commit()
    
    async def get_user_stats(self, user_id: UUID) -> Dict[str, Any]:
        """获取用户邮件地址统计"""
        
        # 基础统计查询
        base_query = select(EmailAddress).where(
            and_(
                EmailAddress.user_id == user_id,
                EmailAddress.deleted_at.is_(None)
            )
        )
        
        result = await self.db.execute(base_query)
        addresses = result.scalars().all()
        
        # 计算统计信息
        total_addresses = len(addresses)
        active_addresses = len([addr for addr in addresses if addr.is_active])
        total_emails_received = sum(addr.total_emails_received for addr in addresses)
        
        # 按类型统计
        addresses_by_type = {}
        for addr in addresses:
            addr_type = addr.address_type
            addresses_by_type[addr_type] = addresses_by_type.get(addr_type, 0) + 1
        
        # 按状态统计
        addresses_by_status = {}
        for addr in addresses:
            status = addr.status
            addresses_by_status[status] = addresses_by_status.get(status, 0) + 1
        
        # 最常用地址
        most_used_address = None
        if addresses:
            most_used_address = max(addresses, key=lambda x: x.total_emails_received)
        
        return {
            "total_addresses": total_addresses,
            "active_addresses": active_addresses,
            "total_emails_received": total_emails_received,
            "addresses_by_type": addresses_by_type,
            "addresses_by_status": addresses_by_status,
            "most_used_address": most_used_address
        }
    
    async def _clear_other_defaults(self, user_id: UUID) -> None:
        """清除用户的其他默认地址设置"""
        query = update(EmailAddress).where(
            and_(
                EmailAddress.user_id == user_id,
                EmailAddress.is_default == True,
                EmailAddress.deleted_at.is_(None)
            )
        ).values(is_default=False)
        
        await self.db.execute(query)
    
    def _get_type_prefix(self, address_type: EmailAddressType) -> str:
        """根据地址类型获取前缀"""
        prefix_map = {
            EmailAddressType.primary: "main",
            EmailAddressType.work: "work",
            EmailAddressType.personal: "personal",
            EmailAddressType.temporary: "temp",
            EmailAddressType.custom: "custom"
        }
        return prefix_map.get(address_type, "custom")
    
    def _generate_random_string(self, length: int = 8) -> str:
        """生成随机字符串"""
        characters = string.ascii_lowercase + string.digits
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    def _is_valid_local_part(self, local_part: str) -> bool:
        """验证邮件地址本地部分是否有效"""
        if not local_part:
            return False
        if len(local_part) > 20:
            return False
        # 只允许字母、数字、连字符
        return all(c.isalnum() or c == '-' for c in local_part)
    
    def _get_default_config(self, address_type: EmailAddressType) -> Dict[str, Any]:
        """获取地址类型的默认配置"""
        base_config = {
            "auto_process": True,
            "notification_enabled": True,
            "archive_after_days": 365
        }
        
        if address_type == EmailAddressType.temporary:
            base_config.update({
                "auto_expire": True,
                "max_emails": 100
            })
        elif address_type == EmailAddressType.work:
            base_config.update({
                "business_hours_only": True,
                "priority": "high"
            })
        
        return base_config