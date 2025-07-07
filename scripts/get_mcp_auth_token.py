#!/usr/bin/env python3
"""
使用MCP项目配置获取认证令牌
"""

import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def get_mcp_auth_token():
    """使用MCP项目配置获取认证令牌"""
    try:
        from supabase import create_client
        
        # 使用MCP获取的项目配置
        url = 'https://sfenhhtvcyslxplvewmt.supabase.co'
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
        
        print("🔐 使用MCP项目配置获取认证令牌")
        print("=" * 50)
        print(f"📡 项目URL: {url}")
        
        # 创建客户端
        supabase = create_client(url, key)
        print("✅ Supabase客户端创建成功")
        
        # 用户登录
        print("🔑 尝试用户登录...")
        print("📧 邮箱: blueyang@gmail.com")
        
        response = supabase.auth.sign_in_with_password({
            'email': 'blueyang@gmail.com',
            'password': 'Xumy8!75'
        })
        
        if response and response.user:
            token = response.session.access_token
            print(f"\n✅ 登录成功!")
            print(f"👤 用户ID: {response.user.id}")
            print(f"📧 邮箱: {response.user.email}")
            print(f"\n🎫 访问令牌:")
            print(f"{token}")
            print(f"\n📋 在API测试中使用:")
            print(f"Authorization: Bearer {token}")
            
            # 保存令牌到文件
            with open('.user_token', 'w') as f:
                f.write(token)
            print(f"\n💾 令牌已保存到 .user_token 文件")
            
            return token
        else:
            print("❌ 登录失败 - 没有返回用户信息")
            return None
            
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        print(f"错误类型: {type(e).__name__}")
        return None

if __name__ == "__main__":
    get_mcp_auth_token()