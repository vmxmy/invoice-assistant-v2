#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
查看API返回的extracted_data字段内容
"""
import os
import sys
import requests
import json
from datetime import datetime

def read_token():
    """读取保存的token"""
    token_file = '.user_token'
    if os.path.exists(token_file):
        with open(token_file, 'r') as f:
            return f.read().strip()
    else:
        print("Token文件不存在，请先运行 get_mcp_auth_token.py 获取token")
        sys.exit(1)

def analyze_extracted_data():
    """分析extracted_data内容"""
    # 读取token
    token = read_token()
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # API端点
    base_url = 'http://localhost:8090'
    
    # 测试一个发票ID
    test_case = {
        "name": "广州寿司郎",
        "invoice_id": "c0920a0b-10b1-45cb-b7c7-95fdb1481021",
        "expected": {
            "total": 336.00,
            "pretax": 316.98,
            "tax": 19.02
        }
    }
    
    print(f"分析发票: {test_case['name']}")
    print("=" * 80)
    
    try:
        # 调用发票详情API
        response = requests.get(
            f'{base_url}/api/v1/invoices/{test_case["invoice_id"]}',
            headers=headers
        )
        
        if response.status_code == 200:
            invoice = response.json()
            
            # 显示基本信息
            print("\n基本信息:")
            print(f"  发票号码: {invoice.get('invoice_number')}")
            print(f"  开票日期: {invoice.get('invoice_date')}")
            print(f"  总金额(total_amount): {invoice.get('total_amount')}")
            print(f"  税前金额(amount): {invoice.get('amount')}")
            print(f"  税额(tax_amount): {invoice.get('tax_amount')}")
            
            # 获取extracted_data
            extracted_data = invoice.get('extracted_data', {})
            if extracted_data:
                print("\nextracted_data内容:")
                print(json.dumps(extracted_data, ensure_ascii=False, indent=2))
                
                # 检查是否包含分离的金额字段
                print("\n金额字段分析:")
                print(f"  amount: {extracted_data.get('amount')}")
                print(f"  amount_pretax: {extracted_data.get('amount_pretax')}")
                print(f"  tax_amount: {extracted_data.get('tax_amount')}")
                
                # 如果是结构化数据
                if 'main_info' in extracted_data:
                    print("\n结构化数据:")
                    print(f"  main_info: {extracted_data.get('main_info')}")
                    print(f"  summary: {extracted_data.get('summary')}")
                
                # 检查使用的模板
                template_name = extracted_data.get('template_name', '')
                if template_name:
                    print(f"\n使用模板: {template_name}")
            else:
                print("\n没有extracted_data")
                
        else:
            print(f"API错误: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"异常: {e}")

if __name__ == "__main__":
    analyze_extracted_data()