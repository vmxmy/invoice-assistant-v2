"""
邮件地址数据库模型测试
测试EmailAddress模型的所有方法、约束和数据库功能
"""

import pytest
import pytest_asyncio
from uuid import uuid4, UUID
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, and_, text

from app.models.email_address import EmailAddress, EmailAddressType, EmailAddressStatus
from app.models.profile import Profile
from tests.conftest import create_test_user, assert_valid_uuid


class TestEmailAddressModel:
    """邮件地址模型测试类"""

    @pytest.fixture
    async def test_user(self, db_session: AsyncSession):
        """创建测试用户"""
        return await create_test_user(db_session)

    async def test_create_basic_email_address(self, db_session: AsyncSession, test_user: Profile):
        """测试创建基础邮件地址"""
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="invoice-test@example.com",
            local_part="invoice-test",
            domain="example.com",
            address_type=EmailAddressType.PRIMARY.value,
            alias="测试地址",
            description="这是一个测试地址"
        )
        
        db_session.add(address)
        await db_session.commit()
        await db_session.refresh(address)
        
        assert address.id is not None
        assert assert_valid_uuid(str(address.id))
        assert address.user_id == test_user.auth_user_id
        assert address.email_address == "invoice-test@example.com"
        assert address.local_part == "invoice-test"
        assert address.domain == "example.com"
        assert address.address_type == EmailAddressType.PRIMARY.value
        assert address.alias == "测试地址"
        assert address.description == "这是一个测试地址"
        assert address.status == EmailAddressStatus.ACTIVE.value  # 默认状态
        assert address.is_default == False  # 默认值
        assert address.total_emails_received == 0  # 默认值
        assert address.allowed_senders == []  # 默认值
        assert address.config == {}  # 默认值
        assert address.created_at is not None
        assert address.updated_at is not None
        assert address.deleted_at is None

    async def test_email_address_unique_constraint(self, db_session: AsyncSession, test_user: Profile):
        """测试邮件地址唯一性约束"""
        email = "duplicate@example.com"
        
        # 创建第一个地址
        address1 = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address=email,
            local_part="duplicate",
            domain="example.com"
        )
        db_session.add(address1)
        await db_session.commit()
        
        # 尝试创建重复地址
        address2 = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address=email,
            local_part="duplicate",
            domain="example.com"
        )
        db_session.add(address2)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_email_format_constraint(self, db_session: AsyncSession, test_user: Profile):
        """测试邮件地址格式约束"""
        invalid_emails = [
            "invalid-email",  # 缺少@和域名
            "@example.com",   # 缺少本地部分
            "test@",          # 缺少域名
            "test@@example.com",  # 双@符号
            "test@.com",      # 域名格式错误
            ""                # 空字符串
        ]
        
        for invalid_email in invalid_emails:
            address = EmailAddress(
                user_id=test_user.auth_user_id,
                email_address=invalid_email,
                local_part="test",
                domain="example.com"
            )
            db_session.add(address)
            
            with pytest.raises(IntegrityError):
                await db_session.commit()
                
            await db_session.rollback()

    async def test_local_part_length_constraint(self, db_session: AsyncSession, test_user: Profile):
        """测试本地部分长度约束"""
        # 超长本地部分（>64字符）
        long_local_part = "a" * 65
        
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address=f"{long_local_part}@example.com",
            local_part=long_local_part,
            domain="example.com"
        )
        db_session.add(address)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_domain_length_constraint(self, db_session: AsyncSession, test_user: Profile):
        """测试域名长度约束"""
        # 超长域名（>100字符）
        long_domain = "a" * 95 + ".com"  # 99字符，超过100限制
        
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address=f"test@{long_domain}",
            local_part="test",
            domain=long_domain
        )
        db_session.add(address)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_negative_email_count_constraint(self, db_session: AsyncSession, test_user: Profile):
        """测试负数邮件计数约束"""
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="test@example.com",
            local_part="test",
            domain="example.com",
            total_emails_received=-1  # 负数
        )
        db_session.add(address)
        
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_address_type_enum(self, db_session: AsyncSession, test_user: Profile):
        """测试地址类型枚举"""
        valid_types = [
            EmailAddressType.PRIMARY,
            EmailAddressType.WORK,
            EmailAddressType.PERSONAL, 
            EmailAddressType.TEMPORARY,
            EmailAddressType.CUSTOM
        ]
        
        for addr_type in valid_types:
            address = EmailAddress(
                user_id=test_user.auth_user_id,
                email_address=f"{addr_type.value}@example.com",
                local_part=addr_type.value,
                domain="example.com",
                address_type=addr_type.value
            )
            db_session.add(address)
            await db_session.commit()
            
            await db_session.refresh(address)
            assert address.address_type == addr_type.value

    async def test_address_status_enum(self, db_session: AsyncSession, test_user: Profile):
        """测试地址状态枚举"""
        valid_statuses = [
            EmailAddressStatus.ACTIVE,
            EmailAddressStatus.INACTIVE,
            EmailAddressStatus.PENDING,
            EmailAddressStatus.SUSPENDED,
            EmailAddressStatus.EXPIRED
        ]
        
        for status in valid_statuses:
            address = EmailAddress(
                user_id=test_user.auth_user_id,
                email_address=f"{status.value}@example.com",
                local_part=status.value,
                domain="example.com",
                status=status.value
            )
            db_session.add(address)
            await db_session.commit()
            
            await db_session.refresh(address)
            assert address.status == status.value

    async def test_jsonb_fields(self, db_session: AsyncSession, test_user: Profile):
        """测试JSONB字段"""
        config_data = {
            "auto_process": True,
            "notification_enabled": False,
            "max_emails_per_day": 100,
            "settings": {
                "priority": "high",
                "tags": ["invoice", "billing"]
            }
        }
        
        allowed_senders = [
            "supplier1@company.com",
            "supplier2@company.com"
        ]
        
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="jsonb-test@example.com",
            local_part="jsonb-test",
            domain="example.com",
            config=config_data,
            allowed_senders=allowed_senders
        )
        
        db_session.add(address)
        await db_session.commit()
        await db_session.refresh(address)
        
        assert address.config == config_data
        assert address.allowed_senders == allowed_senders
        
        # 测试JSONB查询
        query = select(EmailAddress).where(
            and_(
                EmailAddress.config['auto_process'].astext == 'true',
                EmailAddress.allowed_senders.contains(["supplier1@company.com"])
            )
        )
        result = await db_session.execute(query)
        found_address = result.scalar_one_or_none()
        
        assert found_address is not None
        assert found_address.id == address.id

    async def test_expires_at_functionality(self, db_session: AsyncSession, test_user: Profile):
        """测试过期时间功能"""
        # 创建未过期的地址
        future_time = datetime.now(timezone.utc) + timedelta(days=30)
        active_address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="active@example.com",
            local_part="active",
            domain="example.com",
            expires_at=future_time
        )
        
        # 创建已过期的地址
        past_time = datetime.now(timezone.utc) - timedelta(days=1)
        expired_address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="expired@example.com",
            local_part="expired",
            domain="example.com",
            expires_at=past_time
        )
        
        db_session.add_all([active_address, expired_address])
        await db_session.commit()
        
        # 查询未过期的地址
        now = datetime.now(timezone.utc)
        query = select(EmailAddress).where(
            and_(
                EmailAddress.user_id == test_user.auth_user_id,
                EmailAddress.expires_at > now
            )
        )
        result = await db_session.execute(query)
        active_addresses = result.scalars().all()
        
        assert len(active_addresses) == 1
        assert active_addresses[0].email_address == "active@example.com"

    async def test_is_active_property(self, db_session: AsyncSession, test_user: Profile):
        """测试is_active属性"""
        # 创建活跃地址（状态为active且未过期）
        active_address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="active@example.com",
            local_part="active",
            domain="example.com",
            status=EmailAddressStatus.ACTIVE.value,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        # 创建非活跃地址（状态为inactive）
        inactive_address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="inactive@example.com",
            local_part="inactive",
            domain="example.com",
            status=EmailAddressStatus.INACTIVE.value
        )
        
        # 创建过期地址
        expired_address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="expired@example.com",
            local_part="expired",
            domain="example.com",
            status=EmailAddressStatus.ACTIVE.value,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        
        db_session.add_all([active_address, inactive_address, expired_address])
        await db_session.commit()
        
        # 刷新对象以获取数据库计算的属性
        await db_session.refresh(active_address)
        await db_session.refresh(inactive_address)
        await db_session.refresh(expired_address)
        
        assert active_address.is_active == True
        assert inactive_address.is_active == False
        assert expired_address.is_active == False

    async def test_display_name_property(self, db_session: AsyncSession, test_user: Profile):
        """测试display_name属性"""
        # 有别名的地址
        address_with_alias = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="test1@example.com",
            local_part="test1",
            domain="example.com",
            alias="我的工作地址"
        )
        
        # 没有别名的地址
        address_without_alias = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="test2@example.com",
            local_part="test2",
            domain="example.com"
        )
        
        db_session.add_all([address_with_alias, address_without_alias])
        await db_session.commit()
        
        assert address_with_alias.display_name == "我的工作地址"
        assert address_without_alias.display_name == "test2@example.com"

    async def test_increment_email_count_method(self, db_session: AsyncSession, test_user: Profile):
        """测试增加邮件计数方法"""
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="counter@example.com",
            local_part="counter",
            domain="example.com"
        )
        
        db_session.add(address)
        await db_session.commit()
        
        initial_count = address.total_emails_received
        initial_last_received = address.last_email_received_at
        
        # 增加计数
        address.increment_email_count()
        await db_session.commit()
        await db_session.refresh(address)
        
        assert address.total_emails_received == initial_count + 1
        assert address.last_email_received_at is not None
        assert address.last_email_received_at != initial_last_received

    async def test_update_config_method(self, db_session: AsyncSession, test_user: Profile):
        """测试更新配置方法"""
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="config-test@example.com",
            local_part="config-test",
            domain="example.com",
            config={"setting1": "value1"}
        )
        
        db_session.add(address)
        await db_session.commit()
        
        # 更新配置
        new_config = {"setting2": "value2", "setting3": "value3"}
        address.update_config(new_config)
        await db_session.commit()
        await db_session.refresh(address)
        
        expected_config = {"setting1": "value1", "setting2": "value2", "setting3": "value3"}
        assert address.config == expected_config

    async def test_soft_delete_method(self, db_session: AsyncSession, test_user: Profile):
        """测试软删除方法"""
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="delete-test@example.com",
            local_part="delete-test",
            domain="example.com"
        )
        
        db_session.add(address)
        await db_session.commit()
        
        assert address.deleted_at is None
        
        # 执行软删除
        address.soft_delete()
        await db_session.commit()
        await db_session.refresh(address)
        
        assert address.deleted_at is not None
        assert isinstance(address.deleted_at, datetime)

    async def test_database_indexes(self, db_session: AsyncSession, test_user: Profile):
        """测试数据库索引"""
        # 创建多个地址以测试索引性能
        addresses = []
        for i in range(100):
            address = EmailAddress(
                user_id=test_user.auth_user_id,
                email_address=f"index-test-{i}@example.com",
                local_part=f"index-test-{i}",
                domain="example.com",
                address_type=EmailAddressType.CUSTOM.value,
                status=EmailAddressStatus.ACTIVE.value
            )
            addresses.append(address)
        
        db_session.add_all(addresses)
        await db_session.commit()
        
        # 测试各种索引查询
        queries = [
            # 用户ID索引
            select(EmailAddress).where(EmailAddress.user_id == test_user.auth_user_id),
            # 邮件地址索引
            select(EmailAddress).where(EmailAddress.email_address == "index-test-50@example.com"),
            # 用户+状态复合索引
            select(EmailAddress).where(
                and_(
                    EmailAddress.user_id == test_user.auth_user_id,
                    EmailAddress.status == EmailAddressStatus.ACTIVE.value
                )
            ),
            # 类型索引
            select(EmailAddress).where(EmailAddress.address_type == EmailAddressType.CUSTOM.value),
            # 域名索引
            select(EmailAddress).where(EmailAddress.domain == "example.com")
        ]
        
        for query in queries:
            result = await db_session.execute(query)
            # 只验证查询能够执行，不抛出异常
            addresses_found = result.scalars().all()
            assert isinstance(addresses_found, list)

    async def test_database_triggers(self, db_session: AsyncSession, test_user: Profile):
        """测试数据库触发器"""
        # 创建地址
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="trigger-test@example.com",
            local_part="trigger-test",
            domain="example.com"
        )
        
        db_session.add(address)
        await db_session.commit()
        
        original_updated_at = address.updated_at
        
        # 等待一秒以确保时间差异
        import asyncio
        await asyncio.sleep(1)
        
        # 更新地址以触发updated_at触发器
        address.alias = "更新后的别名"
        await db_session.commit()
        await db_session.refresh(address)
        
        # 验证updated_at被自动更新
        assert address.updated_at > original_updated_at

    async def test_default_address_constraint(self, db_session: AsyncSession, test_user: Profile):
        """测试默认地址约束（通过触发器实现）"""
        # 创建第一个默认地址
        address1 = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="default1@example.com",
            local_part="default1",
            domain="example.com",
            is_default=True
        )
        
        db_session.add(address1)
        await db_session.commit()
        
        # 创建第二个默认地址
        address2 = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="default2@example.com",
            local_part="default2",
            domain="example.com",
            is_default=True
        )
        
        db_session.add(address2)
        await db_session.commit()
        
        # 刷新第一个地址
        await db_session.refresh(address1)
        
        # 验证只有一个默认地址
        assert address1.is_default == False
        assert address2.is_default == True

    async def test_foreign_key_constraint(self, db_session: AsyncSession):
        """测试外键约束"""
        fake_user_id = uuid4()
        
        # 尝试创建指向不存在用户的地址
        address = EmailAddress(
            user_id=fake_user_id,
            email_address="fk-test@example.com",
            local_part="fk-test",
            domain="example.com"
        )
        
        db_session.add(address)
        
        # 应该因为外键约束失败
        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_concurrent_operations(self, db_session: AsyncSession, test_user: Profile):
        """测试并发操作"""
        import asyncio
        from sqlalchemy.ext.asyncio import async_sessionmaker
        from tests.conftest import test_engine
        
        # 创建多个并发会话
        SessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession)
        
        async def create_address(session_factory, index):
            async with session_factory() as session:
                address = EmailAddress(
                    user_id=test_user.auth_user_id,
                    email_address=f"concurrent-{index}@example.com",
                    local_part=f"concurrent-{index}",
                    domain="example.com"
                )
                session.add(address)
                await session.commit()
                return address.id
        
        # 并发创建多个地址
        tasks = [create_address(SessionLocal, i) for i in range(10)]
        address_ids = await asyncio.gather(*tasks)
        
        # 验证所有地址都被创建
        assert len(address_ids) == 10
        assert len(set(address_ids)) == 10  # 所有ID都不同

    async def test_data_integrity_after_operations(self, db_session: AsyncSession, test_user: Profile):
        """测试操作后的数据完整性"""
        # 创建地址
        address = EmailAddress(
            user_id=test_user.auth_user_id,
            email_address="integrity-test@example.com",
            local_part="integrity-test",
            domain="example.com",
            total_emails_received=0
        )
        
        db_session.add(address)
        await db_session.commit()
        
        # 执行多种操作
        operations = [
            lambda: address.increment_email_count(),
            lambda: address.update_config({"new_setting": "value"}),
            lambda: setattr(address, "alias", "新别名"),
            lambda: setattr(address, "description", "新描述")
        ]
        
        for operation in operations:
            operation()
            await db_session.commit()
            await db_session.refresh(address)
            
            # 验证基础数据完整性
            assert address.id is not None
            assert address.user_id == test_user.auth_user_id
            assert address.email_address == "integrity-test@example.com"
            assert address.created_at is not None
            assert address.updated_at is not None
            assert address.total_emails_received >= 0

    async def test_performance_with_large_dataset(self, db_session: AsyncSession, test_user: Profile):
        """测试大数据集性能"""
        import time
        
        # 创建大量地址
        start_time = time.time()
        
        addresses = []
        for i in range(1000):
            address = EmailAddress(
                user_id=test_user.auth_user_id,
                email_address=f"perf-test-{i}@example.com",
                local_part=f"perf-test-{i}",
                domain="example.com"
            )
            addresses.append(address)
        
        db_session.add_all(addresses)
        await db_session.commit()
        
        creation_time = time.time() - start_time
        
        # 测试查询性能
        start_time = time.time()
        
        query = select(EmailAddress).where(EmailAddress.user_id == test_user.auth_user_id)
        result = await db_session.execute(query)
        found_addresses = result.scalars().all()
        
        query_time = time.time() - start_time
        
        # 验证结果和性能
        assert len(found_addresses) == 1000
        assert creation_time < 10.0  # 创建1000个地址应该在10秒内完成
        assert query_time < 1.0      # 查询应该在1秒内完成