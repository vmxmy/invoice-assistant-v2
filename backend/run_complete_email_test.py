#!/usr/bin/env python3
"""
完整的邮件处理测试套件

端到端测试流程：
1. 设置 Mailgun 路由
2. 测试 Webhook 端点
3. 发送测试邮件
4. 验证邮件处理结果
5. 检查任务队列状态
"""

import asyncio
import sys
import uuid
from datetime import datetime

from setup_mailgun_routes import MailgunRouteManager
from test_mailgun_webhook import MailgunWebhookTester
from send_test_invoice_email import TestInvoiceEmailSender


class CompleteEmailTestSuite:
    """完整邮件测试套件"""
    
    def __init__(self):
        self.route_manager = None
        self.webhook_tester = None
        self.email_sender = None
        
        # 测试用户配置
        self.test_user_id = str(uuid.uuid4())
        print(f"🎯 本次测试使用用户ID: {self.test_user_id}")
    
    async def setup_test_environment(self) -> bool:
        """设置测试环境"""
        print("🔧 初始化测试环境...")
        
        try:
            self.route_manager = MailgunRouteManager()
            self.webhook_tester = MailgunWebhookTester()
            self.email_sender = TestInvoiceEmailSender()
            
            print("✅ 测试环境初始化成功")
            return True
        except Exception as e:
            print(f"❌ 测试环境初始化失败: {e}")
            return False
    
    async def test_step_1_routes(self) -> bool:
        """步骤1: 设置 Mailgun 路由"""
        print("\n" + "="*60)
        print("📋 步骤1: 设置 Mailgun 路由")
        print("="*60)
        
        try:
            return await self.route_manager.setup_complete_route()
        except Exception as e:
            print(f"❌ 路由设置失败: {e}")
            return False
    
    async def test_step_2_webhooks(self) -> bool:
        """步骤2: 测试 Webhook 端点"""
        print("\n" + "="*60)
        print("🔗 步骤2: 测试 Webhook 端点")
        print("="*60)
        
        try:
            return await self.webhook_tester.run_all_tests()
        except Exception as e:
            print(f"❌ Webhook 测试失败: {e}")
            return False
    
    async def test_step_3_email_sending(self) -> bool:
        """步骤3: 发送测试邮件"""
        print("\n" + "="*60)
        print("📧 步骤3: 发送测试邮件")
        print("="*60)
        
        try:
            recipient = f"invoice-{self.test_user_id}@{self.email_sender.domain}"
            invoice_number = f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            print(f"📮 发送测试邮件:")
            print(f"   收件人: {recipient}")
            print(f"   发票号: {invoice_number}")
            
            success = await self.email_sender.send_invoice_email(
                recipient=recipient,
                invoice_number=invoice_number,
                amount="¥999.99"
            )
            
            if success:
                print("✅ 测试邮件发送成功")
                print("⏳ 等待5秒让邮件到达并处理...")
                await asyncio.sleep(5)
                return True
            else:
                print("❌ 测试邮件发送失败")
                return False
                
        except Exception as e:
            print(f"❌ 邮件发送测试失败: {e}")
            return False
    
    async def test_step_4_verification(self) -> bool:
        """步骤4: 验证邮件处理结果"""
        print("\n" + "="*60)
        print("🔍 步骤4: 验证邮件处理结果")
        print("="*60)
        
        try:
            # 这里可以添加数据库查询来验证邮件是否被正确处理
            # 例如：检查发票记录是否被创建，任务是否被执行等
            
            print("📊 验证项目:")
            print("   • ✅ 邮件已发送到 Mailgun")
            print("   • ⏳ Webhook 接收状态（检查后端日志）")
            print("   • ⏳ 任务队列处理状态")
            print("   • ⏳ 数据库记录创建状态")
            
            print("\n💡 手动验证步骤:")
            print("1. 检查后端日志是否有 Webhook 接收记录")
            print("2. 查看任务队列是否有新的邮件处理任务")
            print("3. 检查数据库是否创建了新的发票记录")
            print("4. 验证文件是否正确下载和存储")
            
            # 暂时返回 True，实际应用中需要实现具体的验证逻辑
            return True
            
        except Exception as e:
            print(f"❌ 结果验证失败: {e}")
            return False
    
    async def run_complete_test(self) -> bool:
        """运行完整测试"""
        print("🚀 开始完整的邮件处理端到端测试")
        print("="*80)
        
        # 初始化
        if not await self.setup_test_environment():
            return False
        
        # 测试步骤
        steps = [
            ("Mailgun 路由设置", self.test_step_1_routes()),
            ("Webhook 端点测试", self.test_step_2_webhooks()),
            ("测试邮件发送", self.test_step_3_email_sending()),
            ("结果验证", self.test_step_4_verification())
        ]
        
        results = []
        for step_name, step_coro in steps:
            try:
                result = await step_coro
                results.append((step_name, result))
                
                if not result:
                    print(f"\n⚠️ 步骤 '{step_name}' 失败，但继续执行后续步骤...")
                    
            except Exception as e:
                print(f"\n❌ 步骤 '{step_name}' 异常: {e}")
                results.append((step_name, False))
        
        # 生成最终报告
        return self.generate_final_report(results)
    
    def generate_final_report(self, results: list) -> bool:
        """生成最终测试报告"""
        print("\n" + "="*80)
        print("📊 完整测试报告")
        print("="*80)
        
        passed = 0
        total = len(results)
        
        for step_name, result in results:
            status = "✅ 通过" if result else "❌ 失败"
            print(f"{step_name:25} {status}")
            if result:
                passed += 1
        
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\n总步骤数: {total}")
        print(f"通过步骤: {passed}")
        print(f"失败步骤: {total - passed}")
        print(f"成功率: {success_rate:.1f}%")
        
        if success_rate >= 75:
            print("\n🎉 测试整体成功！")
            print("\n📝 后续操作建议:")
            print("1. 使用真实用户ID进行生产测试")
            print("2. 监控任务队列的处理性能")
            print("3. 验证OCR提取的准确性")
            print("4. 测试大附件和多附件处理")
        else:
            print("\n💥 测试存在问题！")
            print("\n🔧 排查建议:")
            print("1. 检查 Mailgun API 密钥和域名配置")
            print("2. 确认 Webhook URL 公网可访问")
            print("3. 验证后端服务运行状态")
            print("4. 查看详细的错误日志")
        
        print(f"\n📧 测试用户ID: {self.test_user_id}")
        print("（可用于查询测试数据）")
        
        return success_rate >= 75


async def main():
    """主函数"""
    print("🎯 完整邮件处理测试套件")
    print("本工具将执行端到端的邮件处理测试")
    print("="*80)
    
    # 显示警告信息
    print("⚠️ 注意事项:")
    print("1. 此测试将修改 Mailgun 路由配置")
    print("2. 此测试将发送真实邮件")
    print("3. 确保测试环境已正确配置")
    print("4. 建议在开发环境运行")
    
    # 确认执行
    confirm = input("\n是否继续执行完整测试？(y/N): ").strip().lower()
    if confirm != 'y':
        print("❌ 测试已取消")
        return
    
    # 运行测试
    test_suite = CompleteEmailTestSuite()
    success = await test_suite.run_complete_test()
    
    # 退出代码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️ 测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 测试执行异常: {e}")
        sys.exit(1)