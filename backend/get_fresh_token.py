#!/usr/bin/env python3
"""
获取新的认证token
"""

import asyncio
from supabase import create_client

async def get_auth_token():
    """获取认证token"""
    
    # Supabase配置
    url = 'https://sfenhhtvcyslxplvewmt.supabase.co'
    key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
    
    # 创建客户端并登录
    supabase = create_client(url, key)
    response = supabase.auth.sign_in_with_password({
        'email': 'blueyang@gmail.com',
        'password': 'Xumy8!75'
    })
    
    if response.user:
        token = response.session.access_token
        print(f'✅ 认证成功')
        print(f'Token: {token}')
        
        # 保存到文件
        with open('.auth_token', 'w') as f:
            f.write(token)
        print(f'✅ Token已保存到 .auth_token 文件')
        
        return token
    else:
        print('❌ 认证失败')
        return None

if __name__ == "__main__":
    asyncio.run(get_auth_token())