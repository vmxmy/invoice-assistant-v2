#!/usr/bin/env python3
"""
简单的Dramatiq测试
避免任务重复注册问题
"""

import dramatiq
from app.core.dramatiq_config import broker

# 定义唯一的测试任务
@dramatiq.actor(queue_name="test_queue", actor_name="simple_test_task")
def simple_test_task(message):
    """简单测试任务"""
    print(f"✅ 处理测试任务: {message}")
    return {"status": "completed", "message": message, "processed": True}

if __name__ == "__main__":
    print("🧪 发送测试任务...")
    
    try:
        # 发送任务
        message = simple_test_task.send("Hello from Dramatiq test!")
        print(f"✅ 任务发送成功!")
        print(f"   消息ID: {message.message_id}")
        print(f"   队列名称: {message.queue_name}")
        print(f"   Actor名称: {message.actor_name}")
        
        print("\n🔧 现在可以启动Worker来处理这个任务:")
        print("   ./manage_dramatiq.sh start-dev")
        print("   或者:")
        print("   dramatiq simple_dramatiq_test --processes=1 --threads=1")
        
    except Exception as e:
        print(f"❌ 发送任务失败: {e}")
        import traceback
        traceback.print_exc()