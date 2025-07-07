#!/usr/bin/env python3
"""
检查Dramatiq任务状态
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
import asyncpg


async def check_task_status():
    """检查任务队列状态"""
    try:
        db_url = settings.database_url_async.replace('postgresql+asyncpg://', 'postgresql://')
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
        
        print("📊 Dramatiq任务队列状态")
        print("=" * 40)
        
        # 查询队列中的任务
        tasks = await conn.fetch("""
            SELECT 
                id,
                queue_name,
                actor_name,
                message_id,
                state,
                created_at,
                message->>'args' as args
            FROM dramatiq.queue 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        
        if tasks:
            print(f"📋 最近10个任务:")
            print("-" * 40)
            for i, task in enumerate(tasks, 1):
                print(f"{i}. 任务ID: {task['message_id'][:8]}...")
                print(f"   队列: {task['queue_name']}")
                print(f"   Actor: {task['actor_name']}")
                print(f"   状态: {task['state']}")
                print(f"   创建时间: {task['created_at']}")
                print()
        else:
            print("📭 队列中暂无任务")
        
        # 统计信息
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE state = 'pending') as pending_tasks,
                COUNT(*) FILTER (WHERE state = 'completed') as completed_tasks,
                COUNT(*) FILTER (WHERE state = 'failed') as failed_tasks
            FROM dramatiq.queue
        """)
        
        print("📈 任务统计:")
        print(f"   总任务数: {stats['total_tasks']}")
        print(f"   待处理: {stats['pending_tasks']}")
        print(f"   已完成: {stats['completed_tasks']}")
        print(f"   失败: {stats['failed_tasks']}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")


if __name__ == "__main__":
    asyncio.run(check_task_status())