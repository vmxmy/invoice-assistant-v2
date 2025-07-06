#!/usr/bin/env python3
"""
直接测试OCR服务，验证数据提取和格式转换
"""

import asyncio
import json
from pathlib import Path
from app.services.ocr.service import OCRService

async def test_ocr_service():
    """测试OCR服务"""
    # 创建OCR服务
    ocr_service = OCRService()
    
    # 测试文件
    pdf_file = Path("downloads/25432000000031789815.pdf")
    
    print(f"测试文件: {pdf_file.name}")
    print("="*60)
    
    # 使用异步上下文管理器
    async with ocr_service:
        # 调用extract_invoice_data (旧版接口)
        result = await ocr_service.extract_invoice_data(str(pdf_file))
    
    print("\nOCR服务返回结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    
    # 检查关键字段
    print("\n关键字段检查:")
    print(f"  status: {result.get('status')}")
    print(f"  invoice_number: {result.get('invoice_number')}")
    print(f"  invoice_date: {result.get('invoice_date')}")
    print(f"  seller_name: {result.get('seller_name')}")
    print(f"  buyer_name: {result.get('buyer_name')}")
    print(f"  amount: {result.get('amount')}")
    print(f"  total_amount: {result.get('total_amount')}")
    
    # 检查structured_data
    if 'structured_data' in result:
        print("\nstructured_data存在:")
        sd = result['structured_data']
        if isinstance(sd, dict):
            print(f"  main_info: {sd.get('main_info', {})}")
            print(f"  seller_info: {sd.get('seller_info', {})}")
            print(f"  buyer_info: {sd.get('buyer_info', {})}")

if __name__ == "__main__":
    asyncio.run(test_ocr_service())