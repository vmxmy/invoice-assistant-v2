#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""深度分析失败的PDF"""

import fitz
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

pdf_path = "downloads/25432000000031789815.pdf"

# 1. 提取完整文本查看格式
doc = fitz.open(pdf_path)
page = doc[0]
text = page.get_text()
doc.close()

print("原始文本内容:")
print("="*60)
print(text)
print("="*60)

# 2. 测试invoice2data
templates = read_templates("app/services/ocr/templates")
print(f"\n加载了 {len(templates)} 个模板")

# 使用PyMuPDF输入模块
from app.services.ocr import pymupdf_input
result = extract_data(pdf_path, templates=templates, input_module=pymupdf_input)

print("\ninvoice2data结果:")
if result:
    for key, value in result.items():
        print(f"  {key}: {value}")
else:
    print("  无匹配结果")

# 3. 分析为什么没有匹配
print("\n分析模板匹配:")
for i, template in enumerate(templates):
    print(f"\n模板{i+1}: {template.get('issuer', 'Unknown')}")
    keywords = template.get('keywords', [])
    print(f"  关键字: {keywords}")
    
    # 检查关键字是否在文本中
    matched_keywords = []
    for keyword in keywords:
        if keyword in text:
            matched_keywords.append(keyword)
    
    if matched_keywords:
        print(f"  匹配的关键字: {matched_keywords}")
    else:
        print("  无匹配关键字")

# 4. 手动提取看看
import re
print("\n手动提取测试:")
print("-"*40)

# 发票号码
invoice_num = re.search(r'(\d{20})', text)
if invoice_num:
    print(f"发票号码: {invoice_num.group(1)}")

# 开票日期
date = re.search(r'(\d{4}年\d{1,2}月\d{1,2}日)', text)
if date:
    print(f"开票日期: {date.group(1)}")

# 金额
amount = re.search(r'¥([\d.]+)', text)
if amount:
    print(f"金额: {amount.group(1)}")

# 公司名称
companies = re.findall(r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心)[\u4e00-\u9fa5]*)', text)
print(f"找到的公司: {companies}")