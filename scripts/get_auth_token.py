#!/usr/bin/env python3
"""
获取Supabase认证令牌
"""

import os
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def get_auth_token():
    """获取认证令牌"""
    print("🔐 获取Supabase认证令牌")
    print("=" * 50)
    
    try:
        from supabase import create_client
        
        # 从环境变量或配置获取
        url = os.getenv('SUPABASE_URL', 'https://kuvezqgwwtrwfcijpnlj.supabase.co')
        key = os.getenv('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dmV6cWd3d3Ryd2ZjaWpwbmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NzMwNzQsImV4cCI6MjA1MTU0OTA3NH0.iHSUQeJSsKVQ84Ef0f_XaKAy-1xSIgVVqYwuB3fmk7g')
        
        print(f"📡 Supabase URL: {url}")
        
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
            
            return token
        else:
            print("❌ 登录失败 - 没有返回用户信息")
            return None
            
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        print(f"错误类型: {type(e).__name__}")
        
        # 提供替代方案
        print("\n💡 替代方案:")
        print("1. 检查网络连接和VPN设置")
        print("2. 使用curl命令直接调用Supabase API:")
        print("""
curl -X POST 'https://kuvezqgwwtrwfcijpnlj.supabase.co/auth/v1/token?grant_type=password' \\
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dmV6cWd3d3Ryd2ZjaWpwbmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NzMwNzQsImV4cCI6MjA1MTU0OTA3NH0.iHSUQeJSsKVQ84Ef0f_XaKAy-1xSIgVVqYwuB3fmk7g' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "blueyang@gmail.com",
    "password": "Xumy8!75"
  }'
        """)
        
        return None

if __name__ == "__main__":
    get_auth_token()