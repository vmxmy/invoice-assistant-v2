#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
修复版：使用正确的OCR处理端点测试PDF上传
"""

import requests
import os
import json
import time
from pathlib import Path
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

def test_single_pdf_with_ocr(file_path, token, headers):
    """使用正确的OCR端点测试单个PDF文件"""
    try:
        if not os.path.exists(file_path):
            return {
                'status': 'error',
                'file_path': file_path,
                'error': '文件不存在',
                'size': 0
            }
        
        file_size = os.path.getsize(file_path)
        start_time = time.time()
        
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            
            # 使用正确的OCR处理端点
            response = requests.post(
                f'{API_BASE_URL}/api/v1/files/upload',  # 修复：使用包含OCR的端点
                headers=headers,
                files=files,
                timeout=90
            )
        
        process_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            return {
                'status': 'success',
                'file_path': file_path,
                'size': file_size,
                'process_time': process_time,
                'invoice_id': result.get('invoice_id'),
                'filename': result.get('filename'),
                'upload_time': result.get('uploaded_at'),
                'file_id': result.get('file_id')
            }
        else:
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
            
            return {
                'status': 'error',
                'file_path': file_path,
                'size': file_size,
                'process_time': process_time,
                'status_code': response.status_code,
                'error': error_detail
            }
            
    except requests.exceptions.Timeout:
        return {
            'status': 'timeout',
            'file_path': file_path,
            'size': os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            'error': '请求超时(90秒)'
        }
    except Exception as e:
        return {
            'status': 'error',
            'file_path': file_path,
            'size': os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            'error': str(e)
        }

def test_ocr_endpoints():
    """测试正确的OCR端点"""
    print('🚀 === 测试正确的OCR处理端点 ===')
    
    # 1. 获取认证令牌
    print('\n1. 获取认证令牌...')
    token = get_auth_token()
    if not token:
        print('❌ 无法获取认证令牌')
        return
    
    print('✅ 认证成功')
    headers = {'Authorization': f'Bearer {token}'}
    
    # 2. 选择测试文件
    test_files = [
        'downloads/25359134169000052039.pdf',  # 火车票
        'downloads/25432000000031789815.pdf',  # 垂直文本发票
        'downloads/25442000000101203423.pdf',  # 标准发票
    ]
    
    print(f'\n2. 测试3个样本文件使用正确OCR端点...')
    
    results = []
    for i, file_path in enumerate(test_files, 1):
        if not os.path.exists(file_path):
            print(f'❌ 文件不存在: {file_path}')
            continue
            
        relative_path = os.path.basename(file_path)
        print(f'\n📄 [{i}/3] 测试: {relative_path}')
        
        result = test_single_pdf_with_ocr(file_path, token, headers)
        results.append(result)
        
        if result['status'] == 'success':
            print(f'   ✅ 成功 - OCR处理完成 ({result.get("process_time", 0):.1f}s)')
            print(f'   🆔 发票ID: {result.get("invoice_id")}')
            print(f'   📄 文件ID: {result.get("file_id")}')
        elif result['status'] == 'timeout':
            print(f'   ⏰ 超时')
        else:
            print(f'   ❌ 错误: {result.get("error", "Unknown")[:100]}')
    
    # 3. 统计结果
    success_count = len([r for r in results if r['status'] == 'success'])
    error_count = len([r for r in results if r['status'] == 'error'])
    timeout_count = len([r for r in results if r['status'] == 'timeout'])
    
    print(f'\n🎯 === 测试结果 ===')
    print(f'✅ 成功: {success_count}/3')
    print(f'❌ 错误: {error_count}/3')
    print(f'⏰ 超时: {timeout_count}/3')
    
    if success_count > 0:
        print(f'\n🔥 成功使用正确的OCR端点处理了 {success_count} 个文件!')
        print(f'现在可以验证数据库中是否有OCR提取的数据。')
    
    return results

if __name__ == '__main__':
    test_ocr_endpoints()