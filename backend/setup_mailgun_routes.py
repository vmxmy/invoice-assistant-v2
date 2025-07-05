#!/usr/bin/env python3
"""
Mailgun 路由配置工具

用于配置 Mailgun 邮件路由，将收到的邮件转发到 Webhook 端点。
这是测试真实邮件接收的关键步骤。
"""

import asyncio
import base64
import json
from typing import Dict, List

import httpx
from app.core.config import settings


class MailgunRouteManager:
    """Mailgun 路由管理器"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'mailgun_api_key', None)
        self.domain = getattr(settings, 'mailgun_domain', None)
        self.webhook_url = self._get_webhook_url()
        
        if not self.api_key:
            raise ValueError("MAILGUN_API_KEY 未配置")
        if not self.domain:
            raise ValueError("MAILGUN_DOMAIN 未配置")
        
        # 设置 API 基础 URL
        self.api_base = f"https://api.mailgun.net/v3/{self.domain}"
        
        # 基础认证头
        credentials = base64.b64encode(f"api:{self.api_key}".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
    
    def _get_webhook_url(self) -> str:
        """获取 Webhook URL"""
        # 生产环境应该使用公网可访问的 URL
        # 开发环境可以使用 ngrok 或类似工具
        
        # 检查是否配置了公网 URL
        if hasattr(settings, 'webhook_base_url') and settings.webhook_base_url:
            return f"{settings.webhook_base_url}/api/v1/webhooks/email-received"
        
        # 默认 localhost（仅用于开发测试）
        return "http://localhost:8090/api/v1/webhooks/email-received"
    
    async def list_routes(self) -> List[Dict]:
        """列出现有路由"""
        print("📋 获取现有 Mailgun 路由...")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_base}/routes",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    routes = data.get("items", [])
                    print(f"✅ 找到 {len(routes)} 个路由")
                    return routes
                else:
                    print(f"❌ 获取路由失败: {response.status_code} - {response.text}")
                    return []
                    
        except Exception as e:
            print(f"❌ 请求失败: {e}")
            return []
    
    async def create_invoice_route(self) -> bool:
        """创建发票邮件路由"""
        print("➕ 创建发票邮件路由...")
        
        # 路由表达式：匹配所有以 invoice- 开头的邮件
        expression = f"match_recipient('invoice-.*@{self.domain}')"
        
        # 路由动作：转发到 Webhook
        action = f"forward('{self.webhook_url}')"
        
        # 路由描述
        description = "发票助手 - 发票邮件处理路由"
        
        route_data = {
            "priority": "10",  # 高优先级
            "expression": expression,
            "action": action,
            "description": description
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_base}/routes",
                    headers=self.headers,
                    data=route_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    route_id = data.get("route", {}).get("id")
                    print(f"✅ 路由创建成功")
                    print(f"   路由ID: {route_id}")
                    print(f"   表达式: {expression}")
                    print(f"   动作: {action}")
                    print(f"   Webhook URL: {self.webhook_url}")
                    return True
                else:
                    print(f"❌ 路由创建失败: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 请求失败: {e}")
            return False
    
    async def delete_route(self, route_id: str) -> bool:
        """删除指定路由"""
        print(f"🗑️ 删除路由 {route_id}...")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.api_base}/routes/{route_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    print(f"✅ 路由 {route_id} 删除成功")
                    return True
                else:
                    print(f"❌ 路由删除失败: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 请求失败: {e}")
            return False
    
    async def cleanup_old_routes(self) -> bool:
        """清理旧的发票路由"""
        print("🧹 清理旧的发票路由...")
        
        routes = await self.list_routes()
        invoice_routes = [
            route for route in routes 
            if "invoice-" in route.get("expression", "").lower() or
               "发票助手" in route.get("description", "")
        ]
        
        if not invoice_routes:
            print("✅ 没有找到需要清理的旧路由")
            return True
        
        print(f"发现 {len(invoice_routes)} 个旧的发票路由需要清理")
        
        success_count = 0
        for route in invoice_routes:
            route_id = route.get("id")
            if await self.delete_route(route_id):
                success_count += 1
        
        print(f"✅ 成功清理 {success_count}/{len(invoice_routes)} 个旧路由")
        return success_count == len(invoice_routes)
    
    async def test_webhook_connectivity(self) -> bool:
        """测试 Webhook 连通性"""
        print("🔗 测试 Webhook 连通性...")
        
        try:
            # 测试 Webhook 端点是否可访问
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.webhook_url.replace('/email-received', '/test-webhook')}")
                
                if response.status_code == 200:
                    print(f"✅ Webhook 端点可访问: {self.webhook_url}")
                    return True
                else:
                    print(f"❌ Webhook 端点不可访问: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Webhook 连通性测试失败: {e}")
            print("💡 提示: 如果使用 localhost，确保：")
            print("   1. 后端服务正在运行")
            print("   2. 使用 ngrok 等工具暴露到公网（生产环境必需）")
            return False
    
    async def setup_complete_route(self) -> bool:
        """完整的路由设置流程"""
        print("🚀 开始完整的 Mailgun 路由设置")
        print("=" * 60)
        
        # 步骤1: 测试连通性
        if not await self.test_webhook_connectivity():
            print("⚠️ Webhook 连通性测试失败，继续设置路由但可能无法正常工作")
        
        # 步骤2: 清理旧路由
        await self.cleanup_old_routes()
        
        # 步骤3: 创建新路由
        success = await self.create_invoice_route()
        
        if success:
            print("\n🎉 Mailgun 路由设置完成！")
            print("\n📧 现在可以测试邮件接收：")
            print(f"   发送邮件到: invoice-{'{user_id}'}@{self.domain}")
            print(f"   Webhook URL: {self.webhook_url}")
            print("\n💡 测试建议：")
            print("   1. 使用真实的用户ID替换 {user_id}")
            print("   2. 在邮件中附加PDF发票文件")
            print("   3. 检查后端日志确认邮件接收")
            print("   4. 查看任务队列确认处理状态")
        else:
            print("\n💥 Mailgun 路由设置失败！")
            print("请检查 API 密钥和域名配置。")
        
        return success
    
    def print_configuration_info(self):
        """打印配置信息"""
        print("\n📋 当前配置信息:")
        print(f"   Mailgun API Key: {'*' * 20}...{self.api_key[-4:] if self.api_key else 'None'}")
        print(f"   Mailgun Domain: {self.domain}")
        print(f"   Webhook URL: {self.webhook_url}")
        print(f"   API Base URL: {self.api_base}")


async def main():
    """主函数"""
    print("🎯 Mailgun 路由配置工具")
    print("=" * 50)
    
    try:
        manager = MailgunRouteManager()
        manager.print_configuration_info()
        
        # 运行完整设置
        await manager.setup_complete_route()
        
    except ValueError as e:
        print(f"❌ 配置错误: {e}")
        print("\n💡 请确保在 .env 文件中配置：")
        print("   MAILGUN_API_KEY=your-api-key")
        print("   MAILGUN_DOMAIN=your-domain.mailgun.org")
        print("   WEBHOOK_BASE_URL=https://your-domain.com (生产环境)")
    except Exception as e:
        print(f"❌ 设置失败: {e}")


if __name__ == "__main__":
    asyncio.run(main())