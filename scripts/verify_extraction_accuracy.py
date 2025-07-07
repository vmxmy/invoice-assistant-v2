#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
验证提取准确性 - 基于实际税率
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

def verify_accuracy():
    """验证提取准确性"""
    # 读取token
    token = read_token()
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # API端点
    base_url = 'http://localhost:8090'
    
    # 使用之前上传的发票ID直接获取详情
    test_cases = [
        {
            "name": "广州寿司郎",
            "invoice_id": "c0920a0b-10b1-45cb-b7c7-95fdb1481021",
            "service": "餐饮服务"
        },
        {
            "name": "湖南清泉华美达",
            "invoice_id": "5631b594-3926-4bbd-8d41-5ff8afd62ed7",
            "service": "住宿服务"
        },
        {
            "name": "娄底萝卜餐饮",
            "invoice_id": "2cdaa012-8ed0-4a82-ad44-a15f350cc21e",
            "service": "餐饮服务"
        },
        {
            "name": "娄底星奕酒店",
            "invoice_id": "2da1a19a-301b-4cbd-8f57-8b0e156af293",
            "service": "住宿服务"
        },
        {
            "name": "娄底金盾印章",
            "invoice_id": "010af9b7-1f4f-49eb-ba6b-4cffe23f15af",
            "service": "印章服务"
        },
        {
            "name": "湖南曾小厨",
            "invoice_id": "c32842d1-b8b7-48c3-93c1-e7771ce56dc8",
            "service": "餐饮服务"
        },
        {
            "name": "娄底中税通",
            "invoice_id": "f5ed2881-4113-497d-b7bf-4c4c83617a39",
            "service": "财税咨询"
        }
    ]
    
    print("发票金额提取准确性验证")
    print("=" * 120)
    print(f"{'商家':<20} {'服务类型':<15} {'总金额':<12} {'税前金额':<12} {'税额':<12} {'税率':<8} {'验证':<10}")
    print("-" * 120)
    
    all_correct = True
    
    for test_case in test_cases:
        try:
            # 获取发票详情
            response = requests.get(
                f'{base_url}/api/v1/invoices/{test_case["invoice_id"]}',
                headers=headers
            )
            
            if response.status_code == 200:
                invoice = response.json()
                
                # 提取金额
                total = invoice.get('total_amount', 0)
                pretax = invoice.get('amount', 0)
                tax = invoice.get('tax_amount', 0)
                
                # 计算税率
                if pretax > 0:
                    tax_rate = (tax / pretax) * 100
                else:
                    tax_rate = 0
                
                # 验证金额关系
                calculated_total = pretax + tax
                is_correct = abs(calculated_total - total) < 0.01
                
                if not is_correct:
                    all_correct = False
                
                verify = "✅" if is_correct else "❌"
                
                print(f"{test_case['name']:<20} {test_case['service']:<15} ¥{total:<11.2f} ¥{pretax:<11.2f} ¥{tax:<11.2f} {tax_rate:<7.1f}% {verify:<10}")
                
            else:
                print(f"{test_case['name']:<20} {'API错误':<15}")
                all_correct = False
                
        except Exception as e:
            print(f"{test_case['name']:<20} {'异常':<15} {str(e)[:50]}")
            all_correct = False
    
    print("=" * 120)
    
    if all_correct:
        print("\n✅ 所有发票的金额提取在数学上完全正确！")
        print("   说明：")
        print("   - 税前金额 + 税额 = 总金额")
        print("   - 不同服务类型有不同的税率（1%或6%）")
        print("   - 餐饮和住宿服务多为1%税率")
    else:
        print("\n❌ 部分发票金额计算关系有误")

if __name__ == "__main__":
    verify_accuracy()