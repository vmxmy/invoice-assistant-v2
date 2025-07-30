#!/usr/bin/env python3
"""
获取Supabase用户认证令牌
"""

from supabase import create_client
import os

# Supabase配置
SUPABASE_URL = 'https://sfenhhtvcyslxplvewmt.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

# 用户凭据
EMAIL = 'blueyang@gmail.com'
PASSWORD = 'Xumy8!75'

def get_auth_token():
    """获取用户认证令牌"""
    try:
        # 创建Supabase客户端
        supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        
        # 登录
        response = supabase.auth.sign_in_with_password({
            'email': EMAIL,
            'password': PASSWORD
        })
        
        if response.user:
            token = response.session.access_token
            print(f"✅ 获取令牌成功!")
            print(f"用户ID: {response.user.id}")
            print(f"邮箱: {response.user.email}")
            print(f"令牌: {token[:50]}...")
            
            # 保存令牌到文件
            token_file = '.user_token'
            with open(token_file, 'w') as f:
                f.write(token)
            print(f"\n令牌已保存到: {token_file}")
            
            return token
        else:
            print("❌ 登录失败: 无法获取用户信息")
            return None
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        return None

if __name__ == "__main__":
    get_auth_token()