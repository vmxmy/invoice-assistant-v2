#!/usr/bin/env python3
"""
快速任务状态检查
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
import asyncpg

async def check_recent_tasks():
    try:
        db_url = settings.database_url_async.replace('postgresql+asyncpg://', 'postgresql://')
        conn = await asyncpg.connect(db_url, statement_cache_size=0)
        
        # 查询最近的任务
        result = await conn.fetch("""
            SELECT message_id, queue_name, actor_name, created_at, state
            FROM dramatiq.queue 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        
        print("📊 最近5个任务:")
        for task in result:
            print(f"- {task['message_id'][:8]}... ({task['queue_name']}) - {task['state']} - {task['created_at']}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ 检查失败: {e}")

if __name__ == "__main__":
    asyncio.run(check_recent_tasks())