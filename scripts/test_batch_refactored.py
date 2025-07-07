#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
批量测试重构后的API - 使用并发控制
"""
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
import json
from datetime import datetime

# 配置
API_BASE_URL = "http://localhost:8090"
PDF_DIR = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507"
CONCURRENT_LIMIT = 3  # 同时处理的文件数


async def get_auth_token():
    """获取认证令牌"""
    token_file = Path(__file__).parent / '.auth_token'
    if token_file.exists():
        async with aiofiles.open(token_file, 'r') as f:
            token = await f.read()
            return token.strip()
    else:
        print("❌ 未找到认证令牌文件")
        return None


async def upload_invoice(session, pdf_path, token, semaphore):
    """上传单个发票文件（带并发控制）"""
    async with semaphore:  # 限制并发数
        url = f"{API_BASE_URL}/api/v1/files/upload-invoice"
        headers = {"Authorization": f"Bearer {token}"}
        
        filename = Path(pdf_path).name
        
        # 创建表单数据
        data = aiohttp.FormData()
        async with aiofiles.open(pdf_path, 'rb') as f:
            file_content = await f.read()
            data.add_field('file',
                          file_content,
                          filename=filename,
                          content_type='application/pdf')
        
        start_time = datetime.now()
        
        try:
            async with session.post(url, data=data, headers=headers) as response:
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                
                result = await response.json()
                
                if response.status == 200:
                    print(f"✅ {filename} - 成功 ({duration:.1f}秒)")
                    return {
                        'success': True,
                        'file': filename,
                        'invoice_id': result.get('invoice_id'),
                        'duration': duration,
                        'response': result
                    }
                else:
                    print(f"❌ {filename} - 失败 ({duration:.1f}秒): {result.get('detail', 'Unknown error')}")
                    return {
                        'success': False,
                        'file': filename,
                        'error': result.get('detail', str(result)),
                        'duration': duration
                    }
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            print(f"❌ {filename} - 异常 ({duration:.1f}秒): {e}")
            return {
                'success': False,
                'file': filename,
                'error': str(e),
                'duration': duration
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


async def main():
    """主函数"""
    print("=" * 80)
    print("批量测试重构后的API")
    print("=" * 80)
    print(f"API地址: {API_BASE_URL}")
    print(f"PDF目录: {PDF_DIR}")
    print(f"并发限制: {CONCURRENT_LIMIT}")
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
    
    # 创建并发控制信号量
    semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
    
    # 创建HTTP会话
    async with aiohttp.ClientSession() as session:
        # 上传所有文件
        print("开始上传...")
        upload_tasks = [
            upload_invoice(session, str(pdf_file), token, semaphore)
            for pdf_file in pdf_files
        ]
        results = await asyncio.gather(*upload_tasks)
        
        # 统计结果
        success_count = sum(1 for r in results if r['success'])
        fail_count = sum(1 for r in results if not r['success'])
        total_duration = sum(r['duration'] for r in results)
        avg_duration = total_duration / len(results) if results else 0
        
        print(f"\n上传完成:")
        print(f"  成功: {success_count}")
        print(f"  失败: {fail_count}")
        print(f"  总耗时: {total_duration:.1f}秒")
        print(f"  平均耗时: {avg_duration:.1f}秒/文件")
        
        # 获取成功上传的发票详情
        print("\n验证发票数据...")
        valid_count = 0
        for result in results:
            if result['success'] and result.get('invoice_id'):
                details = await get_invoice_details(session, result['invoice_id'], token)
                if details:
                    # 验证金额
                    total = details.get('total_amount', 0)
                    pretax = details.get('amount', 0)
                    tax = details.get('tax_amount', 0)
                    
                    if abs((pretax + tax) - total) < 0.01:
                        valid_count += 1
        
        print(f"  金额验证通过: {valid_count}/{success_count}")
        
        # 保存测试结果
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_file = f"batch_test_results_{timestamp}.json"
        
        test_summary = {
            'test_time': datetime.now().isoformat(),
            'api_url': API_BASE_URL,
            'pdf_directory': PDF_DIR,
            'concurrent_limit': CONCURRENT_LIMIT,
            'total_files': len(pdf_files),
            'success_count': success_count,
            'fail_count': fail_count,
            'valid_count': valid_count,
            'total_duration': total_duration,
            'avg_duration': avg_duration,
            'results': results
        }
        
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(test_summary, f, ensure_ascii=False, indent=2)
        
        print(f"\n测试结果已保存到: {result_file}")


if __name__ == "__main__":
    asyncio.run(main())