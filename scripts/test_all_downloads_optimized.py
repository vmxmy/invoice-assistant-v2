#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
优化版：测试downloads/目录下所有PDF文件
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
        start_time = time.time()
        
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            response = requests.post(
                f'{API_BASE_URL}/api/v1/files/upload-invoice',
                headers=headers,
                files=files,
                timeout=90  # 增加到90秒超时
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

def test_all_downloads_pdfs():
    """测试downloads目录下所有PDF文件"""
    print('🚀 === 测试downloads/所有PDF文件 (优化版) ===')
    
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
    print(f'   ⏱️  预估总时间: ~{total_files * 3.2:.0f}秒 ({total_files * 3.2 / 60:.1f}分钟)')
    
    results = []
    success_count = 0
    error_count = 0
    timeout_count = 0
    
    start_time = time.time()
    
    for i, file_path in enumerate(pdf_files, 1):
        relative_path = os.path.relpath(file_path, downloads_dir)
        
        # 简化输出，只显示关键信息
        if i % 10 == 1:  # 每10个显示一次详细信息
            print(f'\n📄 [{i:2d}/{total_files}] {relative_path}')
        
        result = test_single_pdf(file_path, token, headers)
        results.append(result)
        
        if result['status'] == 'success':
            success_count += 1
            if i % 10 == 1:
                print(f'   ✅ 成功 ({result.get("process_time", 0):.1f}s)')
        elif result['status'] == 'timeout':
            timeout_count += 1
            if i % 10 == 1 or True:  # 总是显示超时
                print(f'   ⏰ 超时 - {relative_path}')
        else:
            error_count += 1
            if i % 10 == 1 or True:  # 总是显示错误
                print(f'   ❌ 错误 - {relative_path}: {result.get("error", "Unknown")[:50]}')
        
        # 每10个文件显示进度
        if i % 10 == 0:
            elapsed = time.time() - start_time
            avg_time = elapsed / i
            remaining = (total_files - i) * avg_time
            success_rate = success_count / i * 100
            print(f'   📊 进度: {i}/{total_files} ({i/total_files*100:.1f}%) | 成功率: {success_rate:.1f}% | 剩余: {remaining/60:.1f}分钟')
    
    # 4. 最终统计
    total_time = time.time() - start_time
    print(f'\n🎯 === 处理完成 ===')
    print(f'📊 总文件数: {total_files}')
    print(f'✅ 成功: {success_count} ({success_count/total_files*100:.1f}%)')
    print(f'⏰ 超时: {timeout_count} ({timeout_count/total_files*100:.1f}%)')
    print(f'❌ 其他错误: {error_count} ({error_count/total_files*100:.1f}%)')
    print(f'⏱️  总用时: {total_time/60:.1f}分钟 (平均: {total_time/total_files:.2f}秒/文件)')
    
    # 5. 性能统计
    successful_results = [r for r in results if r['status'] == 'success']
    if successful_results:
        avg_time = sum(r.get('process_time', 0) for r in successful_results) / len(successful_results)
        total_size = sum(r.get('size', 0) for r in successful_results) / (1024 * 1024)  # MB
        print(f'💾 成功文件统计:')
        print(f'   平均处理时间: {avg_time:.2f}秒')
        print(f'   总大小: {total_size:.2f} MB')
        print(f'   处理速度: {total_size/(total_time/60):.2f} MB/分钟')
    
    # 6. 错误汇总
    error_results = [r for r in results if r['status'] in ['error', 'timeout']]
    if error_results:
        print(f'\n❌ 失败文件汇总 ({len(error_results)}个):')
        
        # 按错误类型分组
        timeouts = [r for r in error_results if r['status'] == 'timeout']
        errors = [r for r in error_results if r['status'] == 'error']
        
        if timeouts:
            print(f'   ⏰ 超时文件 ({len(timeouts)}个):')
            for r in timeouts[:5]:  # 只显示前5个
                print(f'      - {os.path.basename(r["file_path"])}')
            if len(timeouts) > 5:
                print(f'      ... 还有{len(timeouts)-5}个')
        
        if errors:
            print(f'   💥 错误文件 ({len(errors)}个):')
            error_types = {}
            for r in errors:
                error_key = str(r.get('error', 'Unknown'))[:30]
                error_types[error_key] = error_types.get(error_key, 0) + 1
            
            for error_type, count in error_types.items():
                print(f'      - {error_type}: {count}个')
    
    # 7. 保存结果
    result_file = f'downloads_api_test_{time.strftime("%Y%m%d_%H%M%S")}.json'
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': total_files,
                'success_count': success_count,
                'timeout_count': timeout_count,
                'error_count': error_count,
                'success_rate': success_count / total_files * 100,
                'total_time_minutes': total_time / 60,
                'avg_time_per_file': total_time / total_files,
                'total_size_mb': sum(r.get('size', 0) for r in results) / (1024 * 1024)
            },
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f'\n📄 详细结果已保存到: {result_file}')
    
    return {
        'total': total_files,
        'success': success_count,
        'timeout': timeout_count,
        'error': error_count,
        'success_rate': success_count / total_files * 100
    }

if __name__ == '__main__':
    test_all_downloads_pdfs()