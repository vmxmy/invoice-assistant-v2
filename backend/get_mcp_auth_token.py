#!/usr/bin/env python3
"""
使用 MCP Supabase 获取用户认证令牌
"""

import asyncio
import json
from supabase import create_client, Client

async def get_user_auth_token():
    """获取用户认证令牌"""
    
    # 使用 MCP 获取的项目配置
    url = "https://sfenhhtvcyslxplvewmt.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"
    
    try:
        # 创建客户端
        supabase: Client = create_client(url, key)
        
        # 登录用户
        response = supabase.auth.sign_in_with_password({
            'email': 'blueyang@gmail.com',
            'password': 'Xumy8!75'
        })
        
        if response.user and response.session:
            token = response.session.access_token
            print(f"✅ 成功获取认证令牌")
            print(f"用户ID: {response.user.id}")
            print(f"用户邮箱: {response.user.email}")
            print(f"令牌: {token}")
            
            # 保存令牌到文件
            with open('.auth_token', 'w') as f:
                f.write(token)
            
            print(f"✅ 令牌已保存到 .auth_token 文件")
            return token
        else:
            print("❌ 登录失败")
            return None
            
    except Exception as e:
        print(f"❌ 获取令牌失败: {e}")
        return None

if __name__ == "__main__":
    token = asyncio.run(get_user_auth_token())
    if token:
        print(f"\n🎯 使用方法:")
        print(f"Authorization: Bearer {token}")
    else:
        print("\n❌ 无法获取令牌")