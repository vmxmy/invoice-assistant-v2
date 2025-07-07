#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试不同的预处理选项对发票文本的影响
"""
import re
from invoice2data.input import pdftotext

def test_preprocessing():
    """测试预处理选项"""
    # 失败的发票
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"
    
    # 提取原始文本
    text = pdftotext.to_text(pdf_path)
    print("原始文本（前200字符）:")
    print(repr(text[:200]))
    print()
    
    # 测试不同的预处理
    print("测试预处理选项:")
    print("-" * 80)
    
    # 1. 删除所有空格
    text_no_space = re.sub(" +", "", text)
    print("1. 删除所有空格后:")
    print(repr(text_no_space[:200]))
    print()
    
    # 2. 压缩多个空格为一个
    text_compress_space = re.sub(" +", " ", text)
    print("2. 压缩多个空格后:")
    print(repr(text_compress_space[:200]))
    print()
    
    # 3. 自定义替换 - 修复常见的分隔问题
    replacements = [
        (r'发\s*票\s*号\s*码', '发票号码'),
        (r'开\s*票\s*日\s*期', '开票日期'),
        (r'电\s*子\s*发\s*票', '电子发票'),
        (r'普\s*通\s*发\s*票', '普通发票'),
        (r'统一社会信用代码\s*/\s*纳税人识别号', '统一社会信用代码/纳税人识别号'),
    ]
    
    text_replaced = text
    for pattern, replacement in replacements:
        text_replaced = re.sub(pattern, replacement, text_replaced)
    
    print("3. 自定义替换后:")
    print(repr(text_replaced[:200]))
    print()
    
    # 测试正则匹配
    print("测试正则匹配:")
    print("-" * 80)
    
    # 原始模板正则
    patterns = {
        '原始发票号码': r'发票号码[：:]\s*(\d+)',
        '原始日期': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
    }
    
    # 改进的正则（支持字符间空格）
    improved_patterns = {
        '改进发票号码': r'发\s*票\s*号\s*码\s*[：:]\s*(\d+)',
        '改进日期': r'开\s*票\s*日\s*期\s*[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
    }
    
    # 测试原始文本
    print("\n在原始文本中:")
    for name, pattern in {**patterns, **improved_patterns}.items():
        match = re.search(pattern, text)
        if match:
            print(f"✓ {name}: {match.group(1)}")
        else:
            print(f"✗ {name}: 未找到")
    
    # 测试替换后的文本
    print("\n在替换后的文本中:")
    for name, pattern in patterns.items():
        match = re.search(pattern, text_replaced)
        if match:
            print(f"✓ {name}: {match.group(1)}")
        else:
            print(f"✗ {name}: 未找到")

if __name__ == "__main__":
    test_preprocessing()