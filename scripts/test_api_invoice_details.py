#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试API发票详情 - 验证OCR提取结果
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

def test_invoice_details():
    """测试发票详情API"""
    # 读取token
    token = read_token()
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # API端点
    base_url = 'http://localhost:8090'
    
    # 从之前的测试结果获取发票ID
    invoice_ids = [
        ("广州寿司郎", "c0920a0b-10b1-45cb-b7c7-95fdb1481021", 336.00),
        ("湖南清泉华美达", "5631b594-3926-4bbd-8d41-5ff8afd62ed7", 900.00),
        ("娄底萝卜餐饮", "2cdaa012-8ed0-4a82-ad44-a15f350cc21e", 1018.00),
        ("娄底星奕酒店", "2da1a19a-301b-4cbd-8f57-8b0e156af293", 507.00),
        ("娄底金盾印章", "010af9b7-1f4f-49eb-ba6b-4cffe23f15af", 655.00),
        ("湖南曾小厨", "c32842d1-b8b7-48c3-93c1-e7771ce56dc8", 80.00),
        ("娄底中税通", "f5ed2881-4113-497d-b7bf-4c4c83617a39", 500.00)
    ]
    
    print("发票详情测试")
    print("=" * 120)
    print(f"{'商家简称':<15} {'发票号码':<25} {'开票日期':<12} {'总金额':<10} {'税前':<10} {'税额':<10} {'购买方':<30}")
    print("-" * 120)
    
    results = []
    field_success_count = {
        'invoice_number': 0,
        'date': 0,
        'amount': 0,
        'amount_pretax': 0,
        'tax_amount': 0,
        'buyer_name': 0,
        'seller_name': 0
    }
    
    for short_name, invoice_id, expected_amount in invoice_ids:
        try:
            # 调用发票详情API
            response = requests.get(
                f'{base_url}/api/v1/invoices/{invoice_id}',
                headers=headers
            )
            
            if response.status_code == 200:
                invoice = response.json()
                
                # 提取关键字段
                invoice_number = invoice.get('invoice_number', 'N/A')
                invoice_date = invoice.get('invoice_date', 'N/A')
                total_amount = invoice.get('total_amount', 0)
                amount = invoice.get('amount', 0)
                tax_amount = invoice.get('tax_amount', 0)
                buyer_name = invoice.get('buyer_name', 'N/A')
                seller_name = invoice.get('seller_name', 'N/A')
                
                # 统计字段提取成功率
                if invoice_number and invoice_number != 'N/A':
                    field_success_count['invoice_number'] += 1
                if invoice_date and invoice_date != 'N/A':
                    field_success_count['date'] += 1
                if total_amount > 0:
                    field_success_count['amount'] += 1
                if amount > 0:
                    field_success_count['amount_pretax'] += 1
                if tax_amount > 0:
                    field_success_count['tax_amount'] += 1
                if buyer_name and buyer_name != 'N/A':
                    field_success_count['buyer_name'] += 1
                if seller_name and seller_name != 'N/A':
                    field_success_count['seller_name'] += 1
                
                # 显示结果
                print(f"{short_name:<15} {invoice_number:<25} {invoice_date:<12} ¥{total_amount:<9.2f} ¥{amount:<9.2f} ¥{tax_amount:<9.2f} {buyer_name[:30]:<30}")
                
                # 验证金额
                if abs(total_amount - expected_amount) > 0.01:
                    print(f"  ⚠️  金额不匹配: 期望 ¥{expected_amount}, 实际 ¥{total_amount}")
                
                # 查看extracted_data
                extracted_data = invoice.get('extracted_data', {})
                if extracted_data:
                    # 检查是否使用了新模板
                    template_name = extracted_data.get('template_name', '')
                    if template_name:
                        print(f"  使用模板: {template_name}")
                
                results.append({
                    'name': short_name,
                    'invoice_id': invoice_id,
                    'success': True,
                    'data': invoice
                })
                
            else:
                print(f"{short_name:<15} {'API错误':<25} {response.status_code}")
                results.append({
                    'name': short_name,
                    'invoice_id': invoice_id,
                    'success': False,
                    'error': f'HTTP {response.status_code}'
                })
                
        except Exception as e:
            print(f"{short_name:<15} {'异常':<25} {str(e)[:50]}")
            results.append({
                'name': short_name,
                'invoice_id': invoice_id,
                'success': False,
                'error': str(e)
            })
    
    # 字段提取统计
    print(f"\n{'=' * 120}")
    print("字段提取统计:")
    total_invoices = len(invoice_ids)
    for field, count in field_success_count.items():
        success_rate = count / total_invoices * 100
        print(f"  {field:<20}: {count}/{total_invoices} ({success_rate:.0f}%)")
    
    # 保存结果
    output_file = f"api_invoice_details_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'test_time': datetime.now().isoformat(),
            'total_invoices': total_invoices,
            'field_statistics': field_success_count,
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细结果已保存到: {output_file}")

if __name__ == "__main__":
    test_invoice_details()