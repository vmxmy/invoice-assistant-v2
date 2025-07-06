#!/usr/bin/env python3
"""
调试发票数据提取
"""

import asyncio
from pathlib import Path
from app.services.ocr.service import OCRService
import json

async def test_extraction():
    """测试数据提取"""
    # 创建OCR服务
    ocr_service = OCRService()
    
    # 测试一个文件
    pdf_file = Path("downloads/25432000000031789815.pdf")
    
    print(f"测试文件: {pdf_file.name}")
    print("="*60)
    
    # 提取数据
    result = await ocr_service.extract_invoice_data(str(pdf_file))
    
    print("\n提取结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    
    # 特别关注销售方信息
    if result.get('status') == 'success':
        structured_data = result.get('structured_data')
        if structured_data:
            print(f"\n结构化数据中的销售方信息:")
            print(f"  seller_name: {structured_data.get('seller_info', {}).get('name')}")
            print(f"  seller_tax_id: {structured_data.get('seller_info', {}).get('tax_id')}")
            
            print(f"\n结构化数据中的购买方信息:")
            print(f"  buyer_name: {structured_data.get('buyer_info', {}).get('name')}")
            print(f"  buyer_tax_id: {structured_data.get('buyer_info', {}).get('tax_id')}")

if __name__ == "__main__":
    asyncio.run(test_extraction())