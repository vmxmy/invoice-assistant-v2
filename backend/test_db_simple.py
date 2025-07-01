#!/usr/bin/env python3
"""
简单的数据库连接测试
"""

import asyncio
from sqlalchemy import text

from app.core.database import engine
from app.core.config import get_settings

settings = get_settings()


async def test_simple():
    """简单测试"""
    print(f"数据库 URL: {settings.database_url[:60]}...")
    print(f"异步 URL: {settings.database_url_async[:60]}...")
    
    try:
        # 直接使用引擎执行查询
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            value = result.scalar()
            print(f"✅ 连接成功！查询结果: {value}")
            
            # 获取版本
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ PostgreSQL 版本: {version[:50]}...")
            
    except Exception as e:
        print(f"❌ 连接失败: {str(e)}")
    finally:
        await engine.dispose()
        print("连接已关闭")


if __name__ == "__main__":
    asyncio.run(test_simple())