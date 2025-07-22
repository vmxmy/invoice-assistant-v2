#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""简单分析失败的PDF"""

import fitz
import re
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

pdf_path = "downloads/25432000000031789815.pdf"

# 1. 提取文本
doc = fitz.open(pdf_path)
text = doc[0].get_text()
doc.close()

print("文本分析:")
print("="*60)

# 查找关键信息
lines = text.split('\n')
for i, line in enumerate(lines):
    if line.strip():
        print(f"{i:3d}: {line}")

print("\n关键信息提取:")
print("-"*40)

# 发票号码
invoice_nums = re.findall(r'\d{20}', text)
print(f"发票号码: {invoice_nums}")

# 日期
dates = re.findall(r'\d{4}年\d{1,2}月\d{1,2}日', text)
print(f"日期: {dates}")

# 金额
amounts = re.findall(r'[¥￥]?([\d,]+\.?\d*)', text)
print(f"金额候选: {amounts}")

# 公司
companies = re.findall(r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心)[\u4e00-\u9fa5]*)', text)
print(f"公司: {companies}")

# 2. 检查为什么invoice2data失败
print("\n检查invoice2data失败原因:")
print("-"*40)

templates = read_templates("app/services/ocr/templates")
print(f"模板数量: {len(templates)}")

# 检查每个模板的关键字
for template in templates:
    issuer = template.get('issuer', 'Unknown')
    keywords = template.get('keywords', [])
    
    # 检查是否有匹配的关键字
    matched = False
    for keyword in keywords:
        if keyword in text:
            matched = True
            print(f"\n模板 '{issuer}' 匹配了关键字: {keyword}")
            break
    
    if matched:
        # 检查字段提取
        fields = template.get('fields', {})
        print(f"  模板有 {len(fields)} 个字段")
        
        # 测试几个关键字段
        for field_name, pattern in fields.items():
            if field_name in ['invoice_number', 'date', 'buyer_name']:
                match = re.search(pattern, text)
                if match:
                    print(f"  {field_name}: 匹配成功 - {match.group(0)[:50]}")
                else:
                    print(f"  {field_name}: 匹配失败 - 模式: {pattern[:50]}...")

# 3. 分析文本结构问题
print("\n文本结构分析:")
print("-"*40)

# 查找买方卖方的位置
for i, line in enumerate(lines):
    if '杭州趣链科技有限公司' in line:
        print(f"买方在第{i}行: {line}")
        if i > 0:
            print(f"  前一行: {lines[i-1]}")
        if i < len(lines) - 1:
            print(f"  后一行: {lines[i+1]}")
    
    if '湖南曾小厨' in line:
        print(f"卖方在第{i}行: {line}")
        if i > 0:
            print(f"  前一行: {lines[i-1]}")
        if i < len(lines) - 1:
            print(f"  后一行: {lines[i+1]}")