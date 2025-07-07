#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试PDF解析API - 使用Supabase认证
"""

import asyncio
import requests
import os
from supabase import create_client, Client
import json

# Supabase配置
SUPABASE_URL = "https://sfenhhtvcyslxplvewmt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"

# API配置
API_BASE_URL = "http://127.0.0.1:8090"

def get_test_users():
    """获取Supabase中的测试用户"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 查询现有用户
        response = supabase.table("profiles").select("*").limit(5).execute()
        
        print("=== Supabase 测试用户 ===")
        if response.data:
            for user in response.data:
                print(f"用户ID: {user.get('auth_user_id')}")
                print(f"显示名: {user.get('display_name', 'N/A')}")
                print(f"创建时间: {user.get('created_at')}")
                print("-" * 40)
        else:
            print("未找到用户")
            
        return response.data
        
    except Exception as e:
        print(f"获取用户失败: {e}")
        return []

def create_test_user():
    """创建测试用户"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 创建新用户
        email = "test-pdf@example.com"
        password = "test123456"
        
        print(f"创建测试用户: {email}")
        
        # 注册用户
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "display_name": "PDF测试用户"
                }
            }
        })
        
        if auth_response.user:
            print(f"✅ 用户创建成功:")
            print(f"   用户ID: {auth_response.user.id}")
            print(f"   邮箱: {auth_response.user.email}")
            print(f"   Access Token: {auth_response.session.access_token[:50]}...")
            return auth_response.user, auth_response.session.access_token
        else:
            print(f"❌ 用户创建失败")
            return None, None
            
    except Exception as e:
        print(f"创建用户失败: {e}")
        return None, None

def login_test_user():
    """登录测试用户"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        email = "test-pdf@example.com"
        password = "test123456"
        
        print(f"登录测试用户: {email}")
        
        # 登录
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if auth_response.user and auth_response.session:
            print(f"✅ 登录成功:")
            print(f"   用户ID: {auth_response.user.id}")
            print(f"   邮箱: {auth_response.user.email}")
            print(f"   Access Token: {auth_response.session.access_token[:50]}...")
            return auth_response.user, auth_response.session.access_token
        else:
            print(f"❌ 登录失败")
            return None, None
            
    except Exception as e:
        print(f"登录失败: {e}")
        # 如果用户不存在，尝试创建
        print("尝试创建新用户...")
        return create_test_user()

def test_pdf_api(access_token: str, pdf_file: str):
    """测试PDF解析API"""
    
    print(f"\n=== 测试PDF解析API ===")
    print(f"PDF文件: {pdf_file}")
    print(f"Token: {access_token[:50]}...")
    
    # 检查文件是否存在
    if not os.path.exists(pdf_file):
        print(f"❌ 文件不存在: {pdf_file}")
        return False
    
    # 准备请求
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    files = {
        'file': open(pdf_file, 'rb')
    }
    
    try:
        # 上传发票文件
        url = f"{API_BASE_URL}/api/v1/files/upload-invoice"
        print(f"请求URL: {url}")
        
        response = requests.post(url, headers=headers, files=files)
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ PDF解析成功!")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"❌ PDF解析失败:")
            print(f"   状态码: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   错误详情: {json.dumps(error_detail, indent=2, ensure_ascii=False)}")
            except:
                print(f"   错误内容: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ API请求异常: {e}")
        return False
    finally:
        files['file'].close()

def test_health_check():
    """测试健康检查"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=10)
        print(f"健康检查状态: {response.status_code}")
        if response.status_code == 200:
            print(f"健康检查结果: {response.json()}")
            return True
        else:
            print(f"健康检查失败: {response.text}")
            return False
    except Exception as e:
        print(f"健康检查异常: {e}")
        return False

def main():
    """主函数"""
    print("=== PDF解析API测试 ===")
    
    # 1. 健康检查
    print("\n1. 健康检查...")
    if not test_health_check():
        print("❌ 服务不可用")
        return
    
    # 2. 查看现有用户
    print("\n2. 查看现有用户...")
    users = get_test_users()
    
    # 3. 登录或创建测试用户
    print("\n3. 用户认证...")
    user, access_token = login_test_user()
    
    if not access_token:
        print("❌ 无法获取访问令牌")
        return
    
    # 4. 测试PDF文件
    test_files = [
        "downloads/25359134169000052039.pdf",  # 火车票
        "downloads/25432000000031789815.pdf",  # 垂直文本
        "downloads/25442000000101203423.pdf",  # 标准发票
    ]
    
    success_count = 0
    total_count = 0
    
    for pdf_file in test_files:
        if os.path.exists(pdf_file):
            total_count += 1
            print(f"\n4.{total_count} 测试文件: {os.path.basename(pdf_file)}")
            if test_pdf_api(access_token, pdf_file):
                success_count += 1
            print("-" * 60)
    
    # 5. 总结
    print(f"\n=== 测试总结 ===")
    print(f"总文件数: {total_count}")
    print(f"成功数量: {success_count}")
    print(f"成功率: {success_count/total_count*100:.1f}%" if total_count > 0 else "0%")

if __name__ == "__main__":
    main()