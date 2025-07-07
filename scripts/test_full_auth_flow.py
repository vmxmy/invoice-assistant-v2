#!/usr/bin/env python3
"""
完整的认证流程测试
1. 从Supabase获取令牌
2. 使用令牌访问后端API
"""

import asyncio
import aiohttp
import sys
import os
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

# Supabase配置
SUPABASE_URL = "https://qlstchkfdngenrwvetek.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsc3RjaGtmZG5nZW5yd3ZldGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNzA0MDksImV4cCI6MjA0ODk0NjQwOX0.AqZBdrKVfRq7GvUOCPiXZASKdO4lCKB10cl5sWdmuHI"

# 后端API配置
BACKEND_URL = "http://localhost:8090"

# 用户凭证
USER_EMAIL = "blueyang@gmail.com"
USER_PASSWORD = "Xumy8!75"


async def get_supabase_token():
    """从Supabase获取访问令牌"""
    async with aiohttp.ClientSession() as session:
        # 登录到Supabase
        login_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
        }
        data = {
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        }
        
        try:
            async with session.post(login_url, headers=headers, json=data, ssl=False) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return result.get("access_token"), result.get("refresh_token")
                else:
                    error = await resp.text()
                    print(f"Supabase登录失败: {resp.status}")
                    print(f"错误: {error}")
                    return None, None
        except Exception as e:
            print(f"连接Supabase失败: {e}")
            return None, None


async def test_backend_api(access_token):
    """使用Supabase令牌测试后端API"""
    async with aiohttp.ClientSession() as session:
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        # 1. 验证令牌
        print("\n1. 验证令牌")
        async with session.post(f"{BACKEND_URL}/api/v1/auth/verify-token", headers=headers) as resp:
            result = await resp.json()
            print(f"验证结果: {result}")
        
        # 2. 获取用户信息
        print("\n2. 获取用户信息")
        async with session.get(f"{BACKEND_URL}/api/v1/users/me", headers=headers) as resp:
            if resp.status == 200:
                user_info = await resp.json()
                print(f"用户信息: {user_info}")
            else:
                print(f"获取用户信息失败: {resp.status}")
                error = await resp.text()
                print(f"错误: {error}")
        
        # 3. 获取发票列表
        print("\n3. 获取发票列表")
        async with session.get(f"{BACKEND_URL}/api/v1/invoices/?page=1&page_size=5", headers=headers) as resp:
            if resp.status == 200:
                invoices = await resp.json()
                print(f"发票总数: {invoices.get('total', 0)}")
                print(f"本页数量: {len(invoices.get('items', []))}")
            else:
                print(f"获取发票列表失败: {resp.status}")
        
        # 4. 测试文件上传
        print("\n4. 测试文件上传")
        test_pdf = "/Users/xumingyang/Downloads/selected_invoices_20250321114536/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"
        
        if os.path.exists(test_pdf):
            data = aiohttp.FormData()
            data.add_field('file',
                         open(test_pdf, 'rb'),
                         filename=os.path.basename(test_pdf),
                         content_type='application/pdf')
            
            async with session.post(
                f"{BACKEND_URL}/api/v1/files/upload-invoice",
                data=data,
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"上传成功!")
                    print(f"发票ID: {result.get('invoice_id')}")
                    print(f"文件路径: {result.get('file_path')}")
                    
                    # 获取发票详情
                    invoice_id = result.get('invoice_id')
                    if invoice_id:
                        print(f"\n5. 获取发票详情")
                        async with session.get(
                            f"{BACKEND_URL}/api/v1/invoices/{invoice_id}",
                            headers=headers
                        ) as detail_resp:
                            if detail_resp.status == 200:
                                invoice = await detail_resp.json()
                                print(f"发票号码: {invoice.get('invoice_number')}")
                                print(f"销售方: {invoice.get('seller_name')}")
                                print(f"购买方: {invoice.get('buyer_name')}")
                                print(f"金额: {invoice.get('total_amount')}")
                else:
                    print(f"上传失败: {resp.status}")
                    error = await resp.text()
                    print(f"错误: {error}")
        else:
            print(f"测试文件不存在: {test_pdf}")


async def main():
    """主函数"""
    print("="*60)
    print("完整认证流程测试")
    print("="*60)
    
    # 1. 从Supabase获取令牌
    print("\n步骤1: 从Supabase获取访问令牌")
    access_token, refresh_token = await get_supabase_token()
    
    if access_token:
        print(f"✓ 获取令牌成功!")
        print(f"Access Token: {access_token[:50]}...")
        
        # 保存令牌供curl使用
        with open(".supabase_token", "w") as f:
            f.write(access_token)
        print(f"令牌已保存到: .supabase_token")
        
        # 2. 使用令牌访问后端API
        print("\n步骤2: 使用令牌访问后端API")
        await test_backend_api(access_token)
        
        # 3. 生成curl命令示例
        print("\n" + "="*60)
        print("curl命令示例:")
        print(f"\n# 使用保存的令牌:")
        print(f"TOKEN=$(cat .supabase_token)")
        print(f"\n# 获取用户信息:")
        print(f'curl -X GET "{BACKEND_URL}/api/v1/users/me" -H "Authorization: Bearer $TOKEN"')
        print(f"\n# 获取发票列表:")
        print(f'curl -X GET "{BACKEND_URL}/api/v1/invoices/" -H "Authorization: Bearer $TOKEN"')
        print(f"\n# 上传发票:")
        print(f'curl -X POST "{BACKEND_URL}/api/v1/files/upload-invoice" -H "Authorization: Bearer $TOKEN" -F "file=@/path/to/invoice.pdf"')
        
    else:
        print("✗ 获取令牌失败")
        print("\n可能的原因:")
        print("1. 网络连接问题")
        print("2. 用户凭证错误")
        print("3. Supabase服务问题")


if __name__ == "__main__":
    asyncio.run(main())