#!/usr/bin/env python3
"""
快速端到端测试
"""

import sys
from pathlib import Path
from datetime import datetime

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.core.dramatiq_config import broker
    from app.tasks.dramatiq_tasks import process_email_task
    import dramatiq
    
    # 设置broker
    dramatiq.set_broker(broker)
    
    print("🧪 快速端到端测试")
    print("=" * 40)
    
    # 测试数据
    test_email_data = {
        "user_id": "test-user-123",
        "message_id": f"test-msg-{int(datetime.now().timestamp())}",
        "sender": "test@example.com",
        "subject": "发票测试",
        "attachments": []
    }
    
    print(f"📧 发送测试邮件任务...")
    print(f"   用户ID: {test_email_data['user_id']}")
    print(f"   消息ID: {test_email_data['message_id']}")
    
    # 发送任务
    message = process_email_task.send(test_email_data)
    
    print(f"✅ 任务发送成功!")
    print(f"   Dramatiq消息ID: {message.message_id}")
    print(f"   队列名称: {message.queue_name}")
    print(f"   Actor名称: {message.actor_name}")
    
    print(f"\n💡 测试完成 - 任务已发送到Dramatiq队列")
    print(f"   Worker将自动处理这个任务")
    print(f"   查看worker日志了解处理进度")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()