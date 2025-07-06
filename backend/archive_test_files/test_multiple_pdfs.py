#!/usr/bin/env python3
"""
测试多个PDF文件的OCR处理
"""

import asyncio
import os
from app.services.ocr.service import OCRService
from app.services.ocr.config import OCRConfig

async def test_multiple_pdfs():
    config = OCRConfig(
        api_token='eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI4NTUwMzY3MCIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc1MTM3NjU5NiwiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiIiwib3BlbklkIjpudWxsLCJ1dWlkIjoiMGQ2ZWY3YWMtMjJlOS00ZjU3LWE5MzAtMzg2NmVlYjFhMjE4IiwiZW1haWwiOiJibHVleWFuZ0BnbWFpbC5jb20iLCJleHAiOjE3NTI1ODYxOTZ9.yRfFwsovix82a8Uq7bJGYk93a2Lfe1EdDBCQEwvXydmdEgiwnCO3WDLubrZwedGpWaXOKfHk4gYZfN4ZLXnthg',
        base_url='https://mineru.net/api',
        mock_mode=False
    )
    
    service = OCRService(config)
    
    # 选择几个不同的PDF文件进行测试
    test_files = [
        '/Users/xumingyang/app/invoice_assist/downloads/25432000000029033553-杭州趣链物联科技有限公司.pdf',
        '/Users/xumingyang/app/invoice_assist/downloads/25432000000031789815.pdf',
        '/Users/xumingyang/app/invoice_assist/downloads/dzfp_25432000000032177192_杭州趣链科技有限公司_20250313093318.pdf'
    ]
    
    print('🔍 开始测试多个PDF文件')
    print()
    
    results = []
    
    for i, pdf_path in enumerate(test_files, 1):
        print(f'📄 测试文件 {i}/3: {os.path.basename(pdf_path)}')
        print(f'📁 文件大小: {os.path.getsize(pdf_path):,} 字节')
        
        try:
            result = await service.extract_invoice_data_v2(pdf_path)
            
            print(f'   ✅ 状态: {result.status}')
            print(f'   ⏱️  处理时间: {result.processing_time:.2f}秒')
            
            if result.structured_data:
                main_info = result.structured_data.main_info
                seller_info = result.structured_data.seller_info
                summary = result.structured_data.summary
                
                if main_info:
                    print(f'   📋 发票号码: {main_info.invoice_number}')
                    print(f'   📅 开票日期: {main_info.invoice_date}')
                
                if seller_info and seller_info.name:
                    print(f'   🏢 销售方: {seller_info.name}')
                
                if summary:
                    print(f'   💰 价税合计: ¥{summary.total_amount}')
                    if summary.amount_in_words:
                        print(f'   🔤 大写金额: {summary.amount_in_words}')
                
                # 记录结果
                results.append({
                    'file': os.path.basename(pdf_path),
                    'status': result.status,
                    'invoice_number': main_info.invoice_number if main_info else '',
                    'seller_name': seller_info.name if seller_info else '',
                    'total_amount': summary.total_amount if summary else 0,
                    'processing_time': result.processing_time
                })
            else:
                print(f'   ❌ 未获取到结构化数据')
                results.append({
                    'file': os.path.basename(pdf_path),
                    'status': result.status,
                    'error': result.error or '未知错误',
                    'processing_time': result.processing_time
                })
            
            if result.error:
                print(f'   ❌ 错误: {result.error}')
            
        except Exception as e:
            print(f'   ❌ 处理失败: {e}')
            results.append({
                'file': os.path.basename(pdf_path),
                'status': 'error',
                'error': str(e),
                'processing_time': 0
            })
        
        print()  # 空行分隔
    
    await service.close()
    
    # 输出测试摘要
    print('📊 测试结果摘要:')
    print('=' * 50)
    
    successful = [r for r in results if r['status'] == 'success']
    failed = [r for r in results if r['status'] != 'success']
    
    print(f'总测试文件数: {len(results)}')
    print(f'成功解析: {len(successful)}')
    print(f'失败: {len(failed)}')
    print(f'成功率: {len(successful)/len(results)*100:.1f}%')
    
    if successful:
        avg_time = sum(r['processing_time'] for r in successful) / len(successful)
        print(f'平均处理时间: {avg_time:.2f}秒')
    
    print('\n📋 详细结果:')
    for r in results:
        if r['status'] == 'success':
            print(f'✅ {r["file"]}: {r["invoice_number"]} - {r["seller_name"]} - ¥{r["total_amount"]}')
        else:
            print(f'❌ {r["file"]}: {r.get("error", "未知错误")}')

if __name__ == "__main__":
    asyncio.run(test_multiple_pdfs())