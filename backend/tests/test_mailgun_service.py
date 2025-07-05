"""
Mailgun服务集成测试
测试MailgunService类与Mailgun API的集成
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
import json
import re

from app.services.mailgun_service import MailgunService
from tests.conftest import PerformanceTimer

pytestmark = pytest.mark.asyncio

class TestMailgunService:
    """Mailgun服务测试类"""

    @pytest.fixture
    def mock_http_response(self):
        """创建模拟HTTP响应"""
        def _create_response(status_code: int, json_data: dict = None, text: str = ""):
            response = MagicMock()
            response.status_code = status_code
            response.json.return_value = json_data or {}
            response.text = text
            return response
        return _create_response

    @pytest.fixture
    def mailgun_service(self):
        """创建Mailgun服务实例"""
        # 使用测试配置
        service = MailgunService()
        service.api_key = "test-key-12345"
        service.domain = "test.example.com"
        service.webhook_url = "https://api.example.com/webhooks/email-received"
        service.base_url = f"https://api.mailgun.net/v3/{service.domain}"
        return service

    @pytest.fixture
    def mailgun_service_no_api_key(self):
        """创建没有API密钥的Mailgun服务实例"""
        service = MailgunService()
        service.api_key = None
        return service

    async def test_ensure_route_exists_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试确保路由存在 - 成功场景"""
        test_email = "invoice-test-12345@test.example.com"
        
        # 模拟列出路由的响应（路由不存在）
        list_routes_response = mock_http_response(200, {"items": []})
        
        # 模拟创建路由的响应
        create_route_response = mock_http_response(200, {"message": "Route created"})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = list_routes_response
            mock_client.return_value.__aenter__.return_value.post.return_value = create_route_response
            
            result = await mailgun_service.ensure_route_exists(test_email)
            
            assert result == True

    async def test_ensure_route_exists_already_exists(self, mailgun_service: MailgunService, mock_http_response):
        """测试确保路由存在 - 路由已存在"""
        test_email = "invoice-test-12345@test.example.com"
        
        # 模拟路由已存在的响应
        existing_routes = {
            "items": [
                {
                    "id": "route_123",
                    "expression": f"match_recipient('{re.escape(test_email)}')",
                    "action": ["forward('https://api.example.com/webhooks/email-received')"]
                }
            ]
        }
        list_routes_response = mock_http_response(200, existing_routes)
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = list_routes_response
            
            result = await mailgun_service.ensure_route_exists(test_email)
            
            assert result == True

    async def test_ensure_route_exists_no_api_key(self, mailgun_service_no_api_key: MailgunService):
        """测试确保路由存在 - 没有API密钥"""
        result = await mailgun_service_no_api_key.ensure_route_exists("test@example.com")
        assert result == False

    async def test_create_route_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试创建路由 - 成功"""
        test_email = "invoice-work-12345@test.example.com"
        
        create_response = mock_http_response(200, {
            "message": "Route created",
            "route": {
                "id": "route_456",
                "expression": f"match_recipient('{re.escape(test_email)}')"
            }
        })
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = create_response
            
            result = await mailgun_service.create_route(test_email, priority=50)
            
            assert result == True
            
            # 验证请求参数
            call_args = mock_client.return_value.__aenter__.return_value.post.call_args
            assert call_args[1]["auth"] == ("api", mailgun_service.api_key)
            assert call_args[1]["data"]["priority"] == 50
            assert re.escape(test_email) in call_args[1]["data"]["expression"]

    async def test_create_route_failure(self, mailgun_service: MailgunService, mock_http_response):
        """测试创建路由 - 失败"""
        test_email = "invoice-work-12345@test.example.com"
        
        error_response = mock_http_response(400, {"message": "Invalid expression"})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = error_response
            
            result = await mailgun_service.create_route(test_email)
            
            assert result == False

    async def test_create_wildcard_route_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试创建通配符路由 - 成功"""
        success_response = mock_http_response(200, {
            "message": "Route created",
            "route": {
                "id": "route_wildcard",
                "expression": "match_recipient('invoice-.*@test\\.example\\.com')"
            }
        })
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = success_response
            
            result = await mailgun_service.create_wildcard_route()
            
            assert result == True
            
            # 验证请求参数
            call_args = mock_client.return_value.__aenter__.return_value.post.call_args
            route_data = call_args[1]["data"]
            assert route_data["priority"] == 0  # 最高优先级
            assert "invoice-.*@" in route_data["expression"]
            assert "wildcard" in route_data["description"]

    async def test_list_routes_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试列出路由 - 成功"""
        routes_data = {
            "items": [
                {
                    "id": "route_1",
                    "expression": "match_recipient('test1@test.example.com')",
                    "action": ["forward('https://webhook.example.com')"]
                },
                {
                    "id": "route_2", 
                    "expression": "match_recipient('test2@test.example.com')",
                    "action": ["forward('https://webhook.example.com')"]
                }
            ]
        }
        
        success_response = mock_http_response(200, routes_data)
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = success_response
            
            routes = await mailgun_service.list_routes()
            
            assert len(routes) == 2
            assert routes[0]["id"] == "route_1"
            assert routes[1]["id"] == "route_2"

    async def test_list_routes_empty(self, mailgun_service: MailgunService, mock_http_response):
        """测试列出路由 - 空列表"""
        empty_response = mock_http_response(200, {"items": []})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = empty_response
            
            routes = await mailgun_service.list_routes()
            
            assert routes == []

    async def test_remove_route_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试删除路由 - 成功"""
        test_email = "invoice-temp-12345@test.example.com"
        
        # 模拟列出路由的响应
        routes_data = {
            "items": [
                {
                    "id": "route_to_delete",
                    "expression": f"match_recipient('{re.escape(test_email)}')",
                    "action": ["forward('https://webhook.example.com')"]
                }
            ]
        }
        list_response = mock_http_response(200, routes_data)
        
        # 模拟删除路由的响应
        delete_response = mock_http_response(200, {"message": "Route deleted"})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = list_response
            mock_client.return_value.__aenter__.return_value.delete.return_value = delete_response
            
            result = await mailgun_service.remove_route(test_email)
            
            assert result == True

    async def test_remove_route_not_found(self, mailgun_service: MailgunService, mock_http_response):
        """测试删除路由 - 路由不存在"""
        test_email = "nonexistent@test.example.com"
        
        # 模拟空的路由列表
        empty_response = mock_http_response(200, {"items": []})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = empty_response
            
            result = await mailgun_service.remove_route(test_email)
            
            # 路由不存在也算成功
            assert result == True

    async def test_verify_domain_setup_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试域名验证 - 成功"""
        domain_info = {
            "name": "test.example.com",
            "state": "active"
        }
        
        dns_info = {
            "items": [
                {
                    "record_type": "MX",
                    "name": "test.example.com",
                    "value": "mxa.mailgun.org"
                }
            ]
        }
        
        domain_response = mock_http_response(200, domain_info)
        dns_response = mock_http_response(200, dns_info)
        
        with patch('httpx.AsyncClient') as mock_client:
            # 设置多个响应
            mock_client.return_value.__aenter__.return_value.get.side_effect = [domain_response, dns_response]
            
            result = await mailgun_service.verify_domain_setup()
            
            assert result["configured"] == True
            assert result["domain"] == "test.example.com"
            assert result["state"] == "active"
            assert len(result["dns_records"]) == 1

    async def test_verify_domain_setup_failure(self, mailgun_service: MailgunService, mock_http_response):
        """测试域名验证 - 失败"""
        error_response = mock_http_response(401, {"message": "Unauthorized"})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = error_response
            
            result = await mailgun_service.verify_domain_setup()
            
            assert result["configured"] == False
            assert "域名验证失败" in result["error"]

    async def test_test_webhook_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试Webhook连接 - 成功"""
        test_email = "test@test.example.com"
        
        success_response = mock_http_response(200, {
            "message": "Queued. Thank you.",
            "id": "<test.message.id@test.example.com>"
        })
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = success_response
            
            result = await mailgun_service.test_webhook(test_email)
            
            assert result["success"] == True
            assert "测试邮件已发送" in result["message"]
            assert "test.message.id" in result["response"]["id"]

    async def test_test_webhook_failure(self, mailgun_service: MailgunService, mock_http_response):
        """测试Webhook连接 - 失败"""
        test_email = "test@test.example.com"
        
        error_response = mock_http_response(400, {"message": "Invalid email"})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = error_response
            
            result = await mailgun_service.test_webhook(test_email)
            
            assert result["success"] == False
            assert "发送测试邮件失败" in result["error"]

    async def test_get_delivery_stats_success(self, mailgun_service: MailgunService, mock_http_response):
        """测试获取投递统计 - 成功"""
        stats_data = {
            "stats": [
                {
                    "time": "2024-01-01T00:00:00Z",
                    "delivered": {"total": 100},
                    "bounced": {"total": 5},
                    "dropped": {"total": 2}
                },
                {
                    "time": "2024-01-02T00:00:00Z", 
                    "delivered": {"total": 150},
                    "bounced": {"total": 3},
                    "dropped": {"total": 1}
                }
            ]
        }
        
        success_response = mock_http_response(200, stats_data)
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = success_response
            
            result = await mailgun_service.get_delivery_stats(days=7)
            
            assert "stats" in result
            assert len(result["stats"]) == 2
            assert result["stats"][0]["delivered"]["total"] == 100

    async def test_get_delivery_stats_no_api_key(self, mailgun_service_no_api_key: MailgunService):
        """测试获取投递统计 - 没有API密钥"""
        result = await mailgun_service_no_api_key.get_delivery_stats()
        assert result == {}

    async def test_escape_email_pattern(self, mailgun_service: MailgunService):
        """测试邮件地址特殊字符转义"""
        test_cases = [
            ("simple@example.com", "simple@example\\.com"),
            ("test+tag@example.com", "test\\+tag@example\\.com"),
            ("user.name@sub.example.com", "user\\.name@sub\\.example\\.com")
        ]
        
        for input_email, expected_pattern in test_cases:
            result = mailgun_service._escape_email_pattern(input_email)
            assert result == expected_pattern

    async def test_generate_user_email(self, mailgun_service: MailgunService):
        """测试生成用户邮件地址"""
        user_id = str(uuid4())
        
        # 默认前缀
        email1 = mailgun_service.generate_user_email(user_id)
        assert email1 == f"invoice-{user_id}@test.example.com"
        
        # 自定义前缀
        email2 = mailgun_service.generate_user_email(user_id, prefix="custom")
        assert email2 == f"custom-{user_id}@test.example.com"

    async def test_extract_user_id_from_email(self, mailgun_service: MailgunService):
        """测试从邮件地址提取用户ID"""
        user_id = str(uuid4())
        
        test_cases = [
            f"invoice-{user_id}@test.example.com",  # 简单格式
            f"invoice-work-{user_id}@test.example.com",  # 带类型前缀
            f"invoice-temp-abc123-{user_id}@test.example.com",  # 带随机字符串
            f"invoice-custom-company-{user_id}@test.example.com"  # 带自定义前缀
        ]
        
        for test_email in test_cases:
            extracted_id = mailgun_service.extract_user_id_from_email(test_email)
            assert extracted_id == user_id

    async def test_extract_user_id_from_invalid_email(self, mailgun_service: MailgunService):
        """测试从无效邮件地址提取用户ID"""
        invalid_emails = [
            "regular@test.example.com",  # 不是发票地址
            "invoice@test.example.com",  # 缺少用户ID
            "invoice-invalid-id@test.example.com",  # 无效的UUID
            "not-an-email"  # 不是邮件地址
        ]
        
        for invalid_email in invalid_emails:
            extracted_id = mailgun_service.extract_user_id_from_email(invalid_email)
            assert extracted_id is None

    async def test_http_timeout_handling(self, mailgun_service: MailgunService):
        """测试HTTP超时处理"""
        import asyncio
        
        with patch('httpx.AsyncClient') as mock_client:
            # 模拟超时异常
            mock_client.return_value.__aenter__.return_value.get.side_effect = asyncio.TimeoutError()
            
            result = await mailgun_service.list_routes()
            
            assert result == []

    async def test_http_connection_error_handling(self, mailgun_service: MailgunService):
        """测试HTTP连接错误处理"""
        import httpx
        
        with patch('httpx.AsyncClient') as mock_client:
            # 模拟连接错误
            mock_client.return_value.__aenter__.return_value.get.side_effect = httpx.ConnectError("Connection failed")
            
            result = await mailgun_service.verify_domain_setup()
            
            assert result["configured"] == False
            assert "Connection failed" in result["error"]

    async def test_performance_requirements(self, mailgun_service: MailgunService, mock_http_response, performance_timer: PerformanceTimer):
        """测试性能要求"""
        # 模拟快速响应
        quick_response = mock_http_response(200, {"items": []})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = quick_response
            
            performance_timer.start()
            await mailgun_service.list_routes()
            performance_timer.stop()
            
            # API调用应该在合理时间内完成
            performance_timer.assert_faster_than(1.0)  # 1秒内

    async def test_concurrent_operations(self, mailgun_service: MailgunService, mock_http_response):
        """测试并发操作"""
        import asyncio
        
        success_response = mock_http_response(200, {"message": "Success"})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = success_response
            
            # 并发创建多个路由
            tasks = []
            for i in range(10):
                email = f"test{i}@test.example.com"
                task = mailgun_service.create_route(email)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            # 所有操作都应该成功
            assert all(result == True for result in results)

    async def test_rate_limiting_simulation(self, mailgun_service: MailgunService, mock_http_response):
        """测试频率限制模拟"""
        # 模拟429 Too Many Requests响应
        rate_limit_response = mock_http_response(429, {"message": "Rate limit exceeded"})
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = rate_limit_response
            
            result = await mailgun_service.create_route("test@example.com")
            
            assert result == False

    async def test_large_response_handling(self, mailgun_service: MailgunService, mock_http_response):
        """测试大响应处理"""
        # 创建大量路由数据
        large_routes_data = {
            "items": [
                {
                    "id": f"route_{i}",
                    "expression": f"match_recipient('test{i}@test.example.com')",
                    "action": ["forward('https://webhook.example.com')"]
                }
                for i in range(1000)  # 1000个路由
            ]
        }
        
        large_response = mock_http_response(200, large_routes_data)
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.return_value = large_response
            
            routes = await mailgun_service.list_routes()
            
            assert len(routes) == 1000
            assert routes[0]["id"] == "route_0"
            assert routes[-1]["id"] == "route_999"

    async def test_malformed_json_response(self, mailgun_service: MailgunService):
        """测试格式错误的JSON响应"""
        with patch('httpx.AsyncClient') as mock_client:
            # 模拟JSON解析错误
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
            mock_response.text = "Invalid JSON response"
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await mailgun_service.list_routes()
            
            assert result == []

    async def test_service_configuration_validation(self):
        """测试服务配置验证"""
        # 测试无API密钥的服务
        service_no_key = MailgunService()
        service_no_key.api_key = None
        
        # 大部分操作应该返回失败或空结果
        assert await service_no_key.create_route("test@example.com") == False
        assert await service_no_key.list_routes() == []
        assert await service_no_key.get_delivery_stats() == {}
        
        # 但某些方法仍然可以工作
        email = service_no_key.generate_user_email("test-user-id")
        assert "test-user-id" in email