#!/usr/bin/env python3
"""
Dramatiq测试脚本
独立测试Dramatiq功能，避免与现有Celery冲突
"""

import sys
import asyncio
from pathlib import Path

# 确保应用模块可以被导入
sys.path.append(str(Path(__file__).parent))

def test_broker_config():
    """测试Broker配置"""
    print("🧪 测试Dramatiq Broker配置...")
    
    try:
        from app.core.dramatiq_config import broker
        print(f"✅ Broker创建成功: {type(broker).__name__}")
        print(f"   Middleware数量: {len(broker.middleware)}")
        
        # 列出中间件
        middleware_names = [type(m).__name__ for m in broker.middleware]
        print(f"   中间件: {', '.join(middleware_names)}")
        
        return True
    except Exception as e:
        print(f"❌ Broker配置失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_task_definition():
    """测试任务定义"""
    print("\n🧪 测试任务定义...")
    
    try:
        # 单独导入任务模块
        import dramatiq
        from app.core.dramatiq_config import broker
        
        # 定义简单测试任务
        @dramatiq.actor(queue_name="test_queue")
        def test_task(message):
            print(f"处理测试任务: {message}")
            return {"status": "completed", "message": message}
        
        print("✅ 任务定义成功")
        print(f"   任务名称: {test_task.actor_name}")
        print(f"   队列名称: {test_task.queue_name}")
        
        return test_task
    except Exception as e:
        print(f"❌ 任务定义失败: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_task_sending():
    """测试任务发送"""
    print("\n🧪 测试任务发送...")
    
    try:
        test_task = test_task_definition()
        if not test_task:
            return False
        
        # 发送测试任务
        message = test_task.send("Hello Dramatiq!")
        print(f"✅ 任务发送成功")
        print(f"   消息ID: {message.message_id}")
        print(f"   队列名称: {message.queue_name}")
        
        return True
    except Exception as e:
        print(f"❌ 任务发送失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_database_connection():
    """测试数据库连接"""
    print("\n🧪 测试数据库连接...")
    
    try:
        import asyncpg
        from app.core.config import settings
        
        async def check_connection():
            # 转换连接URL
            db_url = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://').replace('postgresql+psycopg://', 'postgresql://')
            
            conn = await asyncpg.connect(db_url)
            
            # 检查dramatiq表是否存在
            result = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'dramatiq_messages'
                )
            """)
            
            await conn.close()
            return result
        
        has_table = asyncio.run(check_connection())
        
        if has_table:
            print("✅ 数据库连接成功，dramatiq_messages表已存在")
        else:
            print("⚠️ 数据库连接成功，但dramatiq_messages表不存在")
            print("   这是正常的，第一次运行worker时会自动创建")
        
        return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_worker_startup():
    """测试Worker启动命令"""
    print("\n🧪 测试Worker启动命令...")
    
    try:
        import subprocess
        import time
        
        # 测试dramatiq命令是否可用
        result = subprocess.run(
            ["dramatiq", "--help"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        
        if result.returncode == 0:
            print("✅ dramatiq命令可用")
            print("   可以使用以下命令启动worker:")
            print("   dramatiq app.tasks.dramatiq_tasks --processes=2 --threads=4")
        else:
            print(f"❌ dramatiq命令不可用: {result.stderr}")
            return False
        
        return True
    except subprocess.TimeoutExpired:
        print("❌ dramatiq命令超时")
        return False
    except FileNotFoundError:
        print("❌ 未找到dramatiq命令")
        print("   请确保已安装: pip install dramatiq-pg")
        return False
    except Exception as e:
        print(f"❌ 测试Worker启动失败: {e}")
        return False


def main():
    """主测试函数"""
    print("🚀 Dramatiq 集成测试")
    print("=" * 50)
    
    # 执行所有测试
    tests = [
        ("Broker配置", test_broker_config),
        ("任务定义", lambda: test_task_definition() is not None),
        ("任务发送", test_task_sending),
        ("数据库连接", test_database_connection),
        ("Worker启动", test_worker_startup),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}测试异常: {e}")
            results.append((test_name, False))
    
    # 汇总结果
    print("\n" + "=" * 50)
    print("📊 测试结果汇总:")
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 总体结果: {passed}/{total} 测试通过")
    
    if passed == total:
        print("🎉 所有测试通过！Dramatiq配置正确！")
        print("\n📋 后续步骤:")
        print("1. 启动Worker: ./manage_dramatiq.sh start-dev")
        print("2. 发送测试任务验证端到端流程")
        print("3. 启动监控面板查看任务状态")
    else:
        print("⚠️ 部分测试失败，请检查配置")
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)