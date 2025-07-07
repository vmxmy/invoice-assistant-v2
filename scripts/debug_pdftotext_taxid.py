#!/usr/bin/env python3
"""
调试pdftotext中的税号提取
"""

import re
from invoice2data.input import pdftotext
from pathlib import Path

def debug_taxid():
    """调试税号提取"""
    
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326164322/2025-03-26-阿斯兰航空服务（上海）有限公司-192.00-25317000000510550926.pdf"
    
    if not Path(pdf_path).exists():
        print(f"❌ 文件不存在: {pdf_path}")
        return
    
    print("🔍 调试pdftotext税号提取")
    print("=" * 80)
    
    # 获取文本
    text = pdftotext.to_text(pdf_path)
    
    # 查找包含税号的行
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if '纳税人识别号' in line or '91330108MA27Y5XH5G' in line or '913101150529904218' in line:
            print(f"Line {i}: {repr(line)}")
            if i > 0:
                print(f"  前行: {repr(lines[i-1])}")
            if i < len(lines) - 1:
                print(f"  后行: {repr(lines[i+1])}")
            print()
    
    print("\n🧪 测试不同的正则表达式:")
    print("-" * 40)
    
    patterns = [
        # 简单模式
        ('税号1', r'91330108MA27Y5XH5G'),
        ('税号2', r'913101150529904218'),
        ('所有税号', r'[0-9]{15,20}[A-Z0-9]*'),
        
        # 带上下文的模式
        ('购买方税号', r'买.*?([0-9]{15,20}[A-Z0-9]*)'),
        ('销售方税号', r'售.*?([0-9]{15,20}[A-Z0-9]*)'),
        
        # 基于行位置
        ('第一个税号', r'统一社会信用代码/纳税人识别号:\s*([A-Z0-9]{15,20})'),
        ('第二个税号', r'统一社会信用代码/纳税人识别号:\s*[A-Z0-9]{15,20}.*?统一社会信用代码/纳税人识别号:\s*([A-Z0-9]{15,20})'),
    ]
    
    for name, pattern in patterns:
        matches = re.findall(pattern, text, re.DOTALL)
        if matches:
            print(f"✅ {name}: {matches}")
        else:
            print(f"❌ {name}: 无匹配")

if __name__ == "__main__":
    debug_taxid()