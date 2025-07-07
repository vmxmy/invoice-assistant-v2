#!/usr/bin/env python3
"""
使用已知凭证获取Supabase令牌
"""
import os
import sys
import ssl
import certifi
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 禁用SSL验证警告
import urllib3
urllib3.disable_warnings()

# 设置SSL上下文
ssl._create_default_https_context = ssl._create_unverified_context

from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions
from app.core.config import settings

# 用户凭证
USER_EMAIL = "blueyang@gmail.com"
USER_PASSWORD = "Xumy8!75"

print("="*60)
print("使用Supabase客户端获取令牌")
print("="*60)

try:
    print(f"\nSupabase URL: {settings.supabase_url}")
    print(f"使用密钥: {settings.supabase_key[:20]}...")
    
    # 创建客户端选项，禁用SSL验证
    options = ClientOptions(
        auto_refresh_token=True,
        persist_session=True,
        headers={"User-Agent": "InvoiceAssist/1.0"}
    )
    
    # 创建Supabase客户端
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key, options)
    
    print(f"\n尝试登录: {USER_EMAIL}")
    
    # 登录
    response = supabase.auth.sign_in_with_password({
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    })
    
    if response.user and response.session:
        print("\n✓ 登录成功!")
        print(f"用户ID: {response.user.id}")
        print(f"用户邮箱: {response.user.email}")
        print(f"\nAccess Token:")
        print(response.session.access_token)
        
        # 保存令牌
        with open("../.supabase_token", "w") as f:
            f.write(response.session.access_token)
        
        print(f"\n令牌已保存到: ../.supabase_token")
        
        # 生成curl命令
        print("\n" + "="*60)
        print("使用curl命令测试API:")
        print(f'\n# 设置令牌变量:')
        print(f'TOKEN="{response.session.access_token}"')
        print(f'\n# 验证令牌:')
        print(f'curl -X POST "http://localhost:8090/api/v1/auth/verify-token" -H "Authorization: Bearer $TOKEN"')
        print(f'\n# 获取用户信息:')
        print(f'curl -X GET "http://localhost:8090/api/v1/users/me" -H "Authorization: Bearer $TOKEN"')
        print(f'\n# 获取发票列表:')
        print(f'curl -X GET "http://localhost:8090/api/v1/invoices/" -H "Authorization: Bearer $TOKEN"')
        print(f'\n# 上传发票:')
        print(f'curl -X POST "http://localhost:8090/api/v1/files/upload-invoice" \\')
        print(f'  -H "Authorization: Bearer $TOKEN" \\')
        print(f'  -F "file=@/path/to/invoice.pdf"')
        
    else:
        print("\n✗ 登录失败")
        
except Exception as e:
    print(f"\n错误: {e}")
    print("\n尝试使用不同的方法...")
    
    # 尝试直接使用httpx
    import httpx
    
    try:
        # 创建不验证SSL的客户端
        with httpx.Client(verify=False) as client:
            # 登录请求
            login_url = f"{settings.supabase_url}/auth/v1/token?grant_type=password"
            headers = {
                "apikey": settings.supabase_key,
                "Content-Type": "application/json"
            }
            data = {
                "email": USER_EMAIL,
                "password": USER_PASSWORD
            }
            
            response = client.post(login_url, headers=headers, json=data)
            
            if response.status_code == 200:
                result = response.json()
                access_token = result.get("access_token")
                
                print("\n✓ 使用httpx登录成功!")
                print(f"\nAccess Token:")
                print(access_token)
                
                # 保存令牌
                with open("../.supabase_token", "w") as f:
                    f.write(access_token)
                
                print(f"\n令牌已保存到: ../.supabase_token")
                
            else:
                print(f"\n登录失败: {response.status_code}")
                print(response.text)
                
    except Exception as e2:
        print(f"\nhttpx方法也失败: {e2}")