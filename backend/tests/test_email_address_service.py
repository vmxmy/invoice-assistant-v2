"""
邮件地址服务层测试
测试EmailAddressService类的所有业务逻辑
"""

import pytest
import pytest_asyncio
from uuid import uuid4, UUID
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.email_address_service import EmailAddressService
from app.models.email_address import EmailAddress, EmailAddressType, EmailAddressStatus
from app.models.profile import Profile
from tests.conftest import (
    create_test_user, 
    create_test_email_address, 
    MockMailgunService,
    assert_valid_email,
    assert_valid_uuid
)


class TestEmailAddressService:
    """邮件地址服务测试类"""

    @pytest.fixture
    async def service(self, db_session: AsyncSession, mock_mailgun_service: MockMailgunService):
        """创建邮件地址服务实例"""
        service = EmailAddressService(db_session)
        # 使用mock服务替换真实的Mailgun服务
        service.mailgun_service = mock_mailgun_service
        return service

    @pytest.fixture
    async def test_user(self, db_session: AsyncSession):
        """创建测试用户"""
        return await create_test_user(db_session)

    async def test_create_primary_address(self, service: EmailAddressService, test_user: Profile):
        """测试创建主要地址"""
        address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.PRIMARY,
            alias="主要地址",
            description="用户的主要发票地址"
        )
        
        assert address.user_id == test_user.auth_user_id
        assert address.address_type == EmailAddressType.PRIMARY.value
        assert address.alias == "主要地址"
        assert address.description == "用户的主要发票地址"
        assert address.status == EmailAddressStatus.ACTIVE.value
        assert address.is_default == True  # 第一个地址应该是默认的
        assert address.expires_at is None  # 主要地址不应该过期
        assert assert_valid_email(address.email_address)
        assert "invoice-main" in address.email_address
        assert str(test_user.auth_user_id) in address.email_address

    async def test_create_custom_address_with_prefix(self, service: EmailAddressService, test_user: Profile):
        """测试创建带自定义前缀的地址"""
        address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.CUSTOM,
            custom_local_part="company",
            alias="公司地址"
        )
        
        assert "invoice-company" in address.email_address
        assert str(test_user.auth_user_id) in address.email_address
        assert address.alias == "公司地址"

    async def test_create_temporary_address_with_expiry(self, service: EmailAddressService, test_user: Profile):
        """测试创建带过期时间的临时地址"""
        expires_days = 30
        address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.TEMPORARY,
            expires_days=expires_days,
            alias="临时地址"
        )
        
        assert address.address_type == EmailAddressType.TEMPORARY.value
        assert address.expires_at is not None
        assert "invoice-temp" in address.email_address
        
        # 验证过期时间大约是30天后
        expected_expiry = datetime.now(timezone.utc) + timedelta(days=expires_days)
        time_diff = abs((address.expires_at - expected_expiry).total_seconds())
        assert time_diff < 3600  # 允许1小时误差

    async def test_create_address_with_allowed_senders(self, service: EmailAddressService, test_user: Profile):
        """测试创建带发件人白名单的地址"""
        allowed_senders = ["supplier1@company.com", "supplier2@company.com"]
        
        address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.WORK,
            allowed_senders=allowed_senders
        )
        
        assert address.allowed_senders == allowed_senders

    async def test_create_address_invalid_custom_prefix(self, service: EmailAddressService, test_user: Profile):
        """测试无效自定义前缀"""
        with pytest.raises(ValueError, match="自定义前缀格式无效"):
            await service.create_address(
                user_id=test_user.auth_user_id,
                address_type=EmailAddressType.CUSTOM,
                custom_local_part="invalid@prefix!"
            )

    async def test_create_address_second_becomes_non_default(self, service: EmailAddressService, test_user: Profile):
        """测试第二个地址不会成为默认地址"""
        # 创建第一个地址
        first_address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.PRIMARY
        )
        
        # 创建第二个地址
        second_address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.WORK
        )
        
        assert first_address.is_default == True
        assert second_address.is_default == False

    async def test_create_duplicate_address_type(self, service: EmailAddressService, test_user: Profile):
        """测试创建相同类型的地址"""
        # 创建第一个工作地址
        first_address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.WORK
        )
        
        # 创建第二个工作地址（应该成功，但地址不同）
        second_address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.WORK
        )
        
        assert first_address.email_address != second_address.email_address
        assert first_address.address_type == second_address.address_type

    async def test_create_default_address(self, service: EmailAddressService, test_user: Profile):
        """测试为新用户创建默认地址"""
        address = await service.create_default_address(test_user.auth_user_id)
        
        assert address.address_type == EmailAddressType.PRIMARY.value
        assert address.alias == "默认地址"
        assert address.is_default == True
        assert "系统自动生成" in address.description

    async def test_get_user_addresses(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试获取用户地址列表"""
        # 创建多个地址
        addresses = []
        for addr_type in [EmailAddressType.PRIMARY, EmailAddressType.WORK, EmailAddressType.PERSONAL]:
            address = await create_test_email_address(
                db_session,
                user_id=test_user.auth_user_id,
                address_type=addr_type
            )
            addresses.append(address)
        
        # 获取所有地址
        user_addresses = await service.get_user_addresses(test_user.auth_user_id)
        
        assert len(user_addresses) == 3
        assert all(addr.user_id == test_user.auth_user_id for addr in user_addresses)

    async def test_get_user_addresses_with_type_filter(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试按类型筛选用户地址"""
        # 创建不同类型的地址
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, address_type=EmailAddressType.WORK)
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, address_type=EmailAddressType.PERSONAL)
        
        # 只获取工作地址
        work_addresses = await service.get_user_addresses(
            test_user.auth_user_id,
            address_type=EmailAddressType.WORK
        )
        
        assert len(work_addresses) == 1
        assert work_addresses[0].address_type == EmailAddressType.WORK.value

    async def test_get_user_addresses_with_status_filter(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试按状态筛选用户地址"""
        # 创建不同状态的地址
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, status=EmailAddressStatus.ACTIVE)
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, status=EmailAddressStatus.INACTIVE)
        
        # 只获取激活的地址
        active_addresses = await service.get_user_addresses(
            test_user.auth_user_id,
            status=EmailAddressStatus.ACTIVE
        )
        
        assert len(active_addresses) == 1
        assert active_addresses[0].status == EmailAddressStatus.ACTIVE.value

    async def test_get_user_addresses_exclude_expired(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试排除过期地址"""
        # 创建正常地址
        await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        
        # 创建过期地址
        past_time = datetime.now(timezone.utc) - timedelta(days=1)
        await create_test_email_address(
            db_session, 
            user_id=test_user.auth_user_id,
            expires_at=past_time
        )
        
        # 默认排除过期地址
        addresses = await service.get_user_addresses(test_user.auth_user_id)
        assert len(addresses) == 1
        
        # 包含过期地址
        all_addresses = await service.get_user_addresses(
            test_user.auth_user_id,
            include_expired=True
        )
        assert len(all_addresses) == 2

    async def test_get_default_address(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试获取默认地址"""
        # 创建多个地址，其中一个是默认的
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, is_default=False)
        default_address = await create_test_email_address(db_session, user_id=test_user.auth_user_id, is_default=True)
        
        result = await service.get_default_address(test_user.auth_user_id)
        
        assert result is not None
        assert result.id == default_address.id
        assert result.is_default == True

    async def test_get_address_by_email(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试根据邮件地址获取记录"""
        address = await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        
        result = await service.get_address_by_email(address.email_address)
        
        assert result is not None
        assert result.id == address.id
        assert result.email_address == address.email_address

    async def test_get_address_by_email_case_insensitive(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试邮件地址查询大小写不敏感"""
        address = await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        
        # 使用大写查询
        result = await service.get_address_by_email(address.email_address.upper())
        
        assert result is not None
        assert result.id == address.id

    async def test_update_address(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试更新地址"""
        address = await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        
        updates = {
            "alias": "新别名",
            "description": "新描述",
            "allowed_senders": ["new@sender.com"]
        }
        
        updated_address = await service.update_address(address, updates)
        
        assert updated_address.alias == "新别名"
        assert updated_address.description == "新描述"
        assert updated_address.allowed_senders == ["new@sender.com"]

    async def test_set_default_address(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试设置默认地址"""
        # 创建两个地址
        address1 = await create_test_email_address(db_session, user_id=test_user.auth_user_id, is_default=True)
        address2 = await create_test_email_address(db_session, user_id=test_user.auth_user_id, is_default=False)
        
        # 设置第二个地址为默认
        result = await service.set_default_address(test_user.auth_user_id, address2.id)
        
        assert result.id == address2.id
        assert result.is_default == True
        
        # 验证原默认地址不再是默认的
        await db_session.refresh(address1)
        assert address1.is_default == False

    async def test_set_default_address_nonexistent(self, service: EmailAddressService, test_user: Profile):
        """测试设置不存在的地址为默认"""
        fake_id = uuid4()
        
        with pytest.raises(ValueError, match="邮件地址不存在"):
            await service.set_default_address(test_user.auth_user_id, fake_id)

    async def test_delete_address(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession, mock_mailgun_service: MockMailgunService):
        """测试删除地址（软删除）"""
        address = await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        
        await service.delete_address(address)
        
        # 验证软删除
        await db_session.refresh(address)
        assert address.deleted_at is not None
        
        # 验证Mailgun路由被移除
        assert address.email_address in mock_mailgun_service.routes_deleted

    async def test_count_user_addresses(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试统计用户地址数量"""
        # 创建3个地址
        for i in range(3):
            await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        
        count = await service.count_user_addresses(test_user.auth_user_id)
        
        assert count == 3

    async def test_count_user_addresses_excludes_deleted(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试地址计数排除已删除的地址"""
        # 创建2个正常地址
        for i in range(2):
            await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        
        # 创建1个已删除的地址
        deleted_address = await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        deleted_address.soft_delete()
        await db_session.commit()
        
        count = await service.count_user_addresses(test_user.auth_user_id)
        
        assert count == 2

    async def test_increment_email_count(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试增加邮件接收计数"""
        address = await create_test_email_address(db_session, user_id=test_user.auth_user_id)
        original_count = address.total_emails_received
        
        await service.increment_email_count(address.email_address)
        
        await db_session.refresh(address)
        assert address.total_emails_received == original_count + 1
        assert address.last_email_received_at is not None

    async def test_increment_email_count_nonexistent_address(self, service: EmailAddressService):
        """测试对不存在的地址增加计数"""
        # 不应该抛出异常
        await service.increment_email_count("nonexistent@example.com")

    async def test_get_user_stats(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试获取用户地址统计"""
        # 创建不同类型和状态的地址
        addresses = []
        for i, (addr_type, status) in enumerate([
            (EmailAddressType.PRIMARY, EmailAddressStatus.ACTIVE),
            (EmailAddressType.WORK, EmailAddressStatus.ACTIVE),
            (EmailAddressType.PERSONAL, EmailAddressStatus.INACTIVE)
        ]):
            address = await create_test_email_address(
                db_session,
                user_id=test_user.auth_user_id,
                address_type=addr_type,
                status=status
            )
            # 模拟邮件接收
            address.total_emails_received = (i + 1) * 10
            addresses.append(address)
        
        await db_session.commit()
        
        stats = await service.get_user_stats(test_user.auth_user_id)
        
        assert stats["total_addresses"] == 3
        assert stats["active_addresses"] == 2
        assert stats["total_emails_received"] == 60  # 10 + 20 + 30
        assert stats["addresses_by_type"][EmailAddressType.PRIMARY.value] == 1
        assert stats["addresses_by_type"][EmailAddressType.WORK.value] == 1
        assert stats["addresses_by_type"][EmailAddressType.PERSONAL.value] == 1
        assert stats["addresses_by_status"][EmailAddressStatus.ACTIVE.value] == 2
        assert stats["addresses_by_status"][EmailAddressStatus.INACTIVE.value] == 1
        assert stats["most_used_address"].total_emails_received == 30

    async def test_get_user_stats_empty(self, service: EmailAddressService, test_user: Profile):
        """测试没有地址时的统计"""
        stats = await service.get_user_stats(test_user.auth_user_id)
        
        assert stats["total_addresses"] == 0
        assert stats["active_addresses"] == 0
        assert stats["total_emails_received"] == 0
        assert stats["addresses_by_type"] == {}
        assert stats["addresses_by_status"] == {}
        assert stats["most_used_address"] is None

    async def test_address_generation_patterns(self, service: EmailAddressService, test_user: Profile):
        """测试各种地址生成模式"""
        test_cases = [
            (EmailAddressType.PRIMARY, "invoice-main"),
            (EmailAddressType.WORK, "invoice-work"),
            (EmailAddressType.PERSONAL, "invoice-personal"),
            (EmailAddressType.TEMPORARY, "invoice-temp"),
            (EmailAddressType.CUSTOM, "invoice-custom")
        ]
        
        for addr_type, expected_prefix in test_cases:
            address = await service.create_address(
                user_id=test_user.auth_user_id,
                address_type=addr_type
            )
            
            assert expected_prefix in address.email_address
            assert str(test_user.auth_user_id) in address.email_address

    async def test_temporary_address_random_suffix(self, service: EmailAddressService, test_user: Profile):
        """测试临时地址的随机后缀"""
        address1 = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.TEMPORARY
        )
        
        address2 = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.TEMPORARY
        )
        
        # 两个临时地址应该不同（因为随机后缀）
        assert address1.email_address != address2.email_address
        assert "invoice-temp" in address1.email_address
        assert "invoice-temp" in address2.email_address

    async def test_mailgun_integration_success(self, service: EmailAddressService, test_user: Profile, mock_mailgun_service: MockMailgunService):
        """测试Mailgun集成成功场景"""
        address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.PRIMARY
        )
        
        # 验证Mailgun路由被创建
        assert address.email_address in mock_mailgun_service.routes_created

    async def test_mailgun_integration_failure(self, service: EmailAddressService, test_user: Profile, mock_mailgun_service: MockMailgunService):
        """测试Mailgun集成失败场景"""
        mock_mailgun_service.should_fail = True
        
        # 即使Mailgun失败，地址创建也应该成功
        address = await service.create_address(
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.PRIMARY
        )
        
        assert address is not None
        assert address.email_address is not None

    async def test_type_prefix_generation(self, service: EmailAddressService):
        """测试地址类型前缀生成"""
        test_cases = [
            (EmailAddressType.PRIMARY, "main"),
            (EmailAddressType.WORK, "work"),
            (EmailAddressType.PERSONAL, "personal"),
            (EmailAddressType.TEMPORARY, "temp"),
            (EmailAddressType.CUSTOM, "custom")
        ]
        
        for addr_type, expected_prefix in test_cases:
            prefix = service._get_type_prefix(addr_type)
            assert prefix == expected_prefix

    async def test_random_string_generation(self, service: EmailAddressService):
        """测试随机字符串生成"""
        random_str1 = service._generate_random_string(8)
        random_str2 = service._generate_random_string(8)
        
        assert len(random_str1) == 8
        assert len(random_str2) == 8
        assert random_str1 != random_str2
        assert random_str1.isalnum()  # 只包含字母和数字

    async def test_local_part_validation(self, service: EmailAddressService):
        """测试邮件地址本地部分验证"""
        valid_cases = ["company", "test123", "my-company", "a"]
        invalid_cases = ["", "a" * 25, "invalid@", "test!", "test space"]
        
        for valid_case in valid_cases:
            assert service._is_valid_local_part(valid_case) == True
        
        for invalid_case in invalid_cases:
            assert service._is_valid_local_part(invalid_case) == False

    async def test_default_config_generation(self, service: EmailAddressService):
        """测试默认配置生成"""
        # 测试基础配置
        config = service._get_default_config(EmailAddressType.PRIMARY)
        assert config["auto_process"] == True
        assert config["notification_enabled"] == True
        assert config["archive_after_days"] == 365
        
        # 测试临时地址配置
        temp_config = service._get_default_config(EmailAddressType.TEMPORARY)
        assert temp_config["auto_expire"] == True
        assert temp_config["max_emails"] == 100
        
        # 测试工作地址配置
        work_config = service._get_default_config(EmailAddressType.WORK)
        assert work_config["business_hours_only"] == True
        assert work_config["priority"] == "high"

    async def test_clear_other_defaults(self, service: EmailAddressService, test_user: Profile, db_session: AsyncSession):
        """测试清除其他默认地址设置"""
        # 创建多个地址，都设为默认（虽然这在正常情况下不应该发生）
        addresses = []
        for i in range(3):
            address = await create_test_email_address(
                db_session,
                user_id=test_user.auth_user_id,
                is_default=True
            )
            addresses.append(address)
        
        # 调用清除方法
        await service._clear_other_defaults(test_user.auth_user_id)
        await db_session.commit()
        
        # 验证所有地址都不再是默认的
        for address in addresses:
            await db_session.refresh(address)
            assert address.is_default == False

    async def test_user_isolation(self, service: EmailAddressService, db_session: AsyncSession):
        """测试用户数据隔离"""
        # 创建两个用户
        user1 = await create_test_user(db_session, email="user1@example.com")
        user2 = await create_test_user(db_session, email="user2@example.com")
        
        # 为每个用户创建地址
        address1 = await service.create_address(user_id=user1.auth_user_id, address_type=EmailAddressType.PRIMARY)
        address2 = await service.create_address(user_id=user2.auth_user_id, address_type=EmailAddressType.PRIMARY)
        
        # 验证用户只能看到自己的地址
        user1_addresses = await service.get_user_addresses(user1.auth_user_id)
        user2_addresses = await service.get_user_addresses(user2.auth_user_id)
        
        assert len(user1_addresses) == 1
        assert len(user2_addresses) == 1
        assert user1_addresses[0].id == address1.id
        assert user2_addresses[0].id == address2.id
        
        # 验证用户不能获取其他用户的地址
        result = await service.get_user_address(user1.auth_user_id, address2.id)
        assert result is None