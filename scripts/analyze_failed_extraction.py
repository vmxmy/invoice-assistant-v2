#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分析失败的金额提取案例
"""
import re
from invoice2data.input import pdftotext
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

def analyze_failed_case():
    """分析失败案例"""
    # 选择一个失败的案例
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底市娄星区萝卜餐饮店-1018.00-25432000000029373425.pdf"
    
    print(f"分析发票: 娄底萝卜餐饮店")
    print("期望: 总额¥1018.00, 税前¥960.38, 税额¥57.62")
    print("实际: 总额¥1018.00, 税前¥1007.92, 税额¥10.08")
    print("=" * 80)
    
    # 提取原始文本
    text = pdftotext.to_text(pdf_path)
    
    # 模拟remove_whitespace处理
    text_no_space = re.sub(r'\s+', '', text)
    
    # 查找金额相关区域
    print("\n1. 查找金额区域:")
    
    # 查找合计区域
    pos = text_no_space.find('合计')
    if pos >= 0:
        start = max(0, pos - 20)
        end = min(len(text_no_space), pos + 150)
        print(f"合计区域: ...{text_no_space[start:end]}...")
    
    # 查找价税合计区域
    pos = text_no_space.find('价税合计')
    if pos >= 0:
        start = max(0, pos - 20)
        end = min(len(text_no_space), pos + 100)
        print(f"\n价税合计区域: ...{text_no_space[start:end]}...")
    
    print("\n2. 使用当前模板提取:")
    template_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates"
    templates = read_templates(template_dir)
    
    result = extract_data(pdf_path, templates=templates)
    if result:
        print(f"amount: {result.get('amount')}")
        print(f"amount_pretax: {result.get('amount_pretax')}")
        print(f"tax_amount: {result.get('tax_amount')}")
        print(f"使用模板: {result.get('desc', 'unknown')}")
    
    print("\n3. 手动测试正则表达式:")
    
    # 测试税前金额正则
    pretax_pattern = r'合计[¥￥]([0-9,]+\.?\d*)[¥￥]'
    match = re.search(pretax_pattern, text_no_space)
    if match:
        print(f"税前金额正则匹配: {match.group(1)}")
    else:
        print("税前金额正则未匹配")
    
    # 测试税额正则
    tax_pattern = r'合计[¥￥][0-9,]+\.?\d*[¥￥]([0-9,]+\.?\d*)'
    match = re.search(tax_pattern, text_no_space)
    if match:
        print(f"税额正则匹配: {match.group(1)}")
    else:
        print("税额正则未匹配")
        
    # 更灵活的税额提取
    print("\n4. 尝试更灵活的模式:")
    # 查找所有金额
    amounts = re.findall(r'[¥￥]([0-9,]+\.?\d*)', text_no_space)
    print(f"找到的所有金额: {amounts[:10]}")  # 只显示前10个
    
    # 查找合计行的所有数字
    pos = text_no_space.find('合计')
    if pos >= 0:
        # 提取合计后的一段文本
        segment = text_no_space[pos:pos+100]
        numbers = re.findall(r'([0-9,]+\.?\d+)', segment)
        print(f"\n合计行附近的数字: {numbers}")

if __name__ == "__main__":
    analyze_failed_case()