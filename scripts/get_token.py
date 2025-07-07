#!/usr/bin/env python3
"""获取Supabase认证令牌的脚本"""

from supabase import create_client

def get_supabase_token():
    """获取Supabase认证令牌"""
    try:
        # Supabase配置
        url = 'https://kuvezqgwwtrwfcijpnlj.supabase.co'
        key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1dmV6cWd3d3Ryd2ZjaWpwbmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5NzMwNzQsImV4cCI6MjA1MTU0OTA3NH0.iHSUQeJSsKVQ84Ef0f_XaKAy-1xSIgVVqYwuB3fmk7g'
        
        # 创建客户端
        supabase = create_client(url, key)
        
        # 登录
        response = supabase.auth.sign_in_with_password({
            'email': 'blueyang@gmail.com',
            'password': 'Xumy8!75'
        })
        
        # 获取令牌
        if response.user:
            token = response.session.access_token
            print(f'Authorization: Bearer {token}')
            return token
        else:
            print('登录失败')
            return None
            
    except Exception as e:
        print(f'错误: {e}')
        return None

if __name__ == '__main__':
    get_supabase_token()