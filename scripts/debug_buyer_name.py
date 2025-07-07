#!/usr/bin/env python3
"""
调试火车票购买方名称正则表达式
"""

import fitz  # PyMuPDF
import re
from pathlib import Path

def analyze_buyer_pattern():
    """分析购买方名称模式"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    if not Path(pdf_path).exists():
        print(f"文件不存在: {pdf_path}")
        return
    
    print("🔍 分析购买方名称模式")
    print("=" * 50)
    
    # 使用PyMuPDF提取文本
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    print("原始文本内容：")
    print("-" * 30)
    print(repr(text))
    print("-" * 30)
    
    # 查找购买方相关内容
    print("\n🏢 查找购买方相关内容")
    print("-" * 30)
    
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if '购买方' in line or '杭州' in line or '趣链' in line or '公司' in line:
            print(f"行{i}: {repr(line)}")
            if i > 0:
                print(f"  上一行: {repr(lines[i-1])}")
            if i < len(lines) - 1:
                print(f"  下一行: {repr(lines[i+1])}")
            print()
    
    # 测试不同的购买方正则模式
    print("\n🧪 测试购买方正则模式")
    print("-" * 30)
    
    patterns = [
        r"购买方名称:\n([\u4e00-\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团|有限公司|股份有限公司|合伙企业|事务所|中心|厂|店))",
        r"购买方名称:\s*([\u4e00-\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团|有限公司|股份有限公司|合伙企业|事务所|中心|厂|店))",
        r"([\u4e00-\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团|有限公司|股份有限公司|合伙企业|事务所|中心|厂|店))",
        r"杭州[\u4e00-\u9fa5]+公司",
        r"(杭州[\u4e00-\u9fa5]+)",
        r"([\u4e00-\u9fa5]{2,20}公司)",
        r"统一社会信用代码.*?\n([\u4e00-\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团))",
        r"电子客票号.*?\n([\u4e00-\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团))"
    ]
    
    for i, pattern in enumerate(patterns, 1):
        matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
        print(f"模式{i}: {pattern}")
        print(f"匹配结果: {matches}")
        print()

if __name__ == "__main__":
    analyze_buyer_pattern()