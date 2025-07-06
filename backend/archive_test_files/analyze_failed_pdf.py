#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""分析失败的PDF文件"""

import fitz  # PyMuPDF
import camelot

pdf_path = "downloads/25432000000031789815.pdf"

print("="*60)
print(f"分析文件: {pdf_path}")
print("="*60)

# 1. 使用PyMuPDF提取文本
print("\n1. PyMuPDF文本提取:")
print("-"*40)
doc = fitz.open(pdf_path)
for page_num, page in enumerate(doc):
    text = page.get_text()
    print(f"第{page_num+1}页文本:")
    print(text[:500] + "..." if len(text) > 500 else text)
doc.close()

# 2. 使用Camelot提取表格
print("\n2. Camelot表格提取:")
print("-"*40)
try:
    tables = camelot.read_pdf(pdf_path, flavor='stream', pages='1')
    print(f"找到 {tables.n} 个表格")
    if tables.n > 0:
        print("\n第一个表格内容:")
        print(tables[0].df)
        print("\n表格形状:", tables[0].df.shape)
except Exception as e:
    print(f"Stream模式失败: {e}")
    
    try:
        tables = camelot.read_pdf(pdf_path, flavor='lattice', pages='1')
        print(f"Lattice模式找到 {tables.n} 个表格")
        if tables.n > 0:
            print("\n第一个表格内容:")
            print(tables[0].df)
    except Exception as e:
        print(f"Lattice模式也失败: {e}")

# 3. 检查PDF元数据
print("\n3. PDF元数据:")
print("-"*40)
doc = fitz.open(pdf_path)
metadata = doc.metadata
for key, value in metadata.items():
    if value:
        print(f"{key}: {value}")
print(f"页数: {doc.page_count}")
print(f"PDF版本: {doc.get_pdf_str()}")
doc.close()