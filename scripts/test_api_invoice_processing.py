#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试API发票处理效果
使用优化后的模板通过API处理发票
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

def test_api_processing():
    """测试API处理发票"""
    # 读取token
    token = read_token()
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    # API端点
    base_url = 'http://localhost:8090'
    
    # 测试文件列表
    pdf_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底市娄星区萝卜餐饮店-1018.00-25432000000029373425.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底星奕酒店管理有限公司-507.00-25432000000029033553.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-11-娄底市金盾印章有限公司-655.00-25432000000031411143.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-13-娄底市中税通财税咨询有限公司-500.00-25432000000032177192.pdf"
    ]
    
    results = []
    success_count = 0
    
    print("API发票处理测试")
    print("=" * 100)
    print(f"API地址: {base_url}")
    print(f"Token: {token[:50]}...")
    print()
    
    # 测试每个文件
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"\n处理: {filename}")
        print("-" * 80)
        
        try:
            # 准备文件上传
            with open(pdf_path, 'rb') as f:
                files = {'file': (filename, f, 'application/pdf')}
                
                # 调用发票上传API
                response = requests.post(
                    f'{base_url}/api/v1/files/upload-invoice',
                    headers=headers,
                    files=files
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # API直接返回文件信息，不是status/data格式
                    if 'file_id' in result and 'invoice_id' in result:
                        success_count += 1
                        data = result
                        
                        # 显示提取结果
                        print(f"  ✅ 上传成功")
                        print(f"  文件ID: {data.get('file_id', 'N/A')}")
                        print(f"  发票ID: {data.get('invoice_id', 'N/A')}")
                        print(f"  文件URL: {data.get('file_url', 'N/A')}")
                        
                        # 需要再查询发票详情来验证提取结果
                        invoice_id = data.get('invoice_id')
                        if invoice_id:
                            print(f"  [需要调用GET /api/v1/invoices/{invoice_id}获取发票详情]")
                        
                        results.append({
                            'file': filename,
                            'success': True,
                            'data': data,
                            'template_used': data.get('template_name', 'unknown')
                        })
                    else:
                        print(f"  ❌ 处理失败")
                        print(f"  响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
                        results.append({
                            'file': filename,
                            'success': False,
                            'error': str(result)
                        })
                else:
                    print(f"  ❌ HTTP错误: {response.status_code}")
                    print(f"  响应: {response.text[:200]}")
                    results.append({
                        'file': filename,
                        'success': False,
                        'error': f'HTTP {response.status_code}'
                    })
                    
        except Exception as e:
            print(f"  ❌ 异常: {str(e)}")
            results.append({
                'file': filename,
                'success': False,
                'error': str(e)
            })
    
    # 汇总结果
    print(f"\n{'=' * 100}")
    print(f"处理汇总:")
    print(f"  总数: {len(pdf_files)}")
    print(f"  成功: {success_count}")
    print(f"  失败: {len(pdf_files) - success_count}")
    print(f"  成功率: {success_count/len(pdf_files)*100:.0f}%")
    
    # 保存结果
    output_file = f"api_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'test_time': datetime.now().isoformat(),
            'api_url': base_url,
            'total_files': len(pdf_files),
            'success_count': success_count,
            'success_rate': f"{success_count/len(pdf_files)*100:.0f}%",
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n测试结果已保存到: {output_file}")

if __name__ == "__main__":
    test_api_processing()