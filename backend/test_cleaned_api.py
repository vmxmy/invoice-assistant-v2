#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试清理后的API端点
"""

import requests
import os
import json
import time
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

def test_cleaned_api():
    """测试清理后的API"""
    print('🚀 === 测试清理后的API端点 ===')
    
    # 1. 获取认证令牌
    print('\n1. 获取认证令牌...')
    token = get_auth_token()
    if not token:
        print('❌ 无法获取认证令牌')
        return
    
    print('✅ 认证成功')
    headers = {'Authorization': f'Bearer {token}'}
    
    # 2. 测试单个文件
    test_file = 'downloads/25359134169000052039.pdf'  # 火车票
    
    if not os.path.exists(test_file):
        print(f'❌ 测试文件不存在: {test_file}')
        return
    
    print(f'\n2. 测试文件上传和OCR处理...')
    print(f'   文件: {os.path.basename(test_file)}')
    print(f'   大小: {os.path.getsize(test_file) / 1024:.1f} KB')
    
    start_time = time.time()
    
    try:
        with open(test_file, 'rb') as f:
            files = {'file': (os.path.basename(test_file), f, 'application/pdf')}
            
            # 使用清理后的统一端点
            response = requests.post(
                f'{API_BASE_URL}/api/v1/files/upload-invoice',
                headers=headers,
                files=files,
                timeout=90
            )
        
        process_time = time.time() - start_time
        
        print(f'\n3. 处理结果:')
        print(f'   响应状态: {response.status_code}')
        print(f'   处理时间: {process_time:.2f}秒')
        
        if response.status_code == 200:
            result = response.json()
            print(f'   ✅ 上传成功!')
            print(f'   🆔 发票ID: {result.get("invoice_id")}')
            print(f'   📄 文件名: {result.get("filename")}')
            print(f'   📁 文件路径: {result.get("file_path")}')
            print(f'   💾 文件大小: {result.get("file_size")} bytes')
            print(f'   🕐 上传时间: {result.get("uploaded_at")}')
            
            # 检查是否包含OCR数据（通过文件ID）
            file_id = result.get('file_id')
            invoice_id = result.get('invoice_id')
            
            if invoice_id and file_id:
                print(f'\n4. 验证OCR处理是否成功...')
                # 等待几秒让OCR处理完成
                time.sleep(3)
                
                # 查询发票详情
                detail_response = requests.get(
                    f'{API_BASE_URL}/api/v1/invoices/{invoice_id}',
                    headers=headers
                )
                
                if detail_response.status_code == 200:
                    invoice_detail = detail_response.json()
                    seller_name = invoice_detail.get('seller_name')
                    total_amount = invoice_detail.get('total_amount')
                    status = invoice_detail.get('status')
                    processing_status = invoice_detail.get('processing_status')
                    
                    print(f'   📊 发票状态: {status}')
                    print(f'   🔄 处理状态: {processing_status}')
                    print(f'   🏢 销售方: {seller_name or "未提取"}')
                    print(f'   💰 金额: ¥{total_amount}')
                    
                    if seller_name and seller_name != "null" and float(total_amount or 0) > 0:
                        print(f'   🎉 OCR数据提取成功!')
                        return True
                    else:
                        print(f'   ⚠️  OCR数据未提取或提取失败')
                        return False
                else:
                    print(f'   ❌ 无法获取发票详情: {detail_response.status_code}')
                    return False
            else:
                print(f'   ⚠️  响应中缺少必要的ID信息')
                return False
        else:
            print(f'   ❌ 上传失败')
            try:
                error = response.json()
                print(f'   错误: {error}')
            except:
                print(f'   错误内容: {response.text}')
            return False
            
    except Exception as e:
        print(f'   💥 异常: {e}')
        return False

if __name__ == '__main__':
    success = test_cleaned_api()
    if success:
        print(f'\n🎯 === 测试成功 ===')
        print(f'清理后的API端点工作正常，包含完整的OCR处理功能！')
    else:
        print(f'\n❌ === 测试失败 ===')
        print(f'需要进一步调试API或OCR集成问题。')