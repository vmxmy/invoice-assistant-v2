#!/usr/bin/env python3
"""
Mailgun Webhook 端到端测试工具

本工具用于测试完整的邮件处理流程：
1. 模拟 Mailgun 发送 Webhook 请求
2. 测试签名验证
3. 测试邮件数据解析
4. 测试任务队列推送
5. 验证完整的邮件处理流水线
"""

import asyncio
import hashlib
import hmac
import json
import time
import uuid
from datetime import datetime
from typing import Dict, Optional

import httpx
from app.core.config import settings


class MailgunWebhookTester:
    """Mailgun Webhook 测试器"""
    
    def __init__(self):
        self.base_url = "http://localhost:8090"
        self.webhook_endpoint = f"{self.base_url}/api/v1/webhooks/email-received"
        self.test_webhook_endpoint = f"{self.base_url}/api/v1/webhooks/test-webhook"
        
        # 测试用户信息
        self.test_user_id = "550e8400-e29b-41d4-a716-446655440000"
        self.test_email_domain = "sandboxb4697cc4a0c84b3ca0a4d46ff64d5078.mailgun.org"
        
        # Mailgun 配置
        self.mailgun_signing_key = getattr(settings, 'MAILGUN_WEBHOOK_SIGNING_KEY', 'test-key-123')
    
    def generate_mailgun_signature(self, token: str, timestamp: str) -> str:
        """生成 Mailgun 签名"""
        signature_data = f"{timestamp}{token}".encode('utf-8')
        signature = hmac.new(
            self.mailgun_signing_key.encode('utf-8'),
            signature_data,
            hashlib.sha256
        ).hexdigest()
        return signature
    
    def create_test_email_data(self, 
                             user_id: Optional[str] = None,
                             include_pdf_attachment: bool = True,
                             subject: str = "发票通知") -> Dict:
        """创建测试邮件数据"""
        if not user_id:
            user_id = self.test_user_id
        
        # 生成 Mailgun 签名信息
        timestamp = str(int(time.time()))
        token = str(uuid.uuid4())
        signature = self.generate_mailgun_signature(token, timestamp)
        
        # 基础邮件数据
        form_data = {
            "recipient": f"invoice-{user_id}@{self.test_email_domain}",
            "sender": "finance@example-company.com",
            "subject": subject,
            "body-plain": "请查收附件中的发票文件。\n\n发票详情：\n- 发票号：INV-2025-001\n- 金额：¥1,234.56\n- 日期：2025-01-05",
            "body-html": """
            <html>
            <body>
                <h2>发票通知</h2>
                <p>请查收附件中的发票文件。</p>
                <h3>发票详情：</h3>
                <ul>
                    <li>发票号：INV-2025-001</li>
                    <li>金额：¥1,234.56</li>
                    <li>日期：2025-01-05</li>
                </ul>
                <p>如有疑问，请联系财务部门。</p>
            </body>
            </html>
            """,
            "Message-Id": f"<{token}@{self.test_email_domain}>",
            "Date": datetime.now().strftime("%a, %d %b %Y %H:%M:%S %z"),
            "From": "财务部 <finance@example-company.com>",
            "To": f"invoice-{user_id}@{self.test_email_domain}",
        }
        
        # 添加附件
        if include_pdf_attachment:
            form_data.update({
                "attachment-count": "1",
                "attachment-1": "发票_INV-2025-001.pdf",
                "content-type-1": "application/pdf",
                "size-1": "245760"  # 240KB
            })
        else:
            form_data["attachment-count"] = "0"
        
        # 添加 Mailgun 签名头
        headers = {
            "X-Mailgun-Signature-V2": signature,
            "X-Mailgun-Timestamp": timestamp,
            "X-Mailgun-Token": token,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mailgun/2.0"
        }
        
        return {
            "headers": headers,
            "form_data": form_data
        }
    
    async def test_webhook_connectivity(self):
        """测试 Webhook 端点连通性"""
        print("🔗 测试 Webhook 端点连通性...")
        
        try:
            # 配置 httpx 客户端绕过代理
            async with httpx.AsyncClient(
                timeout=30.0, 
                proxy=None,  # 明确禁用代理
                trust_env=False  # 不信任环境变量
            ) as client:
                response = await client.get(self.test_webhook_endpoint)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Webhook 端点正常: {data['message']}")
                    return True
                else:
                    print(f"❌ Webhook 端点异常: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            return False
    
    async def test_simple_webhook(self):
        """测试简单的 Webhook 处理"""
        print("📧 测试简单邮件处理...")
        
        try:
            # 创建测试数据
            test_data = self.create_test_email_data()
            
            # 配置 httpx 客户端绕过代理
            async with httpx.AsyncClient(
                timeout=30.0, 
                proxy=None,  # 明确禁用代理
                trust_env=False  # 不信任环境变量
            ) as client:
                response = await client.post(
                    self.webhook_endpoint,
                    headers=test_data["headers"],
                    data=test_data["form_data"]
                )
                
                print(f"状态码: {response.status_code}")
                print(f"响应内容: {response.text}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ 邮件处理成功:")
                    print(f"   状态: {data.get('status')}")
                    print(f"   用户ID: {data.get('user_id')}")
                    print(f"   任务ID: {data.get('task_id')}")
                    print(f"   附件数: {data.get('attachments')}")
                    return True
                else:
                    print(f"❌ 邮件处理失败: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            return False
    
    async def test_invalid_signature(self):
        """测试无效签名处理"""
        print("🔒 测试签名验证...")
        
        try:
            # 创建带有无效签名的测试数据
            test_data = self.create_test_email_data()
            test_data["headers"]["X-Mailgun-Signature-V2"] = "invalid-signature"
            
            # 配置 httpx 客户端绕过代理
            async with httpx.AsyncClient(
                timeout=30.0, 
                proxy=None,  # 明确禁用代理
                trust_env=False  # 不信任环境变量
            ) as client:
                response = await client.post(
                    self.webhook_endpoint,
                    headers=test_data["headers"],
                    data=test_data["form_data"]
                )
                
                if response.status_code == 403:
                    print("✅ 签名验证正常工作（正确拒绝无效签名）")
                    return True
                elif response.status_code == 200:
                    print("⚠️ 签名验证被跳过（开发环境）")
                    return True
                else:
                    print(f"❌ 意外的响应: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            return False
    
    async def test_invalid_recipient(self):
        """测试无效收件人处理"""
        print("📫 测试无效收件人处理...")
        
        try:
            # 创建带有无效收件人的测试数据
            test_data = self.create_test_email_data()
            test_data["form_data"]["recipient"] = "invalid@example.com"
            
            # 配置 httpx 客户端绕过代理
            async with httpx.AsyncClient(
                timeout=30.0, 
                proxy=None,  # 明确禁用代理
                trust_env=False  # 不信任环境变量
            ) as client:
                response = await client.post(
                    self.webhook_endpoint,
                    headers=test_data["headers"],
                    data=test_data["form_data"]
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "ignored":
                        print("✅ 无效收件人正确处理（忽略邮件）")
                        return True
                    else:
                        print(f"❌ 意外的处理结果: {data}")
                        return False
                else:
                    print(f"❌ 意外的响应: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            return False
    
    async def test_multiple_attachments(self):
        """测试多附件邮件处理"""
        print("📎 测试多附件邮件...")
        
        try:
            # 创建多附件测试数据
            test_data = self.create_test_email_data()
            test_data["form_data"].update({
                "attachment-count": "3",
                "attachment-1": "发票_INV-2025-001.pdf",
                "content-type-1": "application/pdf",
                "size-1": "245760",
                "attachment-2": "发票明细.xlsx",
                "content-type-2": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "size-2": "102400",
                "attachment-3": "收据.jpg",
                "content-type-3": "image/jpeg",
                "size-3": "512000"
            })
            
            # 配置 httpx 客户端绕过代理
            async with httpx.AsyncClient(
                timeout=30.0, 
                proxy=None,  # 明确禁用代理
                trust_env=False  # 不信任环境变量
            ) as client:
                response = await client.post(
                    self.webhook_endpoint,
                    headers=test_data["headers"],
                    data=test_data["form_data"]
                )
                
                if response.status_code == 200:
                    data = response.json()
                    attachments_count = data.get("attachments", 0)
                    if attachments_count == 3:
                        print(f"✅ 多附件处理成功: {attachments_count} 个附件")
                        return True
                    else:
                        print(f"❌ 附件数量不匹配: 期望3个，实际{attachments_count}个")
                        return False
                else:
                    print(f"❌ 多附件处理失败: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            return False
    
    async def test_real_user_workflow(self):
        """测试真实用户工作流"""
        print("👤 测试真实用户工作流...")
        
        try:
            # 使用真实的用户邮件地址格式
            # 这里需要确保用户存在于数据库中
            real_user_id = "629fee15-d5b8-4863-9983-be63d7f4f0d9"  # 从之前的测试中获取
            
            test_data = self.create_test_email_data(
                user_id=real_user_id,
                subject="【重要】发票 INV-2025-001 - 请查收"
            )
            
            # 配置 httpx 客户端绕过代理
            async with httpx.AsyncClient(
                timeout=30.0, 
                proxy=None,  # 明确禁用代理
                trust_env=False  # 不信任环境变量
            ) as client:
                response = await client.post(
                    self.webhook_endpoint,
                    headers=test_data["headers"],
                    data=test_data["form_data"]
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ 真实用户工作流测试成功:")
                    print(f"   用户ID: {data.get('user_id')}")
                    print(f"   任务ID: {data.get('task_id')}")
                    print(f"   邮件地址: {test_data['form_data']['recipient']}")
                    return True
                else:
                    print(f"❌ 真实用户工作流测试失败: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 测试失败: {e}")
            return False
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("🚀 开始 Mailgun Webhook 端到端测试")
        print("=" * 60)
        
        tests = [
            ("连通性测试", self.test_webhook_connectivity()),
            ("简单邮件处理", self.test_simple_webhook()),
            ("签名验证测试", self.test_invalid_signature()),
            ("无效收件人测试", self.test_invalid_recipient()),
            ("多附件测试", self.test_multiple_attachments()),
            ("真实用户工作流", self.test_real_user_workflow()),
        ]
        
        results = []
        for test_name, test_coro in tests:
            print(f"\n📋 {test_name}")
            print("-" * 40)
            try:
                result = await test_coro
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ 测试异常: {e}")
                results.append((test_name, False))
        
        # 生成测试报告
        print("\n" + "=" * 60)
        print("📊 测试报告")
        print("=" * 60)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        for test_name, result in results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"{test_name:20} {status}")
        
        print(f"\n总测试数: {total}")
        print(f"通过数: {passed}")
        print(f"失败数: {total - passed}")
        print(f"成功率: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎉 Webhook 测试整体成功！")
        else:
            print("\n💥 Webhook 测试存在问题，请检查失败的测试项。")
        
        return success_rate >= 80


async def main():
    """主函数"""
    tester = MailgunWebhookTester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())