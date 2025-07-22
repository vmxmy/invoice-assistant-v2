#!/usr/bin/env python3
import asyncio
import httpx
import json

async def get_email_password():
    # 获取 token
    auth_url = 'https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password'
    auth_data = {
        'email': 'blueyang@gmail.com',
        'password': 'Xumy8%2175'
    }
    anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
    
    async with httpx.AsyncClient(proxy=None) as client:
        # 获取 token
        response = await client.post(
            auth_url,
            json=auth_data,
            headers={
                'apikey': anon_key,
                'Content-Type': 'application/json'
            }
        )
        
        if response.status_code != 200:
            print('认证失败')
            return
            
        token = response.json()['access_token']
        
        # 获取邮箱账户列表
        response = await client.get(
            'http://localhost:8090/api/v1/email-accounts',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if response.status_code == 200:
            accounts = response.json()['data']['items']
            for account in accounts:
                if account['email'] == 'vmxmy@qq.com':
                    print(f'邮箱: {account["email"]}')
                    print(f'加密密码: {account["password"]}')
                    # 从加密工具中解密
                    from app.core.crypto import decrypt_password
                    try:
                        decrypted = decrypt_password(account["password"])
                        print(f'解密密码: {decrypted}')
                    except Exception as e:
                        print(f'解密失败: {e}')
                    return
        else:
            print(f'获取邮箱账户失败: {response.status_code}')

if __name__ == "__main__":
    asyncio.run(get_email_password())