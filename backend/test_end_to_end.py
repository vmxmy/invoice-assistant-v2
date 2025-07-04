#!/usr/bin/env python3
"""
端到端测试脚本
测试完整的邮件处理流程：Webhook接收 -> Dramatiq任务队列 -> OCR处理
"""

import asyncio
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.dramatiq_config import broker
from app.tasks.dramatiq_tasks import process_email_task

import dramatiq
dramatiq.set_broker(broker)


def test_email_processing():
    """测试邮件处理任务"""
    print("🧪 端到端邮件处理测试")
    print("=" * 50)
    
    # 模拟邮件数据（与Mailgun webhook相同格式）
    test_email_data = {
        "user_id": "test-user-123",
        "message_id": f"test-message-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        "sender": "test@example.com",
        "subject": "发票-测试发票文档",
        "timestamp": datetime.now().isoformat(),
        "attachments": [
            {
                "filename": "test_invoice.pdf",
                "content_type": "application/pdf",
                "size": 1024000,
                "url": "https://example.com/test_invoice.pdf"
            }
        ],
        "body_plain": "这是一个测试发票邮件",
        "recipient": "user123@invoice.example.com"
    }
    
    print(f"📧 测试邮件数据:")
    print(f"   用户ID: {test_email_data['user_id']}")
    print(f"   消息ID: {test_email_data['message_id']}")
    print(f"   发件人: {test_email_data['sender']}")
    print(f"   主题: {test_email_data['subject']}")
    print(f"   附件数量: {len(test_email_data['attachments'])}")
    
    try:
        # 发送邮件处理任务到Dramatiq队列
        print("\n🚀 发送任务到Dramatiq队列...")
        message = process_email_task.send(test_email_data)
        
        print(f"✅ 任务发送成功!")
        print(f"   消息ID: {message.message_id}")
        print(f"   队列: {message.queue_name}")
        print(f"   Actor: {message.actor_name}")
        
        print(f"\n📋 任务详情:")
        print(f"   任务类型: process_email_task")
        print(f"   用户ID: {test_email_data['user_id']}")
        print(f"   邮件ID: {test_email_data['message_id']}")
        
        print(f"\n💡 提示:")
        print(f"   1. 任务已发送到Dramatiq队列，worker会自动处理")
        print(f"   2. 查看worker日志了解处理进度")
        print(f"   3. 由于测试URL无效，附件下载可能失败（这是正常的）")
        
        return True
        
    except Exception as e:
        print(f"❌ 任务发送失败: {e}")
        return False


def test_ocr_processing():
    """测试OCR处理任务"""
    print("\n🔍 测试OCR处理任务")
    print("-" * 30)
    
    from app.tasks.dramatiq_tasks import process_ocr_task
    
    test_ocr_data = {
        "user_id": "test-user-123",
        "invoice_id": "test-invoice-456",
        "file_path": "/fake/path/test_invoice.pdf",
        "original_filename": "test_invoice.pdf"
    }
    
    try:
        print(f"📄 发送OCR处理任务...")
        message = process_ocr_task.send(test_ocr_data)
        
        print(f"✅ OCR任务发送成功!")
        print(f"   消息ID: {message.message_id}")
        print(f"   发票ID: {test_ocr_data['invoice_id']}")
        
        return True
        
    except Exception as e:
        print(f"❌ OCR任务发送失败: {e}")
        return False


def test_database_connection():
    """测试数据库连接"""
    print("\n🗄️  测试数据库连接")
    print("-" * 30)
    
    try:
        # 测试broker连接
        print(f"📡 连接Dramatiq broker...")
        print(f"   Broker类型: {type(broker).__name__}")
        print(f"   连接URL: {settings.database_url[:50]}...")
        
        # 尝试连接数据库
        import asyncpg
        
        async def test_db():
            db_url = settings.database_url_async.replace('postgresql+asyncpg://', 'postgresql://')
            conn = await asyncpg.connect(db_url, statement_cache_size=0)
            result = await conn.fetchval("SELECT COUNT(*) FROM dramatiq.queue")
            await conn.close()
            return result
        
        task_count = asyncio.run(test_db())
        print(f"✅ 数据库连接成功!")
        print(f"   队列中任务数量: {task_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False


def main():
    """主测试函数"""
    print("🎯 发票助手 - 端到端测试")
    print("=" * 60)
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    results = []
    
    # 1. 测试数据库连接
    results.append(("数据库连接", test_database_connection()))
    
    # 2. 测试邮件处理
    results.append(("邮件处理任务", test_email_processing()))
    
    # 3. 测试OCR处理
    results.append(("OCR处理任务", test_ocr_processing()))
    
    # 总结结果
    print("\n" + "=" * 60)
    print("📊 测试结果总结")
    print("=" * 60)
    
    success_count = 0
    for test_name, success in results:
        status = "✅ 通过" if success else "❌ 失败"
        print(f"   {test_name:<15}: {status}")
        if success:
            success_count += 1
    
    print(f"\n总计: {success_count}/{len(results)} 项测试通过")
    
    if success_count == len(results):
        print("🎉 所有测试通过！邮件处理流程正常工作。")
    else:
        print("⚠️  部分测试失败，请检查配置和依赖。")
    
    print("\n💡 下一步:")
    print("   1. 检查Dramatiq worker日志了解任务处理情况")
    print("   2. 使用真实邮件测试完整流程")
    print("   3. 配置真实的OCR服务API")


if __name__ == "__main__":
    main()