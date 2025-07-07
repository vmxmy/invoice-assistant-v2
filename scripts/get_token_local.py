#!/usr/bin/env python3
"""
使用本地Supabase客户端获取令牌
"""

import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.auth import supabase_auth

# 用户凭证
USER_EMAIL = "blueyang@gmail.com"
USER_PASSWORD = "Xumy8!75"

print("="*60)
print("使用本地Supabase客户端获取令牌")
print("="*60)

try:
    # 使用项目中的Supabase认证模块
    print(f"\n尝试登录: {USER_EMAIL}")
    
    # 这里我们需要直接使用Supabase客户端
    from supabase import create_client, Client
    from app.core.config import settings
    
    # 创建Supabase客户端
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
    
    # 登录
    response = supabase.auth.sign_in_with_password({
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    })
    
    if response.user:
        print("\n✓ 登录成功!")
        print(f"用户ID: {response.user.id}")
        print(f"用户邮箱: {response.user.email}")
        print(f"\nAccess Token: {response.session.access_token[:50]}...")
        
        # 保存令牌
        with open(".supabase_token", "w") as f:
            f.write(response.session.access_token)
        
        print(f"\n令牌已保存到: .supabase_token")
        
        # 生成curl命令
        print("\n" + "="*60)
        print("使用curl命令测试API:")
        print(f'\n# 设置令牌变量:')
        print(f'TOKEN="{response.session.access_token}"')
        print(f'\n# 或从文件读取:')
        print(f'TOKEN=$(cat .supabase_token)')
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
    print("\n请确保:")
    print("1. 虚拟环境已激活")
    print("2. 依赖已安装: pip install supabase")
    print("3. 环境变量已配置")