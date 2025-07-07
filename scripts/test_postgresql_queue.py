#!/usr/bin/env python3
"""
PostgreSQL任务队列测试脚本
验证任务入队、处理和状态查询功能
"""

import asyncio
import sys
import time
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.postgresql_task_processor import task_queue, enqueue_email_processing
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def test_basic_queue_operations():
    """测试基本队列操作"""
    logger.info("=" * 50)
    logger.info("测试基本队列操作")
    logger.info("=" * 50)
    
    try:
        # 1. 测试任务入队
        logger.info("🔄 测试任务入队...")
        
        # 创建测试任务
        test_payload = {
            "test": "basic_operation",
            "message": "这是一个测试任务",
            "timestamp": time.time()
        }
        
        task_id = await task_queue.enqueue(
            task_type="ocr_extract",
            payload=test_payload,
            priority=10,
            correlation_id="test-basic"
        )
        
        logger.info(f"✅ 任务入队成功，ID: {task_id}")
        
        # 2. 测试任务状态查询
        logger.info("🔍 测试任务状态查询...")
        
        task_status = await task_queue.get_task_status(task_id)
        if task_status:
            logger.info(f"✅ 任务状态查询成功:")
            logger.info(f"   状态: {task_status['status']}")
            logger.info(f"   类型: {task_status['type']}")
            logger.info(f"   创建时间: {task_status['created_at']}")
        else:
            logger.error("❌ 任务状态查询失败")
            return False
        
        # 3. 测试任务统计
        logger.info("📊 测试任务统计...")
        
        stats = await task_queue.get_task_stats(hours_back=1)
        logger.info(f"✅ 任务统计获取成功，共 {len(stats)} 项统计数据")
        
        for stat in stats:
            logger.info(f"   {stat['task_type']}.{stat['status']}: {stat['count']} 个任务")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 基本队列操作测试失败: {e}")
        return False


async def test_email_processing_queue():
    """测试邮件处理队列"""
    logger.info("=" * 50)
    logger.info("测试邮件处理队列")
    logger.info("=" * 50)
    
    try:
        # 创建测试邮件数据
        email_data = {
            "user_id": "test-user-123",
            "recipient": "invoice-test-user-123@test.example.com",
            "sender": "test@example.com",
            "subject": "测试发票邮件 - PostgreSQL队列",
            "body_plain": "这是一个PostgreSQL队列的测试邮件",
            "body_html": "<p>这是一个PostgreSQL队列的测试邮件</p>",
            "timestamp": int(time.time()),
            "message_id": f"test-postgresql-{time.time()}@test.example.com",
            "attachments": [
                {
                    "name": "test-invoice.pdf",
                    "url": "https://example.com/test-invoice.pdf",
                    "content_type": "application/pdf",
                    "size": "12345"
                }
            ]
        }
        
        logger.info("📧 入队邮件处理任务...")
        
        # 使用邮件处理入队函数
        task_id = await enqueue_email_processing(email_data)
        
        logger.info(f"✅ 邮件处理任务入队成功，ID: {task_id}")
        
        # 查询任务状态
        logger.info("🔍 查询邮件处理任务状态...")
        
        task_status = await task_queue.get_task_status(task_id)
        if task_status:
            logger.info(f"✅ 邮件任务状态:")
            logger.info(f"   ID: {task_status['task_id']}")
            logger.info(f"   类型: {task_status['type']}")
            logger.info(f"   状态: {task_status['status']}")
            logger.info(f"   创建时间: {task_status['created_at']}")
            
            if task_status.get('error_message'):
                logger.warning(f"   错误信息: {task_status['error_message']}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 邮件处理队列测试失败: {e}")
        return False


