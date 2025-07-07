#!/usr/bin/env python3
"""
测试邮件到发票的完整处理流程
模拟邮件接收、PDF下载、OCR识别、数据存储
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from uuid import UUID

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.email_processor import EmailProcessor
from app.models.invoice import Invoice
from app.core.database import AsyncSessionLocal
from sqlalchemy import select
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def test_email_processing():
    """测试邮件处理完整流程"""
    print("\n=== 测试邮件到发票处理流程 ===")
    
    # 测试用户ID
    test_user_id = "550e8400-e29b-41d4-a716-446655440000"
    
    # 构造测试邮件数据
    test_email_data = {
        "user_id": test_user_id,
        "recipient": f"invoice-{test_user_id}@test.mailgun.org",
        "sender": "财务部 <finance@example-company.com>",
        "subject": "发票号：INV2024010001 - 1月份服务费发票",
        "body_plain": """
您好，

附件是贵公司1月份的服务费发票，请查收。

发票信息：
- 发票号：INV2024010001
- 金额：¥10,000.00
- 开票日期：2024-01-15

如有问题请联系我们。

谢谢！
财务部
        """,
        "body_html": """
<html>
<body>
<p>您好，</p>
<p>附件是贵公司1月份的服务费发票，请查收。</p>
<p>发票信息：</p>
<ul>
<li>发票号：INV2024010001</li>
<li>金额：¥10,000.00</li>
<li>开票日期：2024-01-15</li>
</ul>
<p>如有问题请联系我们。</p>
<p>谢谢！<br>财务部</p>
<p><a href="https://example.com/invoices/backup_invoice.pdf">备份发票链接</a></p>
</body>
</html>
        """,
        "timestamp": int(datetime.utcnow().timestamp()),
        "message_id": f"test-{datetime.utcnow().timestamp()}@example.com",
        "attachments": [
            {
                "name": "服务费发票-202401.pdf",
                "url": "https://example.com/test-invoice.pdf",  # 这里应该是真实的PDF URL
                "content_type": "application/pdf",
                "size": "156789"
            }
        ]
    }
    
    try:
        # 创建邮件处理器
        # 注意：这里使用真实的数据库URL
        from app.core.config import settings
        db_url = settings.database_url
        
        email_processor = EmailProcessor(db_url)
        
        print(f"\n处理测试邮件:")
        print(f"- 用户ID: {test_user_id}")
        print(f"- 发件人: {test_email_data['sender']}")
        print(f"- 主题: {test_email_data['subject']}")
        print(f"- 附件数: {len(test_email_data['attachments'])}")
        
        # 处理邮件
        result = await email_processor.process_email(test_email_data)
        
        print(f"\n处理结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        # 查询处理后的发票
        if result['status'] == 'completed' and result['processed_files'] > 0:
            async with AsyncSessionLocal() as db:
                # 查询最新创建的发票
                query = select(Invoice).where(
                    Invoice.user_id == UUID(test_user_id)
                ).order_by(Invoice.created_at.desc()).limit(5)
                
                result = await db.execute(query)
                invoices = result.scalars().all()
                
                print(f"\n最近创建的发票:")
                for invoice in invoices:
                    print(f"\n发票详情:")
                    print(f"- ID: {invoice.id}")
                    print(f"- 发票号: {invoice.invoice_number}")
                    print(f"- 状态: {invoice.status}")
                    print(f"- 处理状态: {invoice.processing_status}")
                    print(f"- 卖方: {invoice.seller_name}")
                    print(f"- 金额: ¥{invoice.total_amount}")
                    print(f"- 日期: {invoice.invoice_date}")
                    print(f"- 来源: {invoice.source}")
                    print(f"- 文件路径: {invoice.file_path}")
                    
                    if invoice.extracted_data:
                        print(f"- OCR提取数据:")
                        print(json.dumps(invoice.extracted_data, indent=4, ensure_ascii=False))
        
        # 关闭连接
        await email_processor.close()
        
        print("\n✅ 邮件处理测试完成")
        
    except Exception as e:
        print(f"\n❌ 邮件处理测试失败: {e}")
        import traceback
        traceback.print_exc()


async def test_email_with_multiple_attachments():
    """测试包含多个附件的邮件"""
    print("\n\n=== 测试多附件邮件处理 ===")
    
    test_user_id = "550e8400-e29b-41d4-a716-446655440000"
    
    # 构造包含多个PDF的邮件
    test_email_data = {
        "user_id": test_user_id,
        "recipient": f"invoice-{test_user_id}@test.mailgun.org",
        "sender": "bulk-invoices@supplier.com",
        "subject": "批量发票 - 2024年1月",
        "body_plain": "请查收本月所有发票。",
        "timestamp": int(datetime.utcnow().timestamp()),
        "message_id": f"bulk-{datetime.utcnow().timestamp()}@example.com",
        "attachments": [
            {
                "name": "发票1-设备采购.pdf",
                "url": "https://example.com/invoice1.pdf",
                "content_type": "application/pdf",
                "size": "234567"
            },
            {
                "name": "发票2-服务费.pdf",
                "url": "https://example.com/invoice2.pdf",
                "content_type": "application/pdf",
                "size": "345678"
            },
            {
                "name": "发票清单.xlsx",  # 非PDF文件，应该被忽略
                "url": "https://example.com/list.xlsx",
                "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "size": "45678"
            }
        ]
    }
    
    try:
        from app.core.config import settings
        email_processor = EmailProcessor(settings.database_url)
        
        print(f"处理包含 {len(test_email_data['attachments'])} 个附件的邮件...")
        result = await email_processor.process_email(test_email_data)
        
        print(f"\n处理结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        await email_processor.close()
        
    except Exception as e:
        print(f"\n❌ 多附件邮件测试失败: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """主测试函数"""
    print("开始测试邮件到发票处理系统...\n")
    
    # 测试基本邮件处理
    await test_email_processing()
    
    # 测试多附件邮件
    await test_email_with_multiple_attachments()
    
    print("\n\n=== 所有测试完成 ===")


if __name__ == "__main__":
    asyncio.run(main())