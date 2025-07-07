#!/usr/bin/env python3
"""
测试发票上传和OCR处理的完整流程
"""

import asyncio
import json
import jwt
import requests
import time
from pathlib import Path

# 测试配置
BASE_URL = "http://localhost:8090"
API_PREFIX = "/api/v1"
TEST_PDF = "downloads/25359134169000052039.pdf"
TIMEOUT = 120  # 2分钟超时，因为OCR处理需要时间

def create_test_token():
    """创建测试用的JWT token"""
    payload = {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "test@example.com",
        "role": "authenticated", 
        "aud": "authenticated",
        "exp": int(time.time()) + 3600  # 1小时过期
    }
    
    # 使用Supabase JWT密钥
    secret = "yHxlqeLo2KTzkvNoqC0EAgGw+sDPi5bEwcCe3iiCyEQvlaG0hv6ufYb1eq54NE6X3RROiARlplnEwBLyzqfZrw=="
    token = jwt.encode(payload, secret, algorithm="HS256")
    return token

def test_invoice_upload():
    """测试发票上传功能"""
    
    print("🧪 开始测试发票上传和OCR处理...")
    print(f"📁 测试文件: {TEST_PDF}")
    
    # 检查文件是否存在
    if not Path(TEST_PDF).exists():
        print("❌ 测试文件不存在")
        return
    
    file_size = Path(TEST_PDF).stat().st_size
    print(f"📏 文件大小: {file_size / 1024:.2f} KB")
    
    # 创建测试token
    token = create_test_token()
    print(f"🔑 测试Token: {token[:50]}...")
    
    # 准备请求
    url = f"{BASE_URL}{API_PREFIX}/files/upload"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # 测试认证端点
    print(f"\n1️⃣ 测试认证状态...")
    try:
        auth_response = requests.get(f"{BASE_URL}{API_PREFIX}/auth/status", headers=headers, timeout=10)
        print(f"认证状态: {auth_response.status_code}")
        if auth_response.status_code == 200:
            auth_data = auth_response.json()
            print(f"认证结果: {json.dumps(auth_data, indent=2, ensure_ascii=False)}")
        else:
            print(f"认证失败: {auth_response.text}")
    except Exception as e:
        print(f"认证请求失败: {e}")
    
    # 上传文件
    print(f"\n2️⃣ 上传文件进行OCR处理...")
    print(f"POST {url}")
    
    try:
        with open(TEST_PDF, 'rb') as f:
            files = {
                'file': (Path(TEST_PDF).name, f, 'application/pdf')
            }
            data = {
                'create_invoice': 'true'
            }
            
            print("📤 发送请求...")
            start_time = time.time()
            
            response = requests.post(
                url,
                files=files,
                data=data,
                headers=headers,
                timeout=TIMEOUT
            )
            
            end_time = time.time()
            process_time = end_time - start_time
            
            print(f"⏱️ 处理时间: {process_time:.2f} 秒")
            print(f"📊 响应状态码: {response.status_code}")
            print(f"📋 响应头: {dict(response.headers)}")
            
            if response.status_code == 200:
                print("\n✅ 上传成功!")
                result = response.json()
                print("📄 完整响应内容:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
                # 如果返回了invoice_id，获取详细信息
                if 'invoice_id' in result:
                    invoice_id = result['invoice_id']
                    print(f"\n3️⃣ 获取发票详情 (ID: {invoice_id})...")
                    
                    detail_response = requests.get(
                        f"{BASE_URL}{API_PREFIX}/invoices/{invoice_id}",
                        headers=headers,
                        timeout=30
                    )
                    
                    print(f"📊 详情查询状态: {detail_response.status_code}")
                    if detail_response.status_code == 200:
                        detail_data = detail_response.json()
                        print("📋 发票详情:")
                        print(json.dumps(detail_data, indent=2, ensure_ascii=False))
                    else:
                        print(f"❌ 详情查询失败: {detail_response.text}")
                
                return result
                
            else:
                print(f"\n❌ 上传失败!")
                print(f"错误内容: {response.text}")
                
                try:
                    error_data = response.json()
                    print(f"错误详情: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
                except:
                    pass
                
                return None
                
    except requests.exceptions.Timeout:
        print(f"❌ 请求超时 (>{TIMEOUT}秒)")
        return None
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    test_invoice_upload()