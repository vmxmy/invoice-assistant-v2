#!/usr/bin/env python3
"""
创建测试用户并获取有效的JWT token
"""

import asyncio
import sys
import os
from uuid import UUID

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db_context
from app.models.profile import Profile
from app.core.auth import supabase_auth
from sqlalchemy import select

async def create_test_user():
    """创建测试用户并返回JWT token"""
    
    test_user_id = "550e8400-e29b-41d4-a716-446655440000"
    test_email = "test@example.com"
    
    print("🔧 创建/检查测试用户...")
    
    async with get_db_context() as session:
        # 检查档案是否已存在
        result = await session.execute(
            select(Profile).where(Profile.auth_user_id == UUID(test_user_id))
        )
        existing_profile = result.scalar_one_or_none()
        
        if existing_profile:
            print(f"✅ 测试用户档案已存在: {existing_profile.display_name}")
        else:
            # 创建用户档案（用户认证由Supabase管理）
            print("➕ 创建测试用户档案...")
            new_profile = Profile(
                auth_user_id=UUID(test_user_id),
                display_name="测试用户",
                avatar_url=None,
                preferences={},
                email_config={}
            )
            session.add(new_profile)
            
            await session.commit()
            print(f"✅ 测试用户档案创建成功")
    
    # 创建JWT token
    print("🔑 生成JWT token...")
    try:
        # 手动创建token payload
        import jwt
        import time
        from app.core.config import settings
        
        payload = {
            "sub": test_user_id,
            "id": test_user_id,
            "email": test_email,
            "role": "authenticated",
            "aud": "authenticated",
            "iss": "supabase",
            "exp": int(time.time()) + 3600,  # 1小时过期
            "iat": int(time.time())
        }
        
        token = jwt.encode(
            payload, 
            settings.supabase_jwt_secret, 
            algorithm="HS256"
        )
        
        print(f"✅ Token生成成功")
        print(f"🔐 Token: {token}")
        
        return token
        
    except Exception as e:
        print(f"❌ Token生成失败: {e}")
        return None

if __name__ == "__main__":
    token = asyncio.run(create_test_user())