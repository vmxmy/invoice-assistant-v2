#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分析金额提取模式
"""
import re
from invoice2data.input import pdftotext

def analyze_amount_patterns():
    """分析不同发票的金额模式"""
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"
    ]
    
    for pdf_path in test_files:
        print(f"\n{'='*80}")
        print(f"文件: {pdf_path.split('/')[-1]}")
        print(f"{'='*80}")
        
        # 提取文本
        text = pdftotext.to_text(pdf_path)
        
        # 模拟 remove_whitespace=true
        text_no_space = re.sub(r'\s+', '', text)
        
        # 查找金额相关的文本
        print("\n1. 查找金额相关区域:")
        
        # 查找价税合计附近的文本
        pos = text_no_space.find('价税合计')
        if pos >= 0:
            start = max(0, pos - 50)
            end = min(len(text_no_space), pos + 100)
            print(f"价税合计区域: {text_no_space[start:end]}")
        
        # 查找合计附近的文本
        pos = text_no_space.find('合计')
        if pos >= 0:
            start = max(0, pos - 50)
            end = min(len(text_no_space), pos + 100)
            print(f"合计区域: {text_no_space[start:end]}")
        
        print("\n2. 测试不同的金额提取模式:")
        
        # 当前模式（提取多个金额）
        current_pattern = r'(?:价税合计[（(]小写[）)][¥￥]|小写[）)][¥￥]|[¥￥])([0-9,]+\.?\d*)'
        matches = re.findall(current_pattern, text_no_space)
        print(f"当前模式结果: {matches}")
        
        # 专门提取价税合计（总金额）
        total_patterns = [
            r'价税合计[（(]小写[）)][¥￥]([0-9,]+\.?\d*)',
            r'小写[）)][¥￥]([0-9,]+\.?\d*)',
            r'价税合计.*?[¥￥]([0-9,]+\.?\d*)(?=备|收款|开票)',
        ]
        
        for pattern in total_patterns:
            match = re.search(pattern, text_no_space)
            if match:
                print(f"总金额模式 '{pattern[:30]}...' 找到: {match.group(1)}")
        
        # 提取税前金额（货物金额）
        pretax_patterns = [
            r'合计[¥￥]([0-9,]+\.?\d*)[¥￥]([0-9,]+\.?\d*)',  # 合计后的第一个金额
            r'金额税率.*?([0-9,]+\.?\d*)(?=\d+%)',  # 项目金额
        ]
        
        for pattern in pretax_patterns:
            match = re.search(pattern, text_no_space)
            if match:
                print(f"税前金额模式找到: {match.group(1)}")

if __name__ == "__main__":
    analyze_amount_patterns()