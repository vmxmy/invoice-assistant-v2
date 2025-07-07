#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试downloads/目录下所有PDF文件通过API处理
包含子目录
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

def find_all_pdfs(base_dir):
    """递归查找所有PDF文件"""
    pdf_files = []
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    return sorted(pdf_files)

def test_single_pdf(file_path, token, headers):
    """测试单个PDF文件"""
    try:
        if not os.path.exists(file_path):
            return {
                'status': 'error',
                'file_path': file_path,
                'error': '文件不存在',
                'size': 0
            }
        
        file_size = os.path.getsize(file_path)
        
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            response = requests.post(
                f'{API_BASE_URL}/api/v1/files/upload-invoice',
                headers=headers,
                files=files,
                timeout=30
            )
        
        if response.status_code == 200:
            result = response.json()
            return {
                'status': 'success',
                'file_path': file_path,
                'size': file_size,
                'invoice_id': result.get('invoice_id'),
                'filename': result.get('filename'),
                'upload_time': result.get('uploaded_at')
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
                'status_code': response.status_code,
                'error': error_detail
            }
            
    except Exception as e:
        return {
            'status': 'error',
            'file_path': file_path,
            'size': os.path.getsize(file_path) if os.path.exists(file_path) else 0,
            'error': str(e)
        }

def test_all_downloads_pdfs():
    """测试downloads目录下所有PDF文件"""
    print('🚀 === 测试downloads/所有PDF文件 ===')
    
    # 1. 获取认证令牌
    print('\n1. 获取认证令牌...')
    token = get_auth_token()
    if not token:
        print('❌ 无法获取认证令牌')
        return
    
    print('✅ 认证成功')
    headers = {'Authorization': f'Bearer {token}'}
    
    # 2. 查找所有PDF文件
    print('\n2. 查找downloads/目录下所有PDF文件...')
    downloads_dir = 'downloads'
    if not os.path.exists(downloads_dir):
        print(f'❌ 目录不存在: {downloads_dir}')
        return
    
    pdf_files = find_all_pdfs(downloads_dir)
    total_files = len(pdf_files)
    print(f'📄 找到 {total_files} 个PDF文件')
    
    if total_files == 0:
        print('❌ 没有找到PDF文件')
        return
    
    # 3. 处理所有PDF文件
    print(f'\n3. 开始处理 {total_files} 个PDF文件...')
    
    results = []
    success_count = 0
    error_count = 0
    
    start_time = time.time()
    
    for i, file_path in enumerate(pdf_files, 1):
        relative_path = os.path.relpath(file_path, downloads_dir)
        print(f'\n📄 [{i}/{total_files}] 处理: {relative_path}')
        
        result = test_single_pdf(file_path, token, headers)
        results.append(result)
        
        if result['status'] == 'success':
            success_count += 1
            print(f'   ✅ 成功 - 发票ID: {result.get("invoice_id", "Unknown")}')
        else:
            error_count += 1
            print(f'   ❌ 失败 - {result.get("error", "Unknown error")}')
        
        # 显示进度
        if i % 10 == 0 or i == total_files:
            elapsed = time.time() - start_time
            avg_time = elapsed / i
            remaining = (total_files - i) * avg_time
            print(f'   📊 进度: {i}/{total_files} ({i/total_files*100:.1f}%) - 预计剩余: {remaining:.1f}秒')
    
    # 4. 统计结果
    total_time = time.time() - start_time
    print(f'\n🎯 === 处理完成 ===')
    print(f'📊 总文件数: {total_files}')
    print(f'✅ 成功: {success_count} ({success_count/total_files*100:.1f}%)')
    print(f'❌ 失败: {error_count} ({error_count/total_files*100:.1f}%)')
    print(f'⏱️  总用时: {total_time:.1f}秒 (平均: {total_time/total_files:.2f}秒/文件)')
    
    # 5. 详细错误报告
    if error_count > 0:
        print(f'\n📋 失败文件详情:')
        for i, result in enumerate([r for r in results if r['status'] == 'error'], 1):
            print(f'{i}. {os.path.relpath(result["file_path"], downloads_dir)}')
            print(f'   错误: {result.get("error", "Unknown")}')
            if 'status_code' in result:
                print(f'   状态码: {result["status_code"]}')
    
    # 6. 按大小统计
    total_size = sum(r.get('size', 0) for r in results) / (1024 * 1024)  # MB
    successful_size = sum(r.get('size', 0) for r in results if r['status'] == 'success') / (1024 * 1024)
    print(f'\n💾 文件大小统计:')
    print(f'总大小: {total_size:.2f} MB')
    print(f'成功处理: {successful_size:.2f} MB ({successful_size/total_size*100:.1f}%)')
    
    # 7. 保存结果
    result_file = f'downloads_api_test_results_{time.strftime("%Y%m%d_%H%M%S")}.json'
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': total_files,
                'success_count': success_count,
                'error_count': error_count,
                'success_rate': success_count / total_files * 100,
                'total_time': total_time,
                'avg_time_per_file': total_time / total_files,
                'total_size_mb': total_size,
                'successful_size_mb': successful_size
            },
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f'📄 详细结果已保存到: {result_file}')

if __name__ == '__main__':
    test_all_downloads_pdfs()