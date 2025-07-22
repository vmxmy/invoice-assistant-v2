#!/usr/bin/env python3
"""
获取QQ邮箱账户的密码用于IMAP测试
"""
import asyncio
import httpx
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from app.core.crypto import decrypt_password

async def get_qq_email_password():
    # 读取token
    with open('token.txt', 'r') as f:
        token = f.read().strip()
    
    async with httpx.AsyncClient(proxy=None, timeout=30.0) as client:
        # 获取邮箱账户列表
        response = await client.get(
            'http://localhost:8090/api/v1/email-accounts',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        print(f"响应状态: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            accounts = data['data']['items']
            print(f"找到 {len(accounts)} 个邮箱账户")
            
            for account in accounts:
                print(f"\n邮箱: {account['email']}")
                print(f"提供商: {account['provider']}")
                print(f"加密密码: {account['password']}")
                
                if account['email'] == 'vmxmy@qq.com':
                    # 解密密码
                    try:
                        decrypted = decrypt_password(account['password'])
                        print(f"解密密码: {decrypted}")
                        
                        # 保存到环境变量文件
                        print("\n将密码保存到 .env 文件")
                        with open('.env', 'w') as f:
                            f.write(f'QQ_EMAIL_PASSWORD="{decrypted}"\n')
                        print("✅ 密码已保存到 .env 文件")
                        
                        return decrypted
                    except Exception as e:
                        print(f"解密失败: {e}")
        else:
            print(f"获取邮箱账户失败: {response.text}")

if __name__ == "__main__":
    asyncio.run(get_qq_email_password())