#!/usr/bin/env python3
"""
测试部分downloads目录的PDF文件，使用简化后的API
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


def get_invoice_details(invoice_id: str, token: str):
    """获取发票详细信息"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    try:
        response = requests.get(f'http://127.0.0.1:8090/api/v1/invoices/{invoice_id}', headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        return None
    except Exception:
        return None


def test_pdf_file(file_path: Path, token: str, api_url: str):
    """测试单个PDF文件"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/pdf')}
            
            start_time = time.time()
            response = requests.post(api_url, headers=headers, files=files, timeout=30)
            processing_time = time.time() - start_time
            
            result = {
                'file_name': file_path.name,
                'file_size': file_path.stat().st_size,
                'status_code': response.status_code,
                'processing_time': processing_time,
                'success': response.status_code == 200,
                'response_data': response.json() if response.status_code == 200 else None,
                'error': response.text if response.status_code != 200 else None,
                'invoice_details': None
            }
            
            # 如果上传成功，获取发票详细信息
            if result['success'] and result['response_data']:
                invoice_id = result['response_data'].get('invoice_id')
                if invoice_id:
                    result['invoice_details'] = get_invoice_details(invoice_id, token)
            
            return result
            
    except Exception as e:
        return {
            'file_name': file_path.name,
            'file_size': file_path.stat().st_size,
            'status_code': 0,
            'processing_time': 0,
            'success': False,
            'response_data': None,
            'error': str(e),
            'invoice_details': None
        }


def main():
    print("🚀 === 测试部分downloads目录PDF文件 ===\n")
    
    # 1. 获取认证令牌
    print("1. 获取认证令牌...")
    try:
        token = get_auth_token()
        print("✅ 认证成功\n")
    except Exception as e:
        print(f"❌ 认证失败: {e}")
        return
    
    # 2. 选择测试文件（根目录下的PDF文件，不包括子目录）
    downloads_dir = Path('downloads')
    if not downloads_dir.exists():
        print("❌ downloads目录不存在")
        return
    
    # 只测试根目录下的PDF文件
    pdf_files = []
    for item in downloads_dir.iterdir():
        if item.is_file() and item.suffix.lower() == '.pdf':
            pdf_files.append(item)
    
    pdf_files = sorted(pdf_files)
    print(f"2. 找到 {len(pdf_files)} 个PDF文件（仅根目录）\n")
    
    # 3. 测试每个文件
    api_url = 'http://127.0.0.1:8090/api/v1/files/upload-invoice'
    results = []
    successful = 0
    failed = 0
    
    print("3. 开始测试处理...")
    print("-" * 80)
    
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"\n📄 [{i:2d}/{len(pdf_files)}] 处理文件: {pdf_file.name}")
        print(f"   📦 文件大小: {pdf_file.stat().st_size / 1024:.1f} KB")
        
        # 实时显示处理状态
        try:
            print("   🔄 正在上传和处理...", end="", flush=True)
        except BrokenPipeError:
            # 管道被关闭时忽略错误
            break
        
        result = test_pdf_file(pdf_file, token, api_url)
        results.append(result)
        
        # 清除进度提示
        print("\r   ", end="")
        
        if result['success']:
            successful += 1
            # 提取关键信息
            data = result['response_data']
            file_id = data.get('file_id', 'N/A')
            
            print(f"   ✅ 上传成功!")
            print(f"      🆔 文件ID: {file_id}")
            print(f"      ⏱️  处理时间: {result['processing_time']:.2f}秒")
            
            # 显示发票核心信息
            invoice_details = result['invoice_details']
            if invoice_details:
                print(f"      📄 === 发票信息 ===")
                print(f"         📋 发票号码: {invoice_details.get('invoice_number', 'N/A')}")
                print(f"         📅 发票日期: {invoice_details.get('invoice_date', 'N/A')}")
                print(f"         🏢 销售方: {invoice_details.get('seller_name', 'N/A')}")
                print(f"         🏬 采购方: {invoice_details.get('buyer_name', 'N/A')}")
                print(f"         💰 合计金额: ¥{invoice_details.get('total_amount', 'N/A')}")
                
                # 从extracted_data中获取项目内容
                extracted_data = invoice_details.get('extracted_data')
                project_name = 'N/A'
                if extracted_data:
                    if isinstance(extracted_data, str):
                        # 如果是JSON字符串，解析它
                        try:
                            import json
                            extracted_data = json.loads(extracted_data)
                        except:
                            pass
                    
                    if isinstance(extracted_data, dict):
                        # 直接从顶级获取项目名称（更新后的模型结构）
                        project_name = extracted_data.get('project_name', 'N/A')
                        
                        # 如果没有项目名称，尝试从发票类型推断
                        if project_name == 'N/A' or project_name is None:
                            invoice_type = extracted_data.get('main_info', {}).get('invoice_type', '')
                            if '铁路电子客票' in invoice_type:
                                project_name = '铁路旅客运输服务'
                            elif '餐饮' in invoice_details.get('seller_name', ''):
                                project_name = '餐饮服务'
                            elif '酒店' in invoice_details.get('seller_name', ''):
                                project_name = '住宿服务'
                            else:
                                project_name = '一般服务'
                
                print(f"         📦 项目内容: {project_name}")
            else:
                print(f"      ❌ 无法获取发票详细信息")
            
        else:
            failed += 1
            error_msg = result['error'][:100] if result['error'] else 'Unknown'
            print(f"   ❌ 处理失败!")
            print(f"      🔴 状态码: {result['status_code']}")
            print(f"      📝 错误信息: {error_msg}")
            print(f"      ⏱️  耗时: {result['processing_time']:.2f}秒")
            
            # 检查是否是重复发票错误
            if "duplicate key value violates unique constraint" in error_msg:
                print(f"      ℹ️  注意: 这是重复发票错误")
        
        print("   " + "-" * 60)
        
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
    report_file = f'downloads_sample_test_{timestamp}.json'
    
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