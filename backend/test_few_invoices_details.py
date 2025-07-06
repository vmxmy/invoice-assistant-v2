#!/usr/bin/env python3
"""
测试几个发票文件，输出详细信息
"""

import time
import requests
from pathlib import Path
from supabase import create_client


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
            'status_code': 0,
            'processing_time': 0,
            'success': False,
            'response_data': None,
            'error': str(e),
            'invoice_details': None
        }


def display_invoice_info(result):
    """显示发票信息"""
    file_name = result['file_name']
    print(f"\n📄 文件: {file_name}")
    print(f"   📦 状态: {'✅ 成功' if result['success'] else '❌ 失败'}")
    print(f"   ⏱️  处理时间: {result['processing_time']:.2f}秒")
    
    if result['success']:
        invoice_details = result['invoice_details']
        if invoice_details:
            print(f"   📄 === 发票信息 ===")
            print(f"      📋 发票号码: {invoice_details.get('invoice_number', 'N/A')}")
            print(f"      📅 发票日期: {invoice_details.get('invoice_date', 'N/A')}")
            print(f"      🏢 销售方: {invoice_details.get('seller_name', 'N/A')}")
            print(f"      🏬 采购方: {invoice_details.get('buyer_name', 'N/A')}")
            print(f"      💰 合计金额: ¥{invoice_details.get('total_amount', 'N/A')}")
            
            # 从extracted_data中获取项目内容
            extracted_data = invoice_details.get('extracted_data')
            project_name = 'N/A'
            if extracted_data:
                if isinstance(extracted_data, str):
                    try:
                        import json
                        extracted_data = json.loads(extracted_data)
                    except:
                        pass
                
                if isinstance(extracted_data, dict):
                    # 直接从顶级获取项目名称
                    project_name = extracted_data.get('project_name', 'N/A')
                    
                    # 如果没有项目名称，尝试从发票类型推断
                    if project_name == 'N/A' or project_name is None:
                        invoice_type = extracted_data.get('main_info', {}).get('invoice_type', '')
                        seller_name = invoice_details.get('seller_name', '')
                        
                        if '铁路电子客票' in invoice_type:
                            project_name = '铁路旅客运输服务'
                        elif '餐饮' in seller_name or '寿司' in seller_name or '酒店' in seller_name:
                            project_name = '餐饮服务'
                        elif '酒店' in seller_name or '住宿' in seller_name:
                            project_name = '住宿服务'
                        elif '科技' in seller_name:
                            project_name = '技术服务'
                        else:
                            project_name = '一般服务'
            
            print(f"      📦 项目内容: {project_name}")
        else:
            print(f"   ❌ 无法获取发票详细信息")
    else:
        error = result['error'][:100] if result['error'] else 'Unknown'
        print(f"   💥 错误: {error}")


def main():
    print("🚀 === 测试发票详细信息提取 ===\n")
    
    # 1. 获取认证令牌
    print("1. 获取认证令牌...")
    try:
        token = get_auth_token()
        print("✅ 认证成功\n")
    except Exception as e:
        print(f"❌ 认证失败: {e}")
        return
    
    # 2. 选择几个不同类型的发票进行测试
    test_files = [
        "downloads/25442000000101203423.pdf",  # 餐饮发票
        "downloads/25432000000029373425-杭州趣链科技有限公司.pdf",  # 科技公司发票
        "downloads/25512000000059075953.pdf",  # 烧烤店发票
    ]
    
    api_url = 'http://127.0.0.1:8090/api/v1/files/upload-invoice'
    
    print("2. 开始测试...")
    print("=" * 80)
    
    for test_file in test_files:
        file_path = Path(test_file)
        if file_path.exists():
            result = test_pdf_file(file_path, token, api_url)
            display_invoice_info(result)
            time.sleep(1)  # 避免过于频繁的请求
        else:
            print(f"\n📄 文件: {file_path.name}")
            print(f"   ❌ 文件不存在")
    
    print("\n" + "=" * 80)
    print("🎯 测试完成!")


if __name__ == '__main__':
    main()