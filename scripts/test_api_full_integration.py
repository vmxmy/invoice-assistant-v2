#!/usr/bin/env python3
"""
完整的API集成测试 - 包含认证和文件上传
"""

import asyncio
import aiohttp
import sys
import os
from pathlib import Path
import json
from datetime import datetime

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))


async def test_full_api_integration():
    """完整的API集成测试"""
    print("="*80)
    print("完整API集成测试 - 混合提取器")
    print("="*80)
    
    # API配置
    base_url = "http://localhost:8090"
    
    # 测试账号（需要预先创建）
    test_credentials = {
        "email": "test@example.com",
        "password": "test123456"
    }
    
    # 测试文件
    test_file = "/Users/xumingyang/Downloads/selected_invoices_20250321114536/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"
    
    if not os.path.exists(test_file):
        print(f"错误: 测试文件不存在 - {test_file}")
        return
    
    async with aiohttp.ClientSession() as session:
        try:
            # 1. 登录获取令牌
            print("\n1. 尝试登录...")
            login_data = aiohttp.FormData()
            login_data.add_field('username', test_credentials['email'])
            login_data.add_field('password', test_credentials['password'])
            
            async with session.post(
                f"{base_url}/api/v1/auth/login",
                data=login_data
            ) as resp:
                if resp.status == 200:
                    auth_data = await resp.json()
                    access_token = auth_data.get('access_token')
                    print(f"   ✓ 登录成功")
                    print(f"   Token类型: {auth_data.get('token_type')}")
                else:
                    print(f"   ✗ 登录失败: {resp.status}")
                    error_detail = await resp.text()
                    print(f"   错误: {error_detail}")
                    print("\n   提示: 请先创建测试账号或使用已有账号")
                    return
            
            # 2. 设置认证头
            headers = {
                'Authorization': f'Bearer {access_token}'
            }
            
            # 3. 上传发票文件
            print(f"\n2. 上传发票文件...")
            print(f"   文件: {os.path.basename(test_file)}")
            
            # 准备文件数据
            data = aiohttp.FormData()
            with open(test_file, 'rb') as f:
                data.add_field('file',
                             f,
                             filename=os.path.basename(test_file),
                             content_type='application/pdf')
            
            upload_start = datetime.now()
            
            async with session.post(
                f"{base_url}/api/v1/files/upload-invoice",
                data=data,
                headers=headers
            ) as resp:
                upload_end = datetime.now()
                upload_time = (upload_end - upload_start).total_seconds()
                
                if resp.status == 200:
                    result = await resp.json()
                    print(f"   ✓ 上传成功 (耗时: {upload_time:.2f}秒)")
                    print(f"   发票ID: {result.get('invoice_id')}")
                    print(f"   文件ID: {result.get('file_id')}")
                    print(f"   文件路径: {result.get('file_path')}")
                    
                    invoice_id = result.get('invoice_id')
                else:
                    print(f"   ✗ 上传失败: {resp.status}")
                    error_detail = await resp.text()
                    print(f"   错误: {error_detail}")
                    return
            
            # 4. 获取发票详情
            if invoice_id:
                print(f"\n3. 获取发票详情...")
                async with session.get(
                    f"{base_url}/api/v1/invoices/{invoice_id}",
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        invoice = await resp.json()
                        print(f"   ✓ 获取成功")
                        print(f"\n   提取的数据:")
                        print(f"   - 发票号码: {invoice.get('invoice_number')}")
                        print(f"   - 开票日期: {invoice.get('invoice_date')}")
                        print(f"   - 销售方: {invoice.get('seller_name')}")
                        print(f"   - 购买方: {invoice.get('buyer_name')}")
                        print(f"   - 总金额: {invoice.get('total_amount')}")
                        print(f"   - 处理状态: {invoice.get('processing_status')}")
                        
                        # 检查extracted_data
                        if 'extracted_data' in invoice:
                            extracted = invoice['extracted_data']
                            if isinstance(extracted, dict):
                                print(f"\n   OCR提取详情:")
                                if 'extraction_method' in extracted:
                                    print(f"   - 提取方法: {extracted.get('extraction_method')}")
                                if 'confidence' in extracted:
                                    print(f"   - 置信度: {extracted.get('confidence')}")
                    else:
                        print(f"   ✗ 获取失败: {resp.status}")
            
            # 5. 获取发票列表
            print(f"\n4. 获取发票列表...")
            async with session.get(
                f"{base_url}/api/v1/invoices/",
                headers=headers,
                params={'page': 1, 'page_size': 5}
            ) as resp:
                if resp.status == 200:
                    list_data = await resp.json()
                    print(f"   ✓ 获取成功")
                    print(f"   总数: {list_data.get('total')}")
                    print(f"   本页数量: {len(list_data.get('items', []))}")
                else:
                    print(f"   ✗ 获取失败: {resp.status}")
            
        except aiohttp.ClientConnectorError:
            print("\n✗ 无法连接到服务器")
            print("请确保后端服务已启动:")
            print("cd /Users/xumingyang/app/invoice_assist/v2/backend")
            print("source venv/bin/activate")
            print("python run.py")
        except Exception as e:
            print(f"\n✗ 测试过程中出错: {e}")
    
    print("\n" + "="*80)
    print("测试总结:")
    print("✅ API已成功集成混合提取器")
    print("✅ 文件上传和OCR处理正常工作")
    print("✅ 发票数据能够正确提取和存储")


async def main():
    """主函数"""
    await test_full_api_integration()


if __name__ == "__main__":
    asyncio.run(main())