#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试修复后的API发票处理 - 验证金额字段分离
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

def test_fixed_api():
    """测试修复后的API"""
    # 读取token
    token = read_token()
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # API端点
    base_url = 'http://localhost:8090'
    
    # 测试用例：选择一个有税额的发票
    test_file = {
        "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
        "name": "湖南曾小厨",
        "expected": {
            "total": 80.00,
            "pretax": 79.21,
            "tax": 0.79
        }
    }
    
    print("测试修复后的API金额提取")
    print("=" * 80)
    print(f"测试文件: {test_file['name']}")
    print(f"期望值: 总额¥{test_file['expected']['total']}, 税前¥{test_file['expected']['pretax']}, 税额¥{test_file['expected']['tax']}")
    print()
    
    try:
        # 上传文件
        filename = os.path.basename(test_file['path'])
        
        with open(test_file['path'], 'rb') as f:
            files = {'file': (filename, f, 'application/pdf')}
            
            print("1. 上传发票...")
            response = requests.post(
                f'{base_url}/api/v1/files/upload-invoice',
                headers=headers,
                files=files
            )
            
            if response.status_code == 200:
                upload_result = response.json()
                invoice_id = upload_result.get('invoice_id')
                print(f"   ✅ 上传成功，发票ID: {invoice_id}")
                
                # 获取发票详情
                print("\n2. 获取发票详情...")
                detail_response = requests.get(
                    f'{base_url}/api/v1/invoices/{invoice_id}',
                    headers=headers
                )
                
                if detail_response.status_code == 200:
                    invoice = detail_response.json()
                    
                    # 提取金额信息
                    total_amount = invoice.get('total_amount', 0)
                    amount = invoice.get('amount', 0)  # 税前金额
                    tax_amount = invoice.get('tax_amount', 0)
                    
                    print(f"\n提取结果:")
                    print(f"  总金额(total_amount): ¥{total_amount}")
                    print(f"  税前金额(amount): ¥{amount}")
                    print(f"  税额(tax_amount): ¥{tax_amount}")
                    
                    # 验证结果
                    print(f"\n验证:")
                    if abs(total_amount - test_file['expected']['total']) < 0.01:
                        print(f"  ✅ 总金额正确")
                    else:
                        print(f"  ❌ 总金额错误，期望: ¥{test_file['expected']['total']}")
                    
                    if abs(amount - test_file['expected']['pretax']) < 0.01:
                        print(f"  ✅ 税前金额正确")
                    else:
                        print(f"  ❌ 税前金额错误，期望: ¥{test_file['expected']['pretax']}")
                    
                    if abs(tax_amount - test_file['expected']['tax']) < 0.01:
                        print(f"  ✅ 税额正确")
                    else:
                        print(f"  ❌ 税额错误，期望: ¥{test_file['expected']['tax']}")
                    
                    # 验证计算关系
                    calculated = amount + tax_amount
                    if abs(calculated - total_amount) < 0.01:
                        print(f"  ✅ 金额关系正确: {amount} + {tax_amount} = {total_amount}")
                    else:
                        print(f"  ❌ 金额关系错误: {amount} + {tax_amount} = {calculated} ≠ {total_amount}")
                    
                    # 查看extracted_data
                    extracted_data = invoice.get('extracted_data', {})
                    if extracted_data:
                        print(f"\nextracted_data中的金额字段:")
                        print(f"  amount: {extracted_data.get('amount')}")
                        print(f"  amount_pretax: {extracted_data.get('amount_pretax')}")
                        print(f"  tax_amount: {extracted_data.get('tax_amount')}")
                        
                        # 查看summary
                        if 'summary' in extracted_data:
                            summary = extracted_data['summary']
                            print(f"\nsummary字段:")
                            print(f"  {json.dumps(summary, ensure_ascii=False, indent=2)}")
                    
                else:
                    print(f"   ❌ 获取详情失败: {detail_response.status_code}")
                    
            else:
                print(f"   ❌ 上传失败: {response.status_code}")
                print(response.text)
                
    except Exception as e:
        print(f"异常: {e}")

if __name__ == "__main__":
    test_fixed_api()