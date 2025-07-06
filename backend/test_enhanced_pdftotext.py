#!/usr/bin/env python3
"""
测试增强的pdftotext
"""

import sys
from pathlib import Path
import asyncio

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.enhanced_pdftotext import to_text
from app.services.ocr.service import OCRService

pdf_file = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"

print("🧪 测试增强的pdftotext")
print("=" * 80)

# 1. 测试增强的pdftotext
print("\n1. 增强的pdftotext输出:")
print("-" * 60)

try:
    text = to_text(pdf_file)
    
    # 显示前30行
    lines = text.split('\n')
    for i, line in enumerate(lines[:30]):
        if line.strip():
            print(f"{i+1:3d}: {repr(line)}")
    
    # 检查关键修复
    print("\n\n2. 检查预处理效果:")
    print("-" * 60)
    
    if "⼦" not in text and "子" in text:
        print("✅ Unicode变体字符已修复")
    else:
        print("❌ Unicode变体字符未修复")
    
    if "电子发票" in text:
        print("✅ '电子发票'已修复")
    
    if "统一发票监制" in text:
        print("✅ '统一发票监制'已修复")
        
    if "买名称：" in text and "售名称：" in text:
        print("✅ '买名称'和'售名称'已修复")
    
    # 查找关键信息
    print("\n\n3. 查找关键信息:")
    print("-" * 60)
    
    for i, line in enumerate(lines):
        if '发票号码' in line and '25442000000101203423' in line:
            print(f"发票号码行: {repr(line.strip())}")
        if '开票日期' in line and '2025年02月24日' in line:
            print(f"开票日期行: {repr(line.strip())}")
        if '杭州趣链科技有限公司' in line:
            print(f"公司名称行: {repr(line.strip())}")
            
except Exception as e:
    print(f"❌ 失败: {e}")
    import traceback
    traceback.print_exc()

# 2. 测试OCR服务
print("\n\n4. 测试OCR服务:")
print("-" * 60)

async def test_ocr():
    async with OCRService() as ocr:
        result = await ocr.extract_invoice_data(pdf_file)
        
        if result['status'] == 'success':
            print("✅ OCR提取成功!")
            print(f"   发票号码: {result.get('invoice_number')}")
            print(f"   开票日期: {result.get('invoice_date')}")
            print(f"   买方名称: {result.get('buyer_name')}")
            print(f"   卖方名称: {result.get('seller_name')}")
            print(f"   总金额: {result.get('total_amount')}")
        else:
            print(f"❌ OCR提取失败: {result.get('error')}")

asyncio.run(test_ocr())