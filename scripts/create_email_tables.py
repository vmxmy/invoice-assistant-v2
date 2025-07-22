#!/usr/bin/env python3
"""
创建邮箱相关的数据库表
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy import text
from app.core.database import async_engine
from app.models import Base, EmailAccount


async def create_tables():
    """创建数据库表"""
    try:
        # 使用异步引擎创建表
        async with async_engine.begin() as conn:
            # 创建所有表
            await conn.run_sync(Base.metadata.create_all)
            
            # 检查email_accounts表是否存在
            result = await conn.execute(
                text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_accounts')")
            )
            exists = result.scalar()
            
            if exists:
                print("✓ email_accounts表创建成功")
                
                # 获取表结构信息
                result = await conn.execute(
                    text("""
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns
                        WHERE table_name = 'email_accounts'
                        ORDER BY ordinal_position
                    """)
                )
                columns = result.fetchall()
                
                print("\n表结构：")
                for col in columns:
                    print(f"  - {col[0]}: {col[1]} (可空: {col[2]})")
            else:
                print("✗ email_accounts表创建失败")
                
    except Exception as e:
        print(f"创建表时出错: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("开始创建邮箱账户相关数据库表...")
    asyncio.run(create_tables())
    print("\n完成！")