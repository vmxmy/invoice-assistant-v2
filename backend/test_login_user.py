#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试用户登录并获取访问令牌
"""

from supabase import create_client
import requests
import os

# Supabase配置
SUPABASE_URL = 'https://sfenhhtvcyslxplvewmt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

# API配置
API_BASE_URL = "http://127.0.0.1:8090"

def login_and_get_token():
    """登录并获取访问令牌"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # 用户凭据
        email = 'blueyang@gmail.com'
        password = 'Xumy8' + '!' + '75'  # 拼接避免转义问题
        
        print(f'尝试登录用户: {email}')
        print(f'密码: {password}')
        
        # 登录
        auth_response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        
        if auth_response.session and auth_response.user:
            print(f'✅ 登录成功!')
            print(f'用户ID: {auth_response.user.id}')
            print(f'用户邮箱: {auth_response.user.email}')
            print(f'访问令牌: {auth_response.session.access_token[:50]}...')
            
            return auth_response.session.access_token, auth_response.user.id
        else:
            print('❌ 登录失败，未获得有效会话')
            return None, None
            
    except Exception as e:
        print(f'❌ 登录异常: {e}')
        return None, None

def test_api_with_token(token: str):
    """使用令牌测试API"""
    print(f'\n=== 测试API访问 ===')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        # 测试认证状态
        response = requests.get(f'{API_BASE_URL}/api/v1/auth/status', headers=headers)
        print(f'认证状态: {response.status_code}')
        print(f'认证结果: {response.json()}')
        
        if response.status_code == 200:
            auth_result = response.json()
            if auth_result.get('authenticated'):
                print('✅ 认证成功!')
                return True
            else:
                print('❌ 认证失败 - 令牌无效')
                return False
        else:
            print(f'❌ API调用失败: {response.text}')
            return False
            
    except Exception as e:
        print(f'❌ API测试异常: {e}')
        return False

def test_pdf_upload(token: str, pdf_file: str):
    """测试PDF上传"""
    if not os.path.exists(pdf_file):
        print(f'❌ 文件不存在: {pdf_file}')
        return False
    
    print(f'\n=== 测试PDF上传 ===')
    print(f'文件: {pdf_file}')
    
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        with open(pdf_file, 'rb') as f:
            files = {'file': (os.path.basename(pdf_file), f, 'application/pdf')}
            response = requests.post(
                f'{API_BASE_URL}/api/v1/files/upload-invoice',
                headers=headers,
                files=files,
                timeout=30
            )
        
        print(f'响应状态码: {response.status_code}')
        
        if response.status_code == 200:
            result = response.json()
            print('✅ PDF上传成功!')
            
            # 显示关键信息
            if 'invoice_data' in result:
                invoice = result['invoice_data']
                print(f"  发票号码: {invoice.get('invoice_number')}")
                print(f"  开票日期: {invoice.get('invoice_date')}")
                print(f"  买方: {invoice.get('buyer_name')}")
                print(f"  卖方: {invoice.get('seller_name')}")
                print(f"  金额: ¥{invoice.get('total_amount')}")
            
            return True
        else:
            print(f'❌ PDF上传失败: {response.status_code}')
            try:
                error = response.json()
                print(f'错误详情: {error}')
            except:
                print(f'错误内容: {response.text}')
            return False
            
    except Exception as e:
        print(f'❌ PDF上传异常: {e}')
        return False

def main():
    """主函数"""
    print('🚀 === 用户登录和PDF解析测试 ===')
    
    # 1. 登录获取令牌
    token, user_id = login_and_get_token()
    if not token:
        print('❌ 无法获取访问令牌，退出测试')
        return
    
    # 2. 测试API认证
    if not test_api_with_token(token):
        print('❌ API认证失败，退出测试')
        return
    
    # 3. 测试PDF上传
    test_files = [
        'downloads/25359134169000052039.pdf',  # 火车票
        'downloads/25432000000031789815.pdf',  # 垂直文本
    ]
    
    success_count = 0
    for pdf_file in test_files:
        if os.path.exists(pdf_file):
            if test_pdf_upload(token, pdf_file):
                success_count += 1
            print('-' * 50)
    
    print(f'\n🎯 测试完成 - 成功上传 {success_count} 个文件')

if __name__ == '__main__':
    main()