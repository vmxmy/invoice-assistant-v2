#!/usr/bin/env python3
"""
调试webhook端点
"""

import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

def test_user_id_extraction():
    """测试用户ID提取"""
    print("🔍 测试用户ID提取功能")
    
    test_emails = [
        "invoice-550e8400-e29b-41d4-a716-446655440000@invoice.example.com",
        "invoice-test-user-123@invoice.example.com",
        "user@example.com"
    ]
    
    def extract_user_id_from_email(recipient: str):
        """从邮件地址提取用户ID"""
        try:
            # 匹配 invoice-{uuid}@domain.com 格式
            pattern = r'invoice-([a-f0-9\-]{36})@'
            match = re.match(pattern, recipient.lower())
            
            if match:
                return match.group(1)
                
            print(f"⚠️  无法从邮箱地址提取用户ID: {recipient}")
            return None
            
        except Exception as e:
            print(f"❌ 提取用户ID时出错: {e}")
            return None
    
    for email in test_emails:
        user_id = extract_user_id_from_email(email)
        print(f"📧 {email}")
        print(f"   用户ID: {user_id}")
        print()


def test_task_dispatcher():
    """测试TaskDispatcher"""
    print("🔍 测试TaskDispatcher功能")
    
    try:
        from app.tasks.dramatiq_tasks import TaskDispatcher
        from app.core.dramatiq_config import broker
        import dramatiq
        
        # 设置broker
        dramatiq.set_broker(broker)
        
        test_email_data = {
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "recipient": "invoice-550e8400-e29b-41d4-a716-446655440000@invoice.example.com",
            "sender": "test@example.com",
            "subject": "测试邮件",
            "body_plain": "测试内容",
            "timestamp": 1234567890,
            "message_id": "test-message-123",
            "attachments": []
        }
        
        print("📧 发送测试任务...")
        task_id = TaskDispatcher.send_email_task(test_email_data)
        print(f"✅ 任务发送成功: {task_id}")
        return True
        
    except Exception as e:
        print(f"❌ TaskDispatcher测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🧪 Webhook调试测试")
    print("=" * 40)
    
    test_user_id_extraction()
    test_task_dispatcher()