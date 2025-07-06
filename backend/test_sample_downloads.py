#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试downloads/目录下少量PDF文件以检查超时原因
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

def test_single_pdf_with_timing(file_path, token, headers):
    """测试单个PDF文件并记录详细时间"""
    try:
        if not os.path.exists(file_path):
            return {
                'status': 'error',
                'file_path': file_path,
                'error': '文件不存在',
                'size': 0
            }
        
        file_size = os.path.getsize(file_path)
        print(f'   📏 文件大小: {file_size / 1024:.1f} KB')
        
        # 记录开始时间
        start_time = time.time()
        
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            
            # 记录请求开始时间
            request_start = time.time()
            print(f'   📤 开始上传请求...')
            
            response = requests.post(
                f'{API_BASE_URL}/api/v1/files/upload-invoice',
                headers=headers,
                files=files,
                timeout=60  # 增加超时时间到60秒
            )
            
            request_time = time.time() - request_start
            print(f'   ⏱️  请求响应时间: {request_time:.2f}秒')
        
        total_time = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            print(f'   ✅ 成功 - 总用时: {total_time:.2f}秒')
            return {
                'status': 'success',
                'file_path': file_path,
                'size': file_size,
                'request_time': request_time,
                'total_time': total_time,
                'invoice_id': result.get('invoice_id'),
                'filename': result.get('filename')
            }
        else:
            print(f'   ❌ 失败 (状态码: {response.status_code}) - 用时: {total_time:.2f}秒')
            try:
                error_detail = response.json()
            except:
                error_detail = response.text
            
            return {
                'status': 'error',
                'file_path': file_path,
                'size': file_size,
                'request_time': request_time,
                'total_time': total_time,
                'status_code': response.status_code,
                'error': error_detail
            }
            
    except requests.exceptions.Timeout:
        print(f'   ⏰ 请求超时')
        return {
            'status': 'timeout',
            'file_path': file_path,
            'size': file_size,
            'error': '请求超时'
        }
    except Exception as e:
        print(f'   💥 异常: {e}')
        return {
            'status': 'error',
            'file_path': file_path,
            'size': os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            'error': str(e)
        }

def test_sample_downloads():
    """测试sample PDF文件"""
    print('🚀 === 测试downloads/样本PDF文件 (检查超时原因) ===')
    
    # 1. 获取认证令牌
    print('\n1. 获取认证令牌...')
    token = get_auth_token()
    if not token:
        print('❌ 无法获取认证令牌')
        return
    
    print('✅ 认证成功')
    headers = {'Authorization': f'Bearer {token}'}
    
    # 2. 选择测试文件（取前5个PDF文件）
    downloads_dir = 'downloads'
    if not os.path.exists(downloads_dir):
        print(f'❌ 目录不存在: {downloads_dir}')
        return
    
    # 找到所有PDF文件并取前5个
    pdf_files = []
    for root, dirs, files in os.walk(downloads_dir):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    pdf_files = sorted(pdf_files)[:5]  # 只取前5个
    total_files = len(pdf_files)
    print(f'📄 测试文件数: {total_files}')
    
    if total_files == 0:
        print('❌ 没有找到PDF文件')
        return
    
    # 3. 逐个处理并记录详细时间
    print(f'\n3. 开始详细测试...')
    
    results = []
    
    for i, file_path in enumerate(pdf_files, 1):
        relative_path = os.path.relpath(file_path, downloads_dir)
        print(f'\n📄 [{i}/{total_files}] 测试: {relative_path}')
        
        result = test_single_pdf_with_timing(file_path, token, headers)
        results.append(result)
        
        # 等待1秒避免并发问题
        if i < total_files:
            print('   ⏸️  等待1秒...')
            time.sleep(1)
    
    # 4. 总结
    print(f'\n🎯 === 测试总结 ===')
    success_count = len([r for r in results if r['status'] == 'success'])
    timeout_count = len([r for r in results if r['status'] == 'timeout'])
    error_count = len([r for r in results if r['status'] == 'error'])
    
    print(f'✅ 成功: {success_count}/{total_files}')
    print(f'⏰ 超时: {timeout_count}/{total_files}')
    print(f'❌ 错误: {error_count}/{total_files}')
    
    # 5. 时间分析
    successful_results = [r for r in results if r['status'] == 'success']
    if successful_results:
        avg_request_time = sum(r.get('request_time', 0) for r in successful_results) / len(successful_results)
        avg_total_time = sum(r.get('total_time', 0) for r in successful_results) / len(successful_results)
        print(f'\n⏱️  平均时间分析:')
        print(f'   请求时间: {avg_request_time:.2f}秒')
        print(f'   总处理时间: {avg_total_time:.2f}秒')
        
        # 预估91个文件的总时间
        estimated_total = avg_total_time * 91
        print(f'   预估91个文件总时间: {estimated_total:.1f}秒 ({estimated_total/60:.1f}分钟)')
    
    # 6. 错误详情
    error_results = [r for r in results if r['status'] in ['error', 'timeout']]
    if error_results:
        print(f'\n❌ 错误详情:')
        for result in error_results:
            print(f'   {os.path.basename(result["file_path"])}: {result.get("error", "Unknown")}')

if __name__ == '__main__':
    test_sample_downloads()