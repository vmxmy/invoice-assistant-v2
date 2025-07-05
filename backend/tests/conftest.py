"""
测试配置文件
包含测试数据库设置、fixtures和测试工具函数
"""

import os
import asyncio
import pytest
import pytest_asyncio
from typing import Generator, AsyncGenerator
from uuid import uuid4, UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import text

from app.core.database import Base, get_async_db
from app.core.config import settings
from app.models.email_address import EmailAddress, EmailAddressType, EmailAddressStatus
from app.models.profile import Profile
from app.main import app


# 测试数据库配置
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

# 创建测试数据库引擎
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    poolclass=StaticPool,
    connect_args={
        "check_same_thread": False,
    },
    echo=False,  # 设为True可以看到SQL日志
)

# 创建测试会话工厂
TestSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    class_=AsyncSession
)


class TestDatabase:
    """测试数据库管理类"""
    
    def __init__(self):
        self.engine = test_engine
        self.session_factory = TestSessionLocal
    
    async def create_tables(self):
        """创建测试表"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def drop_tables(self):
        """删除测试表"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
    
    async def clear_tables(self):
        """清空测试数据"""
        async with self.engine.begin() as conn:
            # 获取所有表名
            tables = [table.name for table in Base.metadata.tables.values()]
            
            # 禁用外键约束检查（SQLite）
            await conn.execute(text("PRAGMA foreign_keys=OFF"))
            
            # 清空所有表
            for table_name in tables:
                await conn.execute(text(f"DELETE FROM {table_name}"))
            
            # 重新启用外键约束检查
            await conn.execute(text("PRAGMA foreign_keys=ON"))
            
            await conn.commit()


# 全局测试数据库实例
test_db = TestDatabase()


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def setup_database():
    """设置测试数据库"""
    await test_db.create_tables()
    yield
    await test_db.drop_tables()


@pytest.fixture
async def db_session(setup_database) -> AsyncGenerator[AsyncSession, None]:
    """创建数据库会话"""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
        
        # 清空数据库以确保测试隔离
        await test_db.clear_tables()


@pytest.fixture
def override_get_db(db_session):
    """覆盖数据库依赖"""
    async def _override_get_db():
        yield db_session
    
    app.dependency_overrides[get_async_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


# 测试数据工厂函数

async def create_test_user(
    db_session: AsyncSession,
    auth_user_id: UUID = None,
    email: str = None,
    name: str = None,
    **kwargs
) -> Profile:
    """创建测试用户"""
    if auth_user_id is None:
        auth_user_id = uuid4()
    
    if email is None:
        email = f"test_{str(auth_user_id)[:8]}@example.com"
    
    if name is None:
        name = f"测试用户_{str(auth_user_id)[:8]}"
    
    user = Profile(
        auth_user_id=auth_user_id,
        email=email,
        full_name=name,
        **kwargs
    )
    
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user


async def create_test_email_address(
    db_session: AsyncSession,
    user_id: UUID,
    address_type: EmailAddressType = EmailAddressType.CUSTOM,
    alias: str = None,
    description: str = None,
    status: EmailAddressStatus = EmailAddressStatus.ACTIVE,
    is_default: bool = False,
    expires_at: datetime = None,
    domain: str = "test.example.com",
    **kwargs
) -> EmailAddress:
    """创建测试邮件地址"""
    
    # 生成本地部分
    type_prefix_map = {
        EmailAddressType.PRIMARY: "main",
        EmailAddressType.WORK: "work", 
        EmailAddressType.PERSONAL: "personal",
        EmailAddressType.TEMPORARY: "temp",
        EmailAddressType.CUSTOM: "custom"
    }
    
    type_prefix = type_prefix_map.get(address_type, "test")
    local_part = f"invoice-{type_prefix}-{str(user_id)}"
    
    # 如果是临时地址，添加随机后缀
    if address_type == EmailAddressType.TEMPORARY:
        import secrets
        import string
        random_suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))
        local_part = f"invoice-{type_prefix}-{random_suffix}-{str(user_id)}"
    
    email_address = f"{local_part}@{domain}"
    
    if alias is None:
        alias = f"{address_type.value}地址"
    
    if description is None:
        description = f"测试{address_type.value}地址"
    
    address = EmailAddress(
        user_id=user_id,
        email_address=email_address,
        local_part=local_part,
        domain=domain,
        address_type=address_type.value,
        alias=alias,
        description=description,
        status=status.value,
        is_default=is_default,
        expires_at=expires_at,
        total_emails_received=0,
        allowed_senders=[],
        config={},
        **kwargs
    )
    
    db_session.add(address)
    await db_session.commit()
    await db_session.refresh(address)
    
    return address


@pytest.fixture
async def test_user_with_addresses(db_session: AsyncSession):
    """创建带有多个邮件地址的测试用户"""
    user = await create_test_user(db_session)
    
    addresses = []
    for i, addr_type in enumerate([EmailAddressType.PRIMARY, EmailAddressType.WORK, EmailAddressType.PERSONAL]):
        is_default = (i == 0)  # 第一个设为默认
        address = await create_test_email_address(
            db_session,
            user_id=user.auth_user_id,
            address_type=addr_type,
            alias=f"{addr_type.value}地址",
            is_default=is_default
        )
        addresses.append(address)
    
    return user, addresses


class MockMailgunService:
    """Mock Mailgun服务用于测试"""
    
    def __init__(self):
        self.routes_created = []
        self.routes_deleted = []
        self.should_fail = False
        self.domain_verified = True
    
    async def ensure_route_exists(self, email_address: str) -> bool:
        if self.should_fail:
            raise Exception("Mock Mailgun error")
        
        self.routes_created.append(email_address)
        return True
    
    async def create_route(self, email_address: str, priority: int = 100) -> bool:
        if self.should_fail:
            return False
        
        self.routes_created.append(email_address)
        return True
    
    async def create_wildcard_route(self) -> bool:
        if self.should_fail:
            return False
        
        self.routes_created.append("wildcard_route")
        return True
    
    async def list_routes(self) -> list:
        return [
            {
                "id": "route_123",
                "expression": "match_recipient('invoice-test@test.example.com')",
                "action": ["forward('https://api.example.com/webhooks/email-received')"]
            }
        ]
    
    async def remove_route(self, email_address: str) -> bool:
        if self.should_fail:
            return False
        
        self.routes_deleted.append(email_address)
        return True
    
    async def verify_domain_setup(self) -> dict:
        if not self.domain_verified:
            return {"configured": False, "error": "Domain not verified"}
        
        return {
            "configured": True,
            "domain": "test.example.com",
            "state": "active",
            "dns_records": [],
            "webhook_url": "https://api.example.com/webhooks/email-received"
        }
    
    async def test_webhook(self, test_email: str) -> dict:
        if self.should_fail:
            return {"success": False, "error": "Mock error"}
        
        return {
            "success": True,
            "message": "测试邮件已发送",
            "response": {"id": "test_message_id"}
        }
    
    async def get_delivery_stats(self, days: int = 7) -> dict:
        return {
            "stats": [
                {
                    "time": "2024-01-01T00:00:00Z",
                    "delivered": {"total": 10},
                    "rejected": {"total": 1},
                    "accepted": {"total": 11}
                }
            ]
        }
    
    def generate_user_email(self, user_id: str, prefix: str = "invoice") -> str:
        return f"{prefix}-{user_id}@test.example.com"
    
    def extract_user_id_from_email(self, email: str) -> str:
        # 简化的提取逻辑
        import re
        pattern = r'invoice-[\\w\\-]*?-([a-f0-9\\-]{36})@'
        match = re.search(pattern, email.lower())
        if match:
            return match.group(1)
        return None


@pytest.fixture
def mock_mailgun_service():
    """Mock Mailgun服务fixture"""
    return MockMailgunService()


# 测试工具函数

def assert_valid_uuid(uuid_string: str) -> bool:
    """验证UUID格式"""
    try:
        UUID(uuid_string)
        return True
    except ValueError:
        return False


def assert_valid_email(email: str) -> bool:
    """验证邮件地址格式"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def assert_timestamp_recent(timestamp_str: str, max_seconds_ago: int = 60) -> bool:
    """验证时间戳是否在最近指定时间内"""
    try:
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        diff = (now - timestamp).total_seconds()
        return 0 <= diff <= max_seconds_ago
    except (ValueError, TypeError):
        return False


class TestEmailFactory:
    """测试邮件数据工厂"""
    
    @staticmethod
    def create_webhook_payload(
        recipient: str,
        sender: str = "supplier@company.com",
        subject: str = "发票通知",
        body_plain: str = "这是一张发票",
        attachments: int = 1
    ) -> dict:
        """创建webhook测试数据"""
        payload = {
            "recipient": recipient,
            "sender": sender,
            "subject": subject,
            "body-plain": body_plain,
            "timestamp": "1640995200",  # 2022-01-01 00:00:00
            "token": "test_token",
            "signature": "test_signature",
            "message-headers": "[[\"Received\", \"test\"]]",
        }
        
        # 添加附件信息
        if attachments > 0:
            for i in range(attachments):
                payload[f"attachment-{i+1}"] = f"invoice_{i+1}.pdf"
        
        return payload
    
    @staticmethod
    def create_email_content() -> dict:
        """创建测试邮件内容"""
        return {
            "subject": "发票通知 - 测试公司",
            "body": "尊敬的客户，请查收附件中的发票。",
            "html_body": "<p>尊敬的客户，请查收附件中的发票。</p>",
            "attachments": [
                {
                    "filename": "invoice_001.pdf",
                    "content_type": "application/pdf",
                    "size": 1024000
                }
            ]
        }


# 性能测试辅助工具

class PerformanceTimer:
    """性能计时器"""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
    
    def start(self):
        import time
        self.start_time = time.time()
    
    def stop(self):
        import time
        self.end_time = time.time()
    
    @property
    def elapsed(self) -> float:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0.0
    
    def assert_faster_than(self, max_seconds: float):
        assert self.elapsed < max_seconds, f"操作耗时 {self.elapsed:.3f}s，超过了 {max_seconds}s 的限制"


@pytest.fixture
def performance_timer():
    """性能计时器fixture"""
    return PerformanceTimer()


# 数据库清理装饰器

def requires_clean_db(func):
    """装饰器：确保测试前数据库是干净的"""
    async def wrapper(*args, **kwargs):
        await test_db.clear_tables()
        return await func(*args, **kwargs)
    return wrapper


# 环境变量设置

def setup_test_env():
    """设置测试环境变量"""
    os.environ.update({
        "TESTING": "true",
        "DATABASE_URL": TEST_DATABASE_URL,
        "MAILGUN_API_KEY": "test-key-123",
        "MAILGUN_DOMAIN": "test.example.com",
        "MAILGUN_WEBHOOK_URL": "https://api.example.com/webhooks/email-received",
        "MAX_EMAIL_ADDRESSES_PER_USER": "10"
    })


# 在导入时设置测试环境
setup_test_env()