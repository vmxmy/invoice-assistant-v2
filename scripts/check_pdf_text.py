#!/usr/bin/env python3
"""
检查PDF文本内容，了解销售方信息的实际格式
"""

import sys
from pathlib import Path
from invoice2data.input import pdftotext

# 选择一个测试文件
downloads_dir = Path("downloads")
pdf_files = list(downloads_dir.glob("*.pdf"))

if not pdf_files:
    print("没有找到PDF文件")
    sys.exit(1)

# 测试第一个文件
pdf_file = pdf_files[0]
print(f"检查文件: {pdf_file.name}")
print("="*60)

# 提取文本
text = pdftotext.to_text(str(pdf_file))
print("提取的文本内容:")
print("-"*60)

# 显示前2000个字符
print(text[:2000])
print("-"*60)

# 查找销售方相关的文本
print("\n销售方相关文本:")
lines = text.split('\n')
for i, line in enumerate(lines):
    if '销' in line or '售' in line or '名称' in line:
        # 显示该行及前后各2行
        start = max(0, i-2)
        end = min(len(lines), i+3)
        print(f"\n位置 {i}:")
        for j in range(start, end):
            marker = ">>>" if j == i else "   "
            print(f"{marker} {j:3d}: {lines[j]}")

# 查找包含公司名称的行
print("\n\n可能的公司名称:")
for i, line in enumerate(lines):
    if '公司' in line or '有限' in line or '股份' in line:
        print(f"  {i:3d}: {line}")