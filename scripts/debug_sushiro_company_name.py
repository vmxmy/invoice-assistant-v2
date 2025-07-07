#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
调试广州寿司郎发票的公司名称提取
"""
import re
from invoice2data.input import pdftotext

def debug_sushiro():
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf"
    
    # 提取文本
    text = pdftotext.to_text(pdf_path)
    
    # 模拟 remove_whitespace=true
    text_no_space = re.sub(r'\s+', '', text)
    
    print("调试广州寿司郎发票")
    print("="*80)
    
    # 查找购买方/销售方区域
    print("\n1. 查找关键词位置:")
    keywords = ['购', '销', '买', '售', '方', '名', '称', '杭州', '广州', '寿司郎']
    for kw in keywords:
        pos = text_no_space.find(kw)
        if pos >= 0:
            # 显示该位置附近的文本
            start = max(0, pos - 20)
            end = min(len(text_no_space), pos + 40)
            print(f"'{kw}' at {pos}: ...{text_no_space[start:end]}...")
    
    print("\n2. 查找购买方/销售方模式:")
    # 查找可能的购买方名称位置
    patterns = [
        r'购([^：:]+)[：:]',
        r'买([^：:]+)[：:]',
        r'购买方([^：:]+)[：:]',
        r'下载次数[：:]\d+(.{20,40})统一社会',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text_no_space)
        if matches:
            print(f"模式 '{pattern}' 找到: {matches}")
    
    # 直接查找公司名称
    print("\n3. 直接查找公司名称:")
    if '杭州趣链科技有限公司' in text_no_space:
        pos = text_no_space.find('杭州趣链科技有限公司')
        start = max(0, pos - 30)
        end = min(len(text_no_space), pos + 60)
        print(f"找到购买方公司: ...{text_no_space[start:end]}...")
    
    if '广州寿司郎餐饮有限公司' in text_no_space:
        pos = text_no_space.find('广州寿司郎餐饮有限公司')
        start = max(0, pos - 30)
        end = min(len(text_no_space), pos + 60)
        print(f"找到销售方公司: ...{text_no_space[start:end]}...")

if __name__ == "__main__":
    debug_sushiro()