#!/usr/bin/env python3
"""
测试单个发票文件，输出详细信息
"""

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
        else:
            print(f"获取发票详情失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"获取发票详情异常: {e}")
        return None


def main():
    print("🧪 === 测试单个发票详细信息 ===\n")
    
    # 1. 获取认证令牌
    print("1. 获取认证令牌...")
    try:
        token = get_auth_token()
        print("✅ 认证成功\n")
    except Exception as e:
        print(f"❌ 认证失败: {e}")
        return
    
    # 2. 使用现有发票ID测试
    test_invoice_id = "ec8458e7-4e15-4ae0-8b04-eb9aabd3647d"  # 火车票发票ID
    
    print(f"2. 获取发票详情 (ID: {test_invoice_id})...")
    invoice_details = get_invoice_details(test_invoice_id, token)
    
    if invoice_details:
        print("✅ 成功获取发票详情\n")
        print("📄 === 发票核心信息 ===")
        print(f"📋 发票号码: {invoice_details.get('invoice_number', 'N/A')}")
        print(f"📅 发票日期: {invoice_details.get('invoice_date', 'N/A')}")
        print(f"🏢 销售方: {invoice_details.get('seller_name', 'N/A')}")
        print(f"🏬 采购方: {invoice_details.get('buyer_name', 'N/A')}")
        print(f"💰 合计金额: ¥{invoice_details.get('total_amount', 'N/A')}")
        
        # 检查extracted_data结构
        extracted_data = invoice_details.get('extracted_data')
        print(f"\n🔍 === 提取数据结构分析 ===")
        print(f"extracted_data类型: {type(extracted_data)}")
        
        if extracted_data:
            if isinstance(extracted_data, str):
                print("extracted_data是字符串，尝试解析JSON...")
                try:
                    import json
                    extracted_data = json.loads(extracted_data)
                    print("✅ JSON解析成功")
                except Exception as e:
                    print(f"❌ JSON解析失败: {e}")
            
            if isinstance(extracted_data, dict):
                print("📦 extracted_data字典内容:")
                for key in extracted_data.keys():
                    print(f"   - {key}")
                
                # 尝试获取项目名称
                project_name = (
                    extracted_data.get('project_name') or 
                    extracted_data.get('main_info', {}).get('project_name') if extracted_data.get('main_info') else None or
                    'N/A'
                )
                print(f"\n📦 项目内容: {project_name}")
                
                # 显示完整的extracted_data（简化显示）
                print(f"\n📊 === 完整提取数据 (前500字符) ===")
                import json
                full_data = json.dumps(extracted_data, ensure_ascii=False, indent=2)
                print(full_data[:500] + "..." if len(full_data) > 500 else full_data)
    else:
        print("❌ 无法获取发票详情")


if __name__ == '__main__':
    main()