async def test_multiple_task_types():
    """测试多种任务类型"""
    logger.info("=" * 50)
    logger.info("测试多种任务类型")
    logger.info("=" * 50)
    
    try:
        task_ids = []
        
        # 测试不同类型的任务
        task_configs = [
            {
                "type": "ocr_extract",
                "payload": {
                    "file_path": "/tmp/test1.pdf",
                    "test_mode": True
                },
                "priority": 8
            },
            {
                "type": "send_notification",
                "payload": {
                    "type": "email",
                    "recipient": "test@example.com",
                    "message": "测试通知"
                },
                "priority": 5
            },
            {
                "type": "cleanup_files",
                "payload": {
                    "file_paths": ["/tmp/old1.pdf", "/tmp/old2.pdf"],
                    "max_age_days": 7
                },
                "priority": 1
            }
        ]
        
        logger.info(f"📝 入队 {len(task_configs)} 个不同类型的任务...")
        
        for i, config in enumerate(task_configs):
            task_id = await task_queue.enqueue(
                task_type=config["type"],
                payload=config["payload"],
                priority=config["priority"],
                correlation_id=f"test-multi-{i}"
            )
            task_ids.append(task_id)
            logger.info(f"   ✅ {config['type']} 任务入队: {task_id}")
        
        # 获取所有任务状态
        logger.info("🔍 查询所有任务状态...")
        
        for task_id in task_ids:
            status = await task_queue.get_task_status(task_id)
            if status:
                logger.info(f"   任务 {task_id[:8]}...: {status['type']} - {status['status']}")
        
        # 获取最新统计
        logger.info("📊 获取最新任务统计...")
        
        stats = await task_queue.get_task_stats(hours_back=1)
        
        type_counts = {}
        status_counts = {}
        
        for stat in stats:
            task_type = stat['task_type']
            status = stat['status']
            count = stat['count']
            
            if task_type not in type_counts:
                type_counts[task_type] = 0
            type_counts[task_type] += count
            
            if status not in status_counts:
                status_counts[status] = 0
            status_counts[status] += count
        
        logger.info("   任务类型统计:")
        for task_type, count in type_counts.items():
            logger.info(f"     {task_type}: {count} 个")
        
        logger.info("   任务状态统计:")
        for status, count in status_counts.items():
            logger.info(f"     {status}: {count} 个")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 多种任务类型测试失败: {e}")
        return False


async def test_delayed_tasks():
    """测试延迟任务"""
    logger.info("=" * 50)
    logger.info("测试延迟任务")
    logger.info("=" * 50)
    
    try:
        # 创建延迟任务
        logger.info("⏰ 创建延迟任务...")
        
        delay_seconds = 5
        task_id = await task_queue.enqueue(
            task_type="send_notification",
            payload={
                "type": "delayed_test",
                "message": f"这是一个延迟 {delay_seconds} 秒的任务",
                "created_at": time.time()
            },
            delay_seconds=delay_seconds,
            correlation_id="test-delayed"
        )
        
        logger.info(f"✅ 延迟任务创建成功，ID: {task_id}")
        logger.info(f"   任务将在 {delay_seconds} 秒后可执行")
        
        # 立即查询状态
        status = await task_queue.get_task_status(task_id)
        if status:
            logger.info(f"   当前状态: {status['status']}")
            logger.info(f"   创建时间: {status['created_at']}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 延迟任务测试失败: {e}")
        return False


async def run_all_tests():
    """运行所有测试"""
    logger.info("🚀 开始PostgreSQL任务队列测试")
    
    tests = [
        ("基本队列操作", test_basic_queue_operations),
        ("邮件处理队列", test_email_processing_queue),
        ("多种任务类型", test_multiple_task_types),
        ("延迟任务", test_delayed_tasks),
    ]
    
    results = {}
    passed_count = 0
    
    for test_name, test_func in tests:
        try:
            logger.info(f"\n{'=' * 30}")
            logger.info(f"运行测试: {test_name}")
            logger.info('=' * 30)
            
            result = await test_func()
            results[test_name] = result
            
            if result:
                passed_count += 1
                logger.info(f"✅ {test_name} 测试通过")
            else:
                logger.error(f"❌ {test_name} 测试失败")
                
        except Exception as e:
            logger.error(f"❌ {test_name} 测试异常: {e}")
            results[test_name] = False
    
    # 输出测试总结
    logger.info("\n" + "=" * 50)
    logger.info("PostgreSQL队列测试总结")
    logger.info("=" * 50)
    
    for test_name, result in results.items():
        status_icon = "✅" if result else "❌"
        logger.info(f"{status_icon} {test_name}")
    
    success_rate = passed_count / len(tests) * 100
    logger.info(f"\n🎯 测试完成，成功率: {success_rate:.1f}% ({passed_count}/{len(tests)})")
    
    if success_rate >= 80:
        logger.info("🎉 PostgreSQL任务队列功能正常！")
        return 0
    else:
        logger.warning("⚠️ PostgreSQL任务队列需要进一步调试")
        return 1


async def main():
    """主函数"""
    try:
        exit_code = await run_all_tests()
        return exit_code
    except Exception as e:
        logger.error(f"测试执行失败: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)