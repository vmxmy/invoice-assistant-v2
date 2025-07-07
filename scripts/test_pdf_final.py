#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
最终PDF解析API测试 - 显示完整结果
"""

import requests
import os
import json
from supabase import create_client

# Supabase配置
SUPABASE_URL = 'https://sfenhhtvcyslxplvewmt.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

# API配置
API_BASE_URL = "http://127.0.0.1:8090"

def get_auth_token():
    """获取认证令牌"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        email = 'blueyang@gmail.com'
        password = 'Xumy8' + '!' + '75'
        
        auth_response = supabase.auth.sign_in_with_password({
            'email': email,
            'password': password
        })
        
        if auth_response.session:
            return auth_response.session.access_token
        else:
            return None
            
    except Exception as e:
        print(f'登录失败: {e}')
        return None

def test_comprehensive_pdf_api():
    """综合测试PDF解析API"""
    print('🚀 === 综合PDF解析API测试 ===')
    
    # 1. 获取认证令牌
    print('\\n1. 获取认证令牌...')
    token = get_auth_token()
    if not token:
        print('❌ 无法获取认证令牌')
        return
    
    print('✅ 认证成功')
    
    # 2. 测试多个PDF文件
    test_files = [
        {
            'file': 'downloads/25359134169000052039.pdf',
            'name': '火车票'
        },
        {
            'file': 'downloads/25432000000031789815.pdf', 
            'name': '垂直文本发票'
        },
        {
            'file': 'downloads/25442000000101203423.pdf',
            'name': '标准发票'
        }
    ]
    
    headers = {'Authorization': f'Bearer {token}'}
    
    print(f'\\n2. 测试PDF解析...')
    
    for i, test_case in enumerate(test_files, 1):
        file_path = test_case['file']
        file_name = test_case['name']
        
        if not os.path.exists(file_path):
            print(f'❌ {i}. {file_name}: 文件不存在')
            continue
        
        print(f'\\n📄 {i}. 测试 {file_name}')
        print(f'   文件: {os.path.basename(file_path)}')
        
        try:
            with open(file_path, 'rb') as f:
                files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
                response = requests.post(
                    f'{API_BASE_URL}/api/v1/files/upload-invoice',
                    headers=headers,
                    files=files,
                    timeout=30
                )
            
            print(f'   响应状态: {response.status_code}')
            
            if response.status_code == 200:
                result = response.json()
                print('   ✅ 解析成功!')
                
                # 显示关键信息
                print(f'   📄 文件ID: {result.get("file_id")}')
                print(f'   📁 文件名: {result.get("filename")}')
                print(f'   📏 文件大小: {result.get("file_size")} bytes')
                print(f'   🆔 发票ID: {result.get("invoice_id")}')
                print(f'   🕐 上传时间: {result.get("uploaded_at")}')
                
            else:
                print(f'   ❌ 解析失败: {response.status_code}')
                try:
                    error = response.json()
                    print(f'   错误: {error}')
                except:
                    print(f'   错误内容: {response.text}')
                    
        except Exception as e:
            print(f'   ❌ 异常: {e}')
    
    # 3. 测试发票列表
    print(f'\\n3. 测试发票列表...')
    try:
        response = requests.get(f'{API_BASE_URL}/api/v1/invoices/', headers=headers)
        print(f'发票列表状态: {response.status_code}')
        
        if response.status_code == 200:
            result = response.json()
            invoices = result.get('invoices', [])
            total = result.get('total', 0)
            
            print(f'✅ 发票总数: {total}')
            print(f'📋 当前页: {len(invoices)} 条')
            
            # 显示最近的几个发票
            print(f'\\n📄 最近的发票:')
            for i, invoice in enumerate(invoices[:5], 1):
                print(f'   {i}. {invoice.get("invoice_number")} - {invoice.get("seller_name")} - ¥{invoice.get("total_amount")}')
                print(f'      日期: {invoice.get("invoice_date")} | 状态: {invoice.get("status")}')
        else:
            print(f'❌ 获取发票列表失败: {response.text}')
            
    except Exception as e:
        print(f'❌ 发票列表异常: {e}')
    
    print(f'\\n🎯 === 测试完成 ===')

if __name__ == '__main__':
    test_comprehensive_pdf_api()