#!/usr/bin/env python3
"""
发票邮件发送测试工具

用于发送测试邮件到 Mailgun 邮箱，模拟真实的发票邮件接收场景。
"""

import asyncio
import base64
import os
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import httpx
from app.core.config import settings


class TestInvoiceEmailSender:
    """测试发票邮件发送器"""
    
    def __init__(self):
        self.api_key = getattr(settings, 'mailgun_api_key', None)
        self.domain = getattr(settings, 'mailgun_domain', None)
        
        if not self.api_key:
            raise ValueError("MAILGUN_API_KEY 未配置")
        if not self.domain:
            raise ValueError("MAILGUN_DOMAIN 未配置")
        
        # 设置 API 基础 URL
        self.api_base = f"https://api.mailgun.net/v3/{self.domain}"
        
        # 基础认证
        self.auth = ("api", self.api_key)
    
    def create_sample_pdf_content(self) -> bytes:
        """创建示例PDF内容（模拟）"""
        # 这里创建一个简单的PDF内容模拟
        # 实际应用中可以使用 reportlab 或其他PDF库
        pdf_content = f"""
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(发票测试文档) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000230 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
324
%%EOF
""".strip().encode('latin-1')
        
        return pdf_content
    
    def create_invoice_email(self, 
                           recipient: str,
                           invoice_number: str = "INV-2025-001",
                           amount: str = "¥1,234.56") -> dict:
        """创建发票邮件内容"""
        
        # 邮件基本信息
        subject = f"【发票通知】发票 {invoice_number} - 请查收"
        
        # 纯文本内容
        text_content = f"""
尊敬的客户，

您好！

请查收附件中的发票文件。

发票详情：
• 发票号：{invoice_number}
• 金额：{amount}
• 开票日期：2025年1月5日
• 销售方：测试公司有限公司

如有任何疑问，请及时联系我们。

谢谢！

财务部
测试公司有限公司
电话：010-12345678
邮箱：finance@test-company.com
""".strip()
        
        # HTML 内容
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>发票通知</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; color: #333; }}
        .header {{ background-color: #f8f9fa; padding: 20px; border-radius: 5px; }}
        .content {{ margin: 20px 0; }}
        .invoice-details {{ background-color: #e9ecef; padding: 15px; border-radius: 5px; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #666; }}
        ul {{ padding-left: 20px; }}
        li {{ margin: 5px 0; }}
    </style>
</head>
<body>
    <div class="header">
        <h2 style="color: #007bff; margin: 0;">📧 发票通知</h2>
    </div>
    
    <div class="content">
        <p>尊敬的客户，</p>
        <p>您好！请查收附件中的发票文件。</p>
        
        <div class="invoice-details">
            <h3 style="margin-top: 0; color: #495057;">发票详情</h3>
            <ul>
                <li><strong>发票号：</strong>{invoice_number}</li>
                <li><strong>金额：</strong>{amount}</li>
                <li><strong>开票日期：</strong>2025年1月5日</li>
                <li><strong>销售方：</strong>测试公司有限公司</li>
            </ul>
        </div>
        
        <p>如有任何疑问，请及时联系我们。</p>
        <p>谢谢！</p>
    </div>
    
    <div class="footer">
        <hr>
        <p><strong>财务部</strong><br>
        测试公司有限公司<br>
        电话：010-12345678<br>
        邮箱：finance@test-company.com</p>
    </div>
</body>
</html>
""".strip()
        
        return {
            "subject": subject,
            "text": text_content,
            "html": html_content
        }
    
    async def send_invoice_email(self, 
                               recipient: str,
                               invoice_number: str = "INV-2025-001",
                               amount: str = "¥1,234.56") -> bool:
        """发送发票邮件"""
        print(f"📧 发送发票邮件到: {recipient}")
        
        try:
            # 创建邮件内容
            email_content = self.create_invoice_email(recipient, invoice_number, amount)
            
            # 创建PDF附件
            pdf_content = self.create_sample_pdf_content()
            
            # 准备邮件数据
            files = [
                ("attachment", (f"发票_{invoice_number}.pdf", pdf_content, "application/pdf"))
            ]
            
            data = {
                "from": f"财务部 <finance@{self.domain}>",
                "to": recipient,
                "subject": email_content["subject"],
                "text": email_content["text"],
                "html": email_content["html"]
            }
            
            # 发送邮件
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_base}/messages",
                    auth=self.auth,
                    data=data,
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    message_id = result.get("id")
                    print(f"✅ 邮件发送成功")
                    print(f"   消息ID: {message_id}")
                    print(f"   收件人: {recipient}")
                    print(f"   发票号: {invoice_number}")
                    print(f"   金额: {amount}")
                    return True
                else:
                    print(f"❌ 邮件发送失败: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ 发送邮件时出错: {e}")
            return False
    
    async def send_multiple_test_emails(self, user_ids: list) -> dict:
        """发送多个测试邮件"""
        print("📬 批量发送测试发票邮件")
        print("=" * 50)
        
        results = {"success": 0, "failed": 0, "details": []}
        
        for i, user_id in enumerate(user_ids, 1):
            recipient = f"invoice-{user_id}@{self.domain}"
            invoice_number = f"INV-2025-{i:03d}"
            amount = f"¥{1000 + i * 100:.2f}"
            
            print(f"\n📋 发送邮件 {i}/{len(user_ids)}")
            success = await self.send_invoice_email(recipient, invoice_number, amount)
            
            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
            
            results["details"].append({
                "recipient": recipient,
                "invoice_number": invoice_number,
                "amount": amount,
                "success": success
            })
            
            # 添加延迟避免速率限制
            if i < len(user_ids):
                await asyncio.sleep(1)
        
        return results
    
    def print_test_instructions(self):
        """打印测试说明"""
        print("\n💡 测试说明:")
        print("=" * 50)
        print("1. 确保 Mailgun 路由已正确配置")
        print("2. 确保后端服务正在运行")
        print("3. 确保用户ID在数据库中存在")
        print("4. 发送邮件后检查：")
        print("   • 后端日志中的 Webhook 接收记录")
        print("   • 任务队列的处理状态")
        print("   • 数据库中的发票记录")
        print("\n🔍 调试工具:")
        print("   • 查看 Mailgun 控制台的邮件日志")
        print("   • 使用 Webhook 测试工具验证端点")
        print("   • 检查邮件地址格式是否正确")


async def main():
    """主函数"""
    print("🎯 发票邮件发送测试工具")
    print("=" * 50)
    
    try:
        sender = TestInvoiceEmailSender()
        sender.print_test_instructions()
        
        # 测试用户ID列表（替换为真实的用户ID）
        test_user_ids = [
            "550e8400-e29b-41d4-a716-446655440000",  # 示例用户ID
            # 添加更多测试用户ID...
        ]
        
        print(f"\n📧 准备发送 {len(test_user_ids)} 封测试邮件...")
        
        # 确认发送
        confirm = input("是否继续发送测试邮件？(y/N): ").strip().lower()
        if confirm != 'y':
            print("❌ 取消发送")
            return
        
        # 批量发送
        results = await sender.send_multiple_test_emails(test_user_ids)
        
        # 打印结果
        print("\n📊 发送结果:")
        print("=" * 50)
        print(f"✅ 成功: {results['success']} 封")
        print(f"❌ 失败: {results['failed']} 封")
        print(f"📧 总计: {results['success'] + results['failed']} 封")
        
        if results['failed'] > 0:
            print("\n❌ 失败的邮件:")
            for detail in results['details']:
                if not detail['success']:
                    print(f"   • {detail['recipient']} - {detail['invoice_number']}")
        
        print("\n🎉 测试完成！")
        print("请检查后端日志和数据库确认邮件处理结果。")
        
    except ValueError as e:
        print(f"❌ 配置错误: {e}")
        print("\n💡 请确保在 .env 文件中配置：")
        print("   MAILGUN_API_KEY=your-api-key")
        print("   MAILGUN_DOMAIN=your-domain.mailgun.org")
    except Exception as e:
        print(f"❌ 测试失败: {e}")


if __name__ == "__main__":
    asyncio.run(main())