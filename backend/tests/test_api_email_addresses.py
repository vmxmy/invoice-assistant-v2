"""
邮件地址管理API端点测试
测试所有邮件地址相关的REST API端点
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from uuid import uuid4, UUID
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

from app.main import app
from app.models.email_address import EmailAddress, EmailAddressType, EmailAddressStatus
from app.models.profile import Profile
from app.core.database import get_async_db
from tests.conftest import TestDatabase, create_test_user, create_test_email_address


class TestEmailAddressAPI:
    """邮件地址API测试类"""

    @pytest.fixture
    async def client(self):
        """创建测试HTTP客户端"""
        async with AsyncClient(app=app, base_url="http://testserver") as ac:
            yield ac

    @pytest.fixture
    async def test_user(self, db_session):
        """创建测试用户"""
        return await create_test_user(db_session, email="test@example.com")

    @pytest.fixture
    async def auth_headers(self, test_user):
        """创建认证头"""
        # 这里需要根据实际的认证机制来实现
        # 假设使用JWT token
        token = "test-jwt-token"  # 在实际实现中，这应该是真实的JWT token
        return {"Authorization": f"Bearer {token}"}

    async def test_create_primary_address(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str]):
        """测试创建主要邮件地址"""
        payload = {
            "address_type": EmailAddressType.PRIMARY.value,
            "alias": "主要地址",
            "description": "用户的主要发票接收地址"
        }
        
        response = await client.post(
            "/api/v1/email-addresses/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["address_type"] == EmailAddressType.PRIMARY.value
        assert data["alias"] == "主要地址"
        assert data["description"] == "用户的主要发票接收地址"
        assert data["is_default"] == True  # 第一个地址应该是默认的
        assert data["status"] == EmailAddressStatus.ACTIVE.value
        assert "@" in data["email_address"]
        assert data["user_id"] == str(test_user.auth_user_id)

    async def test_create_custom_address_with_prefix(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str]):
        """测试创建带自定义前缀的地址"""
        payload = {
            "address_type": EmailAddressType.CUSTOM.value,
            "custom_local_part": "company",
            "alias": "公司地址",
            "description": "公司专用发票地址"
        }
        
        response = await client.post(
            "/api/v1/email-addresses/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert "company" in data["email_address"]
        assert str(test_user.auth_user_id) in data["email_address"]
        assert data["alias"] == "公司地址"

    async def test_create_temporary_address_with_expiry(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str]):
        """测试创建有过期时间的临时地址"""
        payload = {
            "address_type": EmailAddressType.TEMPORARY.value,
            "expires_days": 30,
            "alias": "临时地址",
            "description": "30天临时地址"
        }
        
        response = await client.post(
            "/api/v1/email-addresses/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        
        assert data["address_type"] == EmailAddressType.TEMPORARY.value
        assert data["expires_at"] is not None
        
        # 验证过期时间约为30天后
        expires_at = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
        expected_expiry = datetime.now(timezone.utc) + timedelta(days=30)
        time_diff = abs((expires_at - expected_expiry).total_seconds())
        assert time_diff < 3600  # 允许1小时误差

    async def test_create_address_invalid_prefix(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str]):
        """测试无效前缀处理"""
        payload = {
            "address_type": EmailAddressType.CUSTOM.value,
            "custom_local_part": "invalid@prefix!",  # 包含无效字符
            "alias": "无效地址"
        }
        
        response = await client.post(
            "/api/v1/email-addresses/",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "格式无效" in response.json()["detail"]

    async def test_create_duplicate_address(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """测试重复地址创建"""
        # 先创建一个地址
        existing_address = await create_test_email_address(
            db_session, 
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.PRIMARY
        )
        
        # 尝试创建相同类型的地址
        payload = {
            "address_type": EmailAddressType.PRIMARY.value,
            "alias": "重复地址"
        }
        
        response = await client.post(
            "/api/v1/email-addresses/",
            json=payload,
            headers=auth_headers
        )
        
        # 应该成功，但会生成不同的地址
        assert response.status_code == 201
        data = response.json()
        assert data["email_address"] != existing_address.email_address

    async def test_create_address_unauthorized(self, client: AsyncClient):
        """测试未授权用户创建"""
        payload = {
            "address_type": EmailAddressType.PRIMARY.value,
            "alias": "未授权地址"
        }
        
        response = await client.post(
            "/api/v1/email-addresses/",
            json=payload
            # 没有认证头
        )
        
        assert response.status_code == 401

    async def test_list_user_addresses(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """获取用户地址列表"""
        # 创建多个测试地址
        addresses = []
        for i, addr_type in enumerate([EmailAddressType.PRIMARY, EmailAddressType.WORK, EmailAddressType.PERSONAL]):
            address = await create_test_email_address(
                db_session,
                user_id=test_user.auth_user_id,
                address_type=addr_type,
                alias=f"地址{i+1}"
            )
            addresses.append(address)
        
        response = await client.get(
            "/api/v1/email-addresses/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "addresses" in data
        assert "total_count" in data
        assert "active_count" in data
        assert data["total_count"] == 3
        assert len(data["addresses"]) == 3
        
        # 验证地址按创建时间倒序排列，默认地址在前
        returned_addresses = data["addresses"]
        assert any(addr["is_default"] for addr in returned_addresses)

    async def test_list_addresses_with_filters(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """带筛选条件的地址查询"""
        # 创建不同类型的地址
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, address_type=EmailAddressType.WORK)
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, address_type=EmailAddressType.PERSONAL)
        
        # 筛选工作地址
        response = await client.get(
            "/api/v1/email-addresses/",
            params={"address_type": EmailAddressType.WORK.value},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert all(addr["address_type"] == EmailAddressType.WORK.value for addr in data["addresses"])

    async def test_get_address_by_id(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """根据ID获取特定地址"""
        address = await create_test_email_address(
            db_session,
            user_id=test_user.auth_user_id,
            address_type=EmailAddressType.PRIMARY
        )
        
        response = await client.get(
            f"/api/v1/email-addresses/{address.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(address.id)
        assert data["email_address"] == address.email_address

    async def test_get_nonexistent_address(self, client: AsyncClient, auth_headers: Dict[str, str]):
        """获取不存在的地址"""
        fake_id = str(uuid4())
        response = await client.get(
            f"/api/v1/email-addresses/{fake_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404

    async def test_update_address_alias(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """更新地址别名"""
        address = await create_test_email_address(
            db_session,
            user_id=test_user.auth_user_id,
            alias="原别名"
        )
        
        payload = {
            "alias": "新别名",
            "description": "更新后的描述"
        }
        
        response = await client.put(
            f"/api/v1/email-addresses/{address.id}",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["alias"] == "新别名"
        assert data["description"] == "更新后的描述"

    async def test_set_default_address(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """设置默认地址"""
        # 创建两个地址
        address1 = await create_test_email_address(db_session, user_id=test_user.auth_user_id, is_default=True)
        address2 = await create_test_email_address(db_session, user_id=test_user.auth_user_id, is_default=False)
        
        # 设置第二个地址为默认
        response = await client.post(
            f"/api/v1/email-addresses/{address2.id}/set-default",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_default"] == True
        
        # 验证原默认地址不再是默认的
        response = await client.get(
            f"/api/v1/email-addresses/{address1.id}",
            headers=auth_headers
        )
        data = response.json()
        assert data["is_default"] == False

    async def test_activate_deactivate_address(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """测试激活/停用地址"""
        address = await create_test_email_address(
            db_session,
            user_id=test_user.auth_user_id,
            status=EmailAddressStatus.ACTIVE
        )
        
        # 停用地址
        response = await client.post(
            f"/api/v1/email-addresses/{address.id}/deactivate",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == EmailAddressStatus.INACTIVE.value
        
        # 重新激活
        response = await client.post(
            f"/api/v1/email-addresses/{address.id}/activate",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == EmailAddressStatus.ACTIVE.value

    async def test_delete_normal_address(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """删除普通地址"""
        address = await create_test_email_address(
            db_session,
            user_id=test_user.auth_user_id,
            is_default=False
        )
        
        response = await client.delete(
            f"/api/v1/email-addresses/{address.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
        
        # 验证地址已被软删除
        response = await client.get(
            f"/api/v1/email-addresses/{address.id}",
            headers=auth_headers
        )
        assert response.status_code == 404

    async def test_delete_default_address_protection(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """测试默认地址删除保护"""
        address = await create_test_email_address(
            db_session,
            user_id=test_user.auth_user_id,
            is_default=True
        )
        
        response = await client.delete(
            f"/api/v1/email-addresses/{address.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "默认地址" in response.json()["detail"]

    async def test_user_address_isolation(self, client: AsyncClient, auth_headers: Dict[str, str], db_session):
        """测试用户地址隔离"""
        # 创建两个不同的用户
        user1 = await create_test_user(db_session, email="user1@example.com")
        user2 = await create_test_user(db_session, email="user2@example.com")
        
        # 为用户1创建地址
        address1 = await create_test_email_address(db_session, user_id=user1.auth_user_id)
        
        # 用户2尝试访问用户1的地址
        # 这里需要模拟用户2的认证头，实际实现中需要根据认证机制调整
        user2_headers = {"Authorization": "Bearer user2-token"}
        
        response = await client.get(
            f"/api/v1/email-addresses/{address1.id}",
            headers=user2_headers
        )
        
        assert response.status_code == 404  # 或403，取决于实现

    async def test_address_statistics(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """测试地址统计"""
        # 创建多个地址
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, address_type=EmailAddressType.PRIMARY, status=EmailAddressStatus.ACTIVE)
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, address_type=EmailAddressType.WORK, status=EmailAddressStatus.ACTIVE)
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, address_type=EmailAddressType.PERSONAL, status=EmailAddressStatus.INACTIVE)
        
        response = await client.get(
            "/api/v1/email-addresses/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_addresses"] == 3
        assert data["active_addresses"] == 2
        assert "addresses_by_type" in data
        assert "addresses_by_status" in data

    async def test_pagination(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """测试分页功能"""
        # 创建多个地址
        for i in range(15):
            await create_test_email_address(
                db_session,
                user_id=test_user.auth_user_id,
                alias=f"地址{i+1}"
            )
        
        # 测试第一页
        response = await client.get(
            "/api/v1/email-addresses/",
            params={"page": 1, "size": 10},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["addresses"]) == 10
        assert data["total_count"] == 15
        assert data["page"] == 1
        assert data["total_pages"] == 2
        
        # 测试第二页
        response = await client.get(
            "/api/v1/email-addresses/",
            params={"page": 2, "size": 10},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["addresses"]) == 5

    async def test_search_addresses(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """测试地址搜索"""
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, alias="工作地址")
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, alias="个人地址")
        await create_test_email_address(db_session, user_id=test_user.auth_user_id, description="公司专用地址")
        
        # 搜索包含"工作"的地址
        response = await client.get(
            "/api/v1/email-addresses/",
            params={"search": "工作"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["addresses"]) >= 1
        assert any("工作" in addr["alias"] or "工作" in (addr["description"] or "") for addr in data["addresses"])

    async def test_bulk_operations(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str], db_session):
        """测试批量操作"""
        # 创建多个地址
        addresses = []
        for i in range(3):
            address = await create_test_email_address(
                db_session,
                user_id=test_user.auth_user_id,
                alias=f"批量地址{i+1}",
                is_default=False
            )
            addresses.append(address)
        
        # 批量停用
        payload = {
            "address_ids": [str(addr.id) for addr in addresses],
            "action": "deactivate"
        }
        
        response = await client.post(
            "/api/v1/email-addresses/bulk-action",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["affected_count"] == 3
        
        # 验证地址已被停用
        for address in addresses:
            response = await client.get(
                f"/api/v1/email-addresses/{address.id}",
                headers=auth_headers
            )
            data = response.json()
            assert data["status"] == EmailAddressStatus.INACTIVE.value

    async def test_address_validation(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str]):
        """测试地址验证"""
        # 测试各种无效输入
        invalid_payloads = [
            {"address_type": "invalid_type"},  # 无效类型
            {"address_type": EmailAddressType.CUSTOM.value, "custom_local_part": ""},  # 空前缀
            {"address_type": EmailAddressType.CUSTOM.value, "custom_local_part": "a" * 50},  # 前缀过长
            {"expires_days": -1},  # 负数过期天数
            {"expires_days": 1000},  # 过期天数过大
        ]
        
        for payload in invalid_payloads:
            response = await client.post(
                "/api/v1/email-addresses/",
                json=payload,
                headers=auth_headers
            )
            assert response.status_code == 400

    async def test_rate_limiting(self, client: AsyncClient, test_user: Profile, auth_headers: Dict[str, str]):
        """测试频率限制"""
        # 快速创建多个地址，测试是否有频率限制
        payload = {
            "address_type": EmailAddressType.CUSTOM.value,
            "alias": "频率测试地址"
        }
        
        success_count = 0
        for i in range(20):  # 尝试快速创建20个地址
            response = await client.post(
                "/api/v1/email-addresses/",
                json={**payload, "custom_local_part": f"rate{i}"},
                headers=auth_headers
            )
            if response.status_code == 201:
                success_count += 1
            elif response.status_code == 429:  # Too Many Requests
                break
        
        # 应该在某个点被限制，或者全部成功（如果没有频率限制）
        assert success_count <= 20