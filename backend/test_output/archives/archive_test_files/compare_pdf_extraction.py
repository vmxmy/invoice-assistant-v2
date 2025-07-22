#!/usr/bin/env python3
"""
比较不同PDF提取方法的结果
"""

import sys
from pathlib import Path
import subprocess

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

pdf_file = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"

print("📊 比较不同PDF文本提取方法")
print("=" * 80)

# 1. 使用pdftotext命令（invoice2data的方法）
print("\n1. pdftotext命令（invoice2data原生方法）:")
print("-" * 60)
try:
    cmd = ["pdftotext", "-layout", "-enc", "UTF-8", pdf_file, "-"]
    out, err = subprocess.Popen(cmd, stdout=subprocess.PIPE).communicate()
    pdftotext_result = out.decode('utf-8')
    
    lines = pdftotext_result.split('\n')[:20]
    for i, line in enumerate(lines):
        if line.strip():
            print(f"{i+1:3d}: {repr(line)}")
            
except Exception as e:
    print(f"❌ 失败: {e}")

# 2. 使用pdfplumber
print("\n\n2. pdfplumber方法:")
print("-" * 60)
try:
    import pdfplumber
    with pdfplumber.open(pdf_file) as pdf:
        pdfplumber_result = pdf.pages[0].extract_text()
    
    lines = pdfplumber_result.split('\n')[:20]
    for i, line in enumerate(lines):
        if line.strip():
            print(f"{i+1:3d}: {repr(line)}")
            
except Exception as e:
    print(f"❌ 失败: {e}")

# 3. 关键差异分析
print("\n\n3. 关键差异分析:")
print("-" * 60)

# 查找发票号码行
print("\n发票号码行对比:")
for i, line in enumerate(pdftotext_result.split('\n')):
    if '25442000000101203423' in line:
        print(f"pdftotext: 第{i+1}行 - {repr(line)}")
        break

for i, line in enumerate(pdfplumber_result.split('\n')):
    if '25442000000101203423' in line:
        print(f"pdfplumber: 第{i+1}行 - {repr(line)}")
        break

# 查找日期行
print("\n日期行对比:")
for i, line in enumerate(pdftotext_result.split('\n')):
    if '2025年02月24日' in line:
        print(f"pdftotext: 第{i+1}行 - {repr(line)}")
        break

for i, line in enumerate(pdfplumber_result.split('\n')):
    if '2025年02月24日' in line:
        print(f"pdfplumber: 第{i+1}行 - {repr(line)}")
        break

# 查找购买方/销售方行
print("\n购买方/销售方行对比:")
for i, line in enumerate(pdftotext_result.split('\n')):
    if '杭州趣链科技有限公司' in line:
        print(f"pdftotext: 第{i+1}行 - {repr(line)}")
        break

for i, line in enumerate(pdfplumber_result.split('\n')):
    if '杭州趣链科技有限公司' in line:
        print(f"pdfplumber: 第{i+1}行 - {repr(line)}")
        break