#!/usr/bin/env python3
"""
测试数据库连接
"""

import asyncio
from sqlalchemy import text

from app.core.database import init_db, close_db, get_db_context
from app.core.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("test_database")
settings = get_settings()


async def test_connection():
    """测试数据库连接"""
    print("=== 测试数据库连接 ===")
    print(f"数据库 URL: {settings.database_url[:50]}...")
    print(f"异步 URL: {settings.database_url_async[:50]}...")
    print(f"Supabase 项目 ID: {settings.supabase_project_id}")
    
    try:
        # 初始化数据库连接
        await init_db()
        print("✅ 数据库连接成功！")
        
        # 测试查询
        async with get_db_context() as db:
            # 测试基本查询
            result = await db.execute(text("SELECT 1 as test"))
            test_value = result.scalar()
            print(f"✅ 测试查询成功: {test_value}")
            
            # 获取数据库版本
            result = await db.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ PostgreSQL 版本: {version}")
            
            # 获取当前数据库
            result = await db.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            print(f"✅ 当前数据库: {db_name}")
            
            # 检查是否是 Supabase
            result = await db.execute(text("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension 
                    WHERE extname = 'supabase_vault'
                )
            """))
            is_supabase = result.scalar()
            print(f"✅ Supabase 环境: {'是' if is_supabase else '否'}")
        
        print("\n✅ 所有测试通过！")
        
    except Exception as e:
        print(f"❌ 数据库连接失败: {str(e)}")
        logger.error(f"Database connection test failed: {str(e)}", exc_info=True)
    finally:
        # 关闭数据库连接
        await close_db()


async def test_connection_pool():
    """测试连接池"""
    print("\n=== 测试连接池 ===")
    
    try:
        await init_db()
        
        # 并发测试多个连接
        tasks = []
        for i in range(5):
            async def query_task(task_id: int):
                async with get_db_context() as db:
                    result = await db.execute(
                        text(f"SELECT :task_id as task_id, pg_backend_pid() as pid"),
                        {"task_id": task_id}
                    )
                    row = result.first()
                    print(f"  任务 {row.task_id}: 进程 ID {row.pid}")
            
            tasks.append(query_task(i))
        
        await asyncio.gather(*tasks)
        print("✅ 连接池测试成功！")
        
    except Exception as e:
        print(f"❌ 连接池测试失败: {str(e)}")
    finally:
        await close_db()


async def main():
    """主测试函数"""
    await test_connection()
    await test_connection_pool()


if __name__ == "__main__":
    asyncio.run(main())