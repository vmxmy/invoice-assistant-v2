#!/usr/bin/env python3
"""
测试文本预处理效果
"""

import sys
from pathlib import Path
import asyncio

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.custom_pdf_input import to_text
from app.services.ocr.service import OCRService

# 测试文件 - 使用有编码问题的发票
pdf_file = Path("/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf")

print("="*60)
print("测试文本预处理")
print("="*60)

# 1. 获取原始文本（不使用预处理）
print("\n1. 原始文本提取:")
print("-"*40)
try:
    # 使用pdfplumber直接提取
    import pdfplumber
    with pdfplumber.open(pdf_file) as pdf:
        raw_text = pdf.pages[0].extract_text()
    
    # 显示前10行
    lines = raw_text.split('\n')[:10]
    for i, line in enumerate(lines):
        print(f"Line {i}: {repr(line)}")
    
    # 检查问题
    print("\n原始文本中的问题:")
    if "⼦" in raw_text:
        print("❌ 发现Unicode变体字符: '⼦'")
    if "电⼦发票" in raw_text:
        print("❌ 发现问题文本: '电⼦发票'")
    
    import re
    space_issues = re.findall(r'[购销]\s+[名买售]\s*[称方]', raw_text)
    if space_issues:
        print(f"❌ 发现空格问题: {space_issues[:3]}")
        
except Exception as e:
    print(f"❌ 原始文本提取失败: {e}")

# 2. 使用预处理提取
print("\n\n2. 预处理后的文本:")
print("-"*40)
try:
    preprocessed_text = to_text(str(pdf_file))
    
    # 显示前10行
    lines = preprocessed_text.split('\n')[:10]
    for i, line in enumerate(lines):
        print(f"Line {i}: {repr(line)}")
    
    # 检查修复效果
    print("\n预处理效果:")
    if "⼦" not in preprocessed_text and "子" in preprocessed_text:
        print("✅ Unicode变体字符已修复: '⼦' → '子'")
    
    if "电子发票" in preprocessed_text:
        print("✅ 文本正常化: '电⼦发票' → '电子发票'")
    
    import re
    space_issues = re.findall(r'[购销]\s+[名买售]\s*[称方]', preprocessed_text)
    if not space_issues:
        print("✅ 空格问题已修复")
    
    # 检查关键词
    keywords = ['购名称', '销名称', '发票号码', '开票日期', '价税合计']
    for kw in keywords:
        if kw in preprocessed_text:
            print(f"✅ 找到关键词: {kw}")
            
except Exception as e:
    print(f"❌ 预处理失败: {e}")
    import traceback
    traceback.print_exc()

# 3. 测试OCR提取
print("\n\n3. 测试OCR服务:")
print("-"*40)

async def test_ocr():
    async with OCRService() as ocr:
        result = await ocr.extract_invoice_data(str(pdf_file))
        
        if result['status'] == 'success':
            print("✅ OCR提取成功!")
            print(f"   发票号码: {result.get('invoice_number')}")
            print(f"   开票日期: {result.get('invoice_date')}")
            print(f"   买方名称: {result.get('buyer_name')}")
            print(f"   卖方名称: {result.get('seller_name')}")
            print(f"   总金额: {result.get('total_amount')}")
        else:
            print(f"❌ OCR提取失败: {result.get('error')}")

# 运行异步测试
asyncio.run(test_ocr())