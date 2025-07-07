#!/usr/bin/env python3
"""
调试火车票中的日期信息
"""

import sys
from pathlib import Path
import fitz  # PyMuPDF

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def debug_pdf_dates():
    """调试PDF中的日期信息"""
    
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    if not Path(pdf_path).exists():
        print("PDF文件不存在")
        return
    
    print("🔍 调试火车票PDF中的日期信息")
    print("=" * 60)
    print(f"文件: {Path(pdf_path).name}")
    
    # 读取PDF文本
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()
    
    print("\n📄 PDF完整文本:")
    print("-" * 30)
    print(full_text)
    
    # 分析文本中的日期模式
    import re
    
    print("\n📅 日期模式分析:")
    print("-" * 30)
    
    # 查找所有可能的日期格式
    date_patterns = [
        (r'\d{4}年\d{1,2}月\d{1,2}日', '中文格式'),
        (r'\d{4}-\d{2}-\d{2}', 'ISO格式'),
        (r'\d{2}/\d{2}/\d{4}', '美式格式'),
        (r'\d{4}/\d{2}/\d{2}', '日式格式'),
        (r'\d{1,2}月\d{1,2}日', '简化中文'),
        (r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)', '开票日期'),
        (r'乘车日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)', '乘车日期'),
        (r'(\d{4}年\d{1,2}月\d{1,2}日)\s*[\d:]+开', '发车日期(时间前)'),
        (r'(\d{4}-\d{2}-\d{2})\s*[\d:]+开', '发车日期ISO(时间前)'),
    ]
    
    for pattern, desc in date_patterns:
        matches = re.findall(pattern, full_text)
        if matches:
            print(f"✅ {desc}: {matches}")
        else:
            print(f"❌ {desc}: 无匹配")
    
    print("\n🔍 上下文分析:")
    print("-" * 30)
    
    # 查找包含日期的行
    lines = full_text.split('\n')
    for i, line in enumerate(lines):
        if re.search(r'\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{2}-\d{2}', line):
            print(f"行{i+1}: {line.strip()}")
            # 显示前后行的上下文
            if i > 0:
                print(f"  前行: {lines[i-1].strip()}")
            if i < len(lines) - 1:
                print(f"  后行: {lines[i+1].strip()}")
            print()

if __name__ == "__main__":
    debug_pdf_dates()