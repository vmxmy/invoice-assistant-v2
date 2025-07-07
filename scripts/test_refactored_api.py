#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试重构后的API - 处理发票PDF文件
"""
import os
import sys
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
import json
from datetime import datetime

# 配置
API_BASE_URL = "http://localhost:8090"
PDF_DIR = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507"


async def get_auth_token():
    """获取认证令牌"""
    token_file = Path(__file__).parent / '.auth_token'
    if token_file.exists():
        async with aiofiles.open(token_file, 'r') as f:
            token = await f.read()
            return token.strip()
    else:
        print("❌ 未找到认证令牌文件，请先运行 get_mcp_auth_token.py")
        return None


async def upload_invoice(session, pdf_path, token):
    """上传单个发票文件"""
    url = f"{API_BASE_URL}/api/v1/files/upload-invoice"
    headers = {"Authorization": f"Bearer {token}"}
    
    filename = os.path.basename(pdf_path)
    
    # 创建表单数据
    data = aiohttp.FormData()
    async with aiofiles.open(pdf_path, 'rb') as f:
        file_content = await f.read()
        data.add_field('file',
                      file_content,
                      filename=filename,
                      content_type='application/pdf')
    
    try:
        async with session.post(url, data=data, headers=headers) as response:
            result = await response.json()
            
            if response.status == 200:
                return {
                    'success': True,
                    'file': filename,
                    'invoice_id': result.get('invoice_id'),
                    'file_url': result.get('file_url'),
                    'response': result
                }
            else:
                return {
                    'success': False,
                    'file': filename,
                    'error': result.get('detail', str(result)),
                    'status_code': response.status
                }
    except Exception as e:
        return {
            'success': False,
            'file': filename,
            'error': str(e)
        }


async def get_invoice_details(session, invoice_id, token):
    """获取发票详细信息"""
    url = f"{API_BASE_URL}/api/v1/invoices/{invoice_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                return await response.json()
            return None
    except:
        return None


async def test_refactored_api():
    """测试重构后的API"""
    print("=" * 80)
    print("测试重构后的API")
    print("=" * 80)
    print(f"API地址: {API_BASE_URL}")
    print(f"PDF目录: {PDF_DIR}")
    print()
    
    # 获取认证令牌
    token = await get_auth_token()
    if not token:
        return
    
    # 获取所有PDF文件
    pdf_files = list(Path(PDF_DIR).glob("*.pdf"))
    if not pdf_files:
        print(f"❌ 未找到PDF文件在: {PDF_DIR}")
        return
    
    print(f"找到 {len(pdf_files)} 个PDF文件")
    print()
    
    # 创建HTTP会话
    async with aiohttp.ClientSession() as session:
        # 上传所有文件
        results = []
        for pdf_file in pdf_files:
            print(f"上传: {pdf_file.name}")
            result = await upload_invoice(session, str(pdf_file), token)
            results.append(result)
            
            if result['success']:
                print(f"  ✅ 成功 - 发票ID: {result['invoice_id']}")
            else:
                print(f"  ❌ 失败 - {result['error']}")
        
        print("\n" + "=" * 80)
        print("获取发票详情")
        print("=" * 80)
        
        # 获取成功上传的发票详情
        success_count = 0
        for result in results:
            if result['success'] and result.get('invoice_id'):
                invoice_id = result['invoice_id']
                details = await get_invoice_details(session, invoice_id, token)
                
                if details:
                    success_count += 1
                    print(f"\n发票: {result['file']}")
                    print(f"  发票号码: {details.get('invoice_number', 'N/A')}")
                    print(f"  开票日期: {details.get('invoice_date', 'N/A')}")
                    print(f"  销售方: {details.get('seller_name', 'N/A')}")
                    print(f"  购买方: {details.get('buyer_name', 'N/A')}")
                    print(f"  总金额: ¥{details.get('total_amount', 0):.2f}")
                    print(f"  税前金额: ¥{details.get('amount', 0):.2f}")
                    print(f"  税额: ¥{details.get('tax_amount', 0):.2f}")
                    
                    # 验证金额关系
                    total = details.get('total_amount', 0)
                    pretax = details.get('amount', 0)
                    tax = details.get('tax_amount', 0)
                    
                    if abs((pretax + tax) - total) < 0.01:
                        print(f"  ✅ 金额验证通过")
                    else:
                        print(f"  ❌ 金额验证失败: {pretax} + {tax} ≠ {total}")
        
        # 统计结果
        print("\n" + "=" * 80)
        print("测试总结")
        print("=" * 80)
        print(f"总文件数: {len(pdf_files)}")
        print(f"上传成功: {sum(1 for r in results if r['success'])}")
        print(f"上传失败: {sum(1 for r in results if not r['success'])}")
        print(f"详情获取成功: {success_count}")
        
        # 保存测试结果
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = f"refactored_api_test_results_{timestamp}.json"
        
        test_summary = {
            'test_time': datetime.now().isoformat(),
            'api_url': API_BASE_URL,
            'pdf_directory': PDF_DIR,
            'total_files': len(pdf_files),
            'upload_results': results,
            'success_rate': f"{sum(1 for r in results if r['success']) / len(results) * 100:.1f}%"
        }
        
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(test_summary, f, ensure_ascii=False, indent=2)
        
        print(f"\n测试结果已保存到: {result_file}")


if __name__ == "__main__":
    # 运行测试
    asyncio.run(test_refactored_api())