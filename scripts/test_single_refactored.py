#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试单个文件的重构效果
"""
import asyncio
import aiohttp
import aiofiles
from pathlib import Path
import json
from datetime import datetime

# 配置
API_BASE_URL = "http://localhost:8090"
TEST_PDF = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"


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


async def upload_invoice(session, pdf_path, token):
    """上传单个发票文件"""
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
    
    print(f"📤 正在上传: {filename}")
    start_time = datetime.now()
    
    try:
        async with session.post(url, data=data, headers=headers) as response:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            result = await response.json()
            
            if response.status == 200:
                print(f"✅ 上传成功 (耗时: {duration:.2f}秒)")
                print(f"  发票ID: {result.get('invoice_id')}")
                print(f"  文件URL: {result.get('file_url')}")
                return True, result
            else:
                print(f"❌ 上传失败 (耗时: {duration:.2f}秒)")
                print(f"  错误: {result}")
                return False, result
    except Exception as e:
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"❌ 异常 (耗时: {duration:.2f}秒): {e}")
        return False, None


async def get_invoice_details(session, invoice_id, token):
    """获取发票详细信息"""
    url = f"{API_BASE_URL}/api/v1/invoices/{invoice_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    print(f"\n📋 获取发票详情: {invoice_id}")
    
    try:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                print(f"  发票号码: {data.get('invoice_number')}")
                print(f"  开票日期: {data.get('invoice_date')}")
                print(f"  销售方: {data.get('seller_name')}")
                print(f"  购买方: {data.get('buyer_name')}")
                print(f"  总金额: ¥{data.get('total_amount', 0):.2f}")
                print(f"  税前金额: ¥{data.get('amount', 0):.2f}")
                print(f"  税额: ¥{data.get('tax_amount', 0):.2f}")
                
                # 验证金额
                total = data.get('total_amount', 0)
                pretax = data.get('amount', 0)
                tax = data.get('tax_amount', 0)
                
                if abs((pretax + tax) - total) < 0.01:
                    print(f"  ✅ 金额验证通过: {pretax} + {tax} = {total}")
                else:
                    print(f"  ❌ 金额验证失败: {pretax} + {tax} ≠ {total}")
                
                return data
            else:
                print(f"  ❌ 获取失败: HTTP {response.status}")
                return None
    except Exception as e:
        print(f"  ❌ 异常: {e}")
        return None


async def main():
    """主函数"""
    print("=" * 60)
    print("测试单个文件的重构效果")
    print("=" * 60)
    print(f"API地址: {API_BASE_URL}")
    print(f"测试文件: {Path(TEST_PDF).name}")
    print()
    
    # 获取认证令牌
    token = await get_auth_token()
    if not token:
        return
    
    # 创建HTTP会话
    async with aiohttp.ClientSession() as session:
        # 上传文件
        success, result = await upload_invoice(session, TEST_PDF, token)
        
        if success and result:
            invoice_id = result.get('invoice_id')
            if invoice_id:
                # 获取详情
                await get_invoice_details(session, invoice_id, token)
        
        print("\n✅ 测试完成")


if __name__ == "__main__":
    asyncio.run(main())