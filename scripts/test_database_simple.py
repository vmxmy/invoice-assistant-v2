#!/usr/bin/env python3
"""
简单数据库连接测试
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, get_db_context
from app.models.profile import Profile
from uuid import uuid4
from sqlalchemy import text

async def test_db_connection():
    """测试数据库连接"""
    print("🔌 测试数据库连接...")
    
    try:
        async with get_db_context() as db:
            # 简单的查询测试
            result = await db.execute(text("SELECT 1 as test"))
            print("✅ 数据库连接成功")
            
            # 测试Profile表查询
            profiles_count = await db.execute(text("SELECT COUNT(*) FROM profiles"))
            count = profiles_count.scalar()
            print(f"✅ profiles表存在，当前有 {count} 条记录")
            
            # 测试email_addresses表
            try:
                emails_count = await db.execute(text("SELECT COUNT(*) FROM email_addresses"))
                count = emails_count.scalar()
                print(f"✅ email_addresses表存在，当前有 {count} 条记录")
            except Exception as e:
                print(f"❌ email_addresses表不存在或无法访问: {str(e)}")
            
            return True
            
    except Exception as e:
        print(f"❌ 数据库连接失败: {str(e)}")
        return False

async def main():
    """主函数"""
    print("🎯 简单数据库连接测试")
    print("=" * 40)
    
    success = await test_db_connection()
    
    if success:
        print("\n🎉 数据库测试成功！")
        return 0
    else:
        print("\n💥 数据库测试失败！")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)