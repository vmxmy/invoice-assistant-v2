#!/usr/bin/env python3
"""
测试所有downloads目录的PDF文件，使用简化后的API
"""

import os
import json
import time
import requests
from pathlib import Path
from supabase import create_client
from datetime import datetime


def get_auth_token():
    """获取认证令牌"""
    supabase = create_client(
        'https://sfenhhtvcyslxplvewmt.supabase.co', 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
    )
    
    auth_response = supabase.auth.sign_in_with_password({
        'email': 'blueyang@gmail.com',
        'password': 'Xumy8!75'
    })
    
    return auth_response.session.access_token


def test_pdf_file(file_path: Path, token: str, api_url: str):
    """测试单个PDF文件"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/pdf')}
            
            start_time = time.time()
            response = requests.post(api_url, headers=headers, files=files, timeout=60)
            processing_time = time.time() - start_time
            
            return {
                'file_name': file_path.name,
                'file_size': file_path.stat().st_size,
                'status_code': response.status_code,
                'processing_time': processing_time,
                'success': response.status_code == 200,
                'response_data': response.json() if response.status_code == 200 else None,
                'error': response.text if response.status_code != 200 else None
            }
    except Exception as e:
        return {
            'file_name': file_path.name,
            'file_size': file_path.stat().st_size,
            'status_code': 0,
            'processing_time': 0,
            'success': False,
            'response_data': None,
            'error': str(e)
        }


def find_all_pdfs(downloads_dir: Path):
    """递归查找所有PDF文件"""
    pdf_files = []
    for item in downloads_dir.rglob('*.pdf'):
        if item.is_file():
            pdf_files.append(item)
    return sorted(pdf_files)


def main():
    print("🚀 === 测试所有downloads目录PDF文件 ===\n")
    
    # 1. 获取认证令牌
    print("1. 获取认证令牌...")
    try:
        token = get_auth_token()
        print("✅ 认证成功\n")
    except Exception as e:
        print(f"❌ 认证失败: {e}")
        return
    
    # 2. 查找所有PDF文件
    downloads_dir = Path('downloads')
    if not downloads_dir.exists():
        print("❌ downloads目录不存在")
        return
    
    pdf_files = find_all_pdfs(downloads_dir)
    print(f"2. 找到 {len(pdf_files)} 个PDF文件\n")
    
    # 3. 测试每个文件
    api_url = 'http://127.0.0.1:8090/api/v1/files/upload-invoice'
    results = []
    successful = 0
    failed = 0
    
    print("3. 开始测试处理...")
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"   [{i:2d}/{len(pdf_files)}] 测试 {pdf_file.name}")
        
        result = test_pdf_file(pdf_file, token, api_url)
        results.append(result)
        
        if result['success']:
            successful += 1
            # 提取关键信息
            data = result['response_data']
            invoice_number = data.get('invoice_number', 'N/A')
            seller_name = data.get('seller_name', 'N/A')
            amount = data.get('amount', 'N/A')
            print(f"       ✅ 成功 | 发票号: {invoice_number} | 销售方: {seller_name} | 金额: {amount}")
        else:
            failed += 1
            print(f"       ❌ 失败 | 错误: {result['error'][:100] if result['error'] else 'Unknown'}")
        
        # 避免过于频繁的请求
        time.sleep(0.5)
    
    # 4. 生成测试报告
    print(f"\n🎯 === 测试完成 ===")
    print(f"📊 总计: {len(pdf_files)} 个文件")
    print(f"✅ 成功: {successful} 个 ({successful/len(pdf_files)*100:.1f}%)")
    print(f"❌ 失败: {failed} 个 ({failed/len(pdf_files)*100:.1f}%)")
    
    # 计算平均处理时间
    successful_times = [r['processing_time'] for r in results if r['success']]
    if successful_times:
        avg_time = sum(successful_times) / len(successful_times)
        print(f"⏱️  平均处理时间: {avg_time:.2f}秒")
    
    # 5. 保存详细结果
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f'downloads_api_test_{timestamp}.json'
    
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"📝 详细报告已保存到: {report_file}")
    
    # 6. 显示失败的文件
    if failed > 0:
        print(f"\n❌ 失败的文件:")
        for result in results:
            if not result['success']:
                print(f"   - {result['file_name']}: {result['error'][:100] if result['error'] else 'Unknown error'}")


if __name__ == '__main__':
    main()