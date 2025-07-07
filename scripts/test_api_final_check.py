#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
最终测试 - 验证所有发票的金额提取效果
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

def final_check():
    """最终检查所有发票"""
    # 读取token
    token = read_token()
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # API端点
    base_url = 'http://localhost:8090'
    
    # 测试文件列表
    test_cases = [
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
            "name": "广州寿司郎",
            "expected": {"total": 336.00, "pretax": 316.98, "tax": 19.02}
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
            "name": "湖南清泉华美达",
            "expected": {"total": 900.00, "pretax": 849.06, "tax": 50.94}
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底市娄星区萝卜餐饮店-1018.00-25432000000029373425.pdf",
            "name": "娄底萝卜餐饮",
            "expected": {"total": 1018.00, "pretax": 960.38, "tax": 57.62}
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底星奕酒店管理有限公司-507.00-25432000000029033553.pdf",
            "name": "娄底星奕酒店",
            "expected": {"total": 507.00, "pretax": 478.30, "tax": 28.70}
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-11-娄底市金盾印章有限公司-655.00-25432000000031411143.pdf",
            "name": "娄底金盾印章",
            "expected": {"total": 655.00, "pretax": 618.11, "tax": 36.89}
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
            "name": "湖南曾小厨",
            "expected": {"total": 80.00, "pretax": 79.21, "tax": 0.79}
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-13-娄底市中税通财税咨询有限公司-500.00-25432000000032177192.pdf",
            "name": "娄底中税通",
            "expected": {"total": 500.00, "pretax": 471.70, "tax": 28.30}
        }
    ]
    
    print("最终测试 - 所有发票金额提取")
    print("=" * 120)
    print(f"{'商家':<20} {'状态':<10} {'总金额':<15} {'税前金额':<15} {'税额':<15} {'验证':<10}")
    print("-" * 120)
    
    results = []
    all_success = True
    
    for test_case in test_cases:
        try:
            # 上传文件
            filename = os.path.basename(test_case['path'])
            
            with open(test_case['path'], 'rb') as f:
                files = {'file': (filename, f, 'application/pdf')}
                
                # 上传
                response = requests.post(
                    f'{base_url}/api/v1/files/upload-invoice',
                    headers=headers,
                    files=files
                )
                
                if response.status_code == 200:
                    upload_result = response.json()
                    invoice_id = upload_result.get('invoice_id')
                    
                    # 获取详情
                    detail_response = requests.get(
                        f'{base_url}/api/v1/invoices/{invoice_id}',
                        headers=headers
                    )
                    
                    if detail_response.status_code == 200:
                        invoice = detail_response.json()
                        
                        # 提取金额
                        total = invoice.get('total_amount', 0)
                        pretax = invoice.get('amount', 0)
                        tax = invoice.get('tax_amount', 0)
                        
                        # 验证
                        total_ok = abs(total - test_case['expected']['total']) < 0.01
                        pretax_ok = abs(pretax - test_case['expected']['pretax']) < 0.01
                        tax_ok = abs(tax - test_case['expected']['tax']) < 0.01
                        all_ok = total_ok and pretax_ok and tax_ok
                        
                        if not all_ok:
                            all_success = False
                        
                        status = "✅ 成功" if all_ok else "❌ 失败"
                        verify = "✅" if all_ok else "❌"
                        
                        print(f"{test_case['name']:<20} {status:<10} ¥{total:<14.2f} ¥{pretax:<14.2f} ¥{tax:<14.2f} {verify:<10}")
                        
                        # 如果验证失败，显示期望值
                        if not all_ok:
                            print(f"{'期望值':<20} {'':<10} ¥{test_case['expected']['total']:<14.2f} ¥{test_case['expected']['pretax']:<14.2f} ¥{test_case['expected']['tax']:<14.2f}")
                        
                        results.append({
                            'name': test_case['name'],
                            'success': all_ok,
                            'actual': {'total': total, 'pretax': pretax, 'tax': tax},
                            'expected': test_case['expected']
                        })
                    else:
                        print(f"{test_case['name']:<20} {'❌ API错误':<10}")
                        all_success = False
                else:
                    print(f"{test_case['name']:<20} {'❌ 上传失败':<10}")
                    all_success = False
                    
        except Exception as e:
            print(f"{test_case['name']:<20} {'❌ 异常':<10} {str(e)[:50]}")
            all_success = False
    
    print("=" * 120)
    
    if all_success:
        print("\n✅ 所有发票金额提取完全正确！")
    else:
        # 统计成功率
        success_count = sum(1 for r in results if r.get('success', False))
        print(f"\n⚠️  成功率: {success_count}/{len(test_cases)} ({success_count/len(test_cases)*100:.0f}%)")
    
    # 保存结果
    output_file = f"api_final_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'test_time': datetime.now().isoformat(),
            'total_cases': len(test_cases),
            'success_count': sum(1 for r in results if r.get('success', False)),
            'all_success': all_success,
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")

if __name__ == "__main__":
    final_check()