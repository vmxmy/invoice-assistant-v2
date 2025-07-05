#!/usr/bin/env python3
"""
分析PDF文本结构以优化正则表达式
"""

from pdfminer.high_level import extract_text
import re

def analyze_pdf_structure():
    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    text = extract_text(pdf_path)
    
    print('=== PDF原始文本结构分析 ===')
    print('前1500字符:')
    print(text[:1500])
    print()
    
    print('=== 查找销售方相关信息 ===')
    # 查找包含销售方的行
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if '销售方' in line or '售方' in line:
            print(f'行{i}: "{line.strip()}"')
            # 显示前后几行的上下文
            for j in range(max(0, i-2), min(len(lines), i+3)):
                if j != i:
                    print(f'  {j}: "{lines[j].strip()}"')
            print()
    
    print('=== 查找购买方相关信息 ===')
    for i, line in enumerate(lines):
        if '购买方' in line or '买方' in line:
            print(f'行{i}: "{line.strip()}"')
            # 显示前后几行的上下文
            for j in range(max(0, i-2), min(len(lines), i+3)):
                if j != i:
                    print(f'  {j}: "{lines[j].strip()}"')
            print()
    
    print('=== 测试各种正则表达式模式 ===')
    
    # 测试不同的销售方正则模式
    seller_patterns = [
        r'销售方信息\s*名称[：:]\s*([^\n]+)',
        r'销\s*售\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
        r'销售方[^名]*名称[：:]\s*([^\n]+)',
        r'名称[：:]\s*([^\n]*(?:有限公司|企业|商行|商店|工厂|中心|公司)[^\n]*)',
        r'销售方信息.*?名称[：:]\s*([^\n]+)',
        r'销售方.*?名称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*)',
    ]
    
    print('销售方名称测试:')
    for i, pattern in enumerate(seller_patterns, 1):
        match = re.search(pattern, text, re.DOTALL)
        if match:
            print(f'  模式{i}: ✅ "{match.group(1).strip()}"')
        else:
            print(f'  模式{i}: ❌ 无匹配')
    print()
    
    # 测试不同的购买方正则模式
    buyer_patterns = [
        r'购买方信息\s*名称[：:]\s*([^\n]+)',
        r'购\s*买\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
        r'购买方[^名]*名称[：:]\s*([^\n]+)',
        r'购买方信息.*?名称[：:]\s*([^\n]+)',
        r'购买方.*?名称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*)',
    ]
    
    print('购买方名称测试:')
    for i, pattern in enumerate(buyer_patterns, 1):
        match = re.search(pattern, text, re.DOTALL)
        if match:
            print(f'  模式{i}: ✅ "{match.group(1).strip()}"')
        else:
            print(f'  模式{i}: ❌ 无匹配')
    print()
    
    # 查找HTML表格结构
    print('=== HTML表格结构分析 ===')
    if '<table' in text:
        print('发现HTML表格结构')
        # 提取表格内容
        table_matches = re.findall(r'<table[^>]*>(.*?)</table>', text, re.DOTALL)
        for i, table in enumerate(table_matches):
            print(f'表格{i+1}:')
            print(table[:500] + '...' if len(table) > 500 else table)
            print()

if __name__ == "__main__":
    analyze_pdf_structure()