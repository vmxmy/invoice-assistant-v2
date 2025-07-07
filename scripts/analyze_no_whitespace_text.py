#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分析去除空格后的文本，找出购买方/销售方的模式
"""
import re
from invoice2data.input import pdftotext

def analyze_no_whitespace_pattern():
    """分析去除空格后的文本模式"""
    # 测试几个不同的发票
    pdf_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"
    ]
    
    for pdf_path in pdf_files:
        print(f"\n{'='*80}")
        print(f"文件: {pdf_path.split('/')[-1]}")
        print(f"{'='*80}")
        
        # 提取文本
        text = pdftotext.to_text(pdf_path)
        
        # 模拟 remove_whitespace=true
        text_no_space = re.sub(r'\s+', '', text)
        
        # 查找购买方/销售方区域
        print("\n1. 查找包含购买方/销售方的文本片段:")
        
        # 查找购买方
        buyer_patterns = [
            r'购买方名称[：:]([^销]+)销',
            r'购买方名称[：:]([^统]+)统一社会',
            r'购买方名称[：:]([^息]+)息',
            r'购买方名称[：:]([^方]+)方信',
            r'购名称[：:]([^销]+)销',
        ]
        
        for pattern in buyer_patterns:
            match = re.search(pattern, text_no_space)
            if match:
                print(f"✓ 购买方模式 '{pattern}' 匹配: {match.group(1)}")
                # 查看更多上下文
                start = max(0, match.start() - 20)
                end = min(len(text_no_space), match.end() + 50)
                context = text_no_space[start:end]
                print(f"  上下文: ...{context}...")
                break
        
        # 查找销售方
        seller_patterns = [
            r'销售方名称[：:]([^统]+)统一社会',
            r'销售方名称[：:]([^息]+)息',
            r'销售方名称[：:]([^纳]+)纳税人',
            r'销名称[：:]([^信]+)信',
            r'售方名称[：:]([^信]+)信',
        ]
        
        for pattern in seller_patterns:
            match = re.search(pattern, text_no_space)
            if match:
                print(f"✓ 销售方模式 '{pattern}' 匹配: {match.group(1)}")
                # 查看更多上下文
                start = max(0, match.start() - 20)
                end = min(len(text_no_space), match.end() + 50)
                context = text_no_space[start:end]
                print(f"  上下文: ...{context}...")
                break
        
        # 分析文本结构
        print("\n2. 分析关键位置:")
        # 查找关键标记的位置
        markers = ['购买方名称', '销售方名称', '统一社会信用代码', '息', '信息', '方信']
        for marker in markers:
            pos = text_no_space.find(marker)
            if pos >= 0:
                print(f"'{marker}' 位置: {pos}")
                # 显示该位置附近的文本
                start = max(0, pos - 10)
                end = min(len(text_no_space), pos + len(marker) + 30)
                print(f"  附近文本: ...{text_no_space[start:end]}...")

if __name__ == "__main__":
    analyze_no_whitespace_pattern()