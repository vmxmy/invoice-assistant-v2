#!/usr/bin/env python3
"""
测试新的OCR服务v4实现
"""

import asyncio
import json
import os
import sys
from pathlib import Path
import glob

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.ocr_service_v4 import OCRServiceV4
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def test_ocr_service():
    """测试OCR服务"""
    print("开始测试OCR服务v4...\n")
    
    ocr_service = OCRServiceV4()
    
    # 1. 测试健康检查
    print("1. 测试健康检查")
    health = await ocr_service.health_check()
    print(f"健康状态: {json.dumps(health, indent=2, ensure_ascii=False)}\n")
    
    # 2. 测试文件提取
    pdf_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/downloads"
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    
    if pdf_files:
        # 选择一个较小的文件进行测试
        test_file = min(pdf_files, key=lambda x: Path(x).stat().st_size)
        
        print(f"2. 测试发票数据提取")
        print(f"测试文件: {Path(test_file).name}")
        print(f"文件大小: {Path(test_file).stat().st_size / 1024:.2f} KB\n")
        
        result = await ocr_service.extract_invoice_data(test_file)
        
        print("提取结果:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        # 分析结果
        if result.get("status") == "success":
            print(f"\n✅ 提取成功!")
            structured_data = result.get("structured_data", {})
            main_info = structured_data.get("main_info", {})
            seller_info = structured_data.get("seller_info", {})
            summary = structured_data.get("summary", {})
            
            print(f"发票号: {main_info.get('invoice_number')}")
            print(f"销售方: {seller_info.get('name')}")
            print(f"金额: ¥{summary.get('total_amount', 0)}")
            print(f"置信度: {result.get('confidence', 0):.2%}")
            
            if result.get("extraction_method") == "mineru_api_v4":
                print(f"ZIP结果URL: {result.get('zip_url')}")
        else:
            print(f"\n❌ 提取失败: {result.get('error')}")
    else:
        print("2. 未找到测试文件")
    
    print("\n=== 测试完成 ===")


if __name__ == "__main__":
    asyncio.run(test_ocr_service())