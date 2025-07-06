#!/usr/bin/env python3
"""
调试预处理后的文本，查看完整结构
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.custom_pdf_input import to_text

pdf_file = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"

print("🔍 调试预处理后的文本")
print("=" * 80)

# 获取预处理后的文本
text = to_text(pdf_file)

# 显示完整文本，标记行号
lines = text.split('\n')
for i, line in enumerate(lines):
    if line.strip():  # 只显示非空行
        print(f"{i+1:3d}: {repr(line)}")

# 查找关键信息位置
print("\n\n📍 关键信息位置:")
print("-" * 60)

import re

# 查找发票号码
for i, line in enumerate(lines):
    if '25442000000101203423' in line:
        print(f"发票号码在第 {i+1} 行: {repr(line)}")
        # 显示上下文
        if i > 0:
            print(f"  前一行: {repr(lines[i-1])}")
        if i < len(lines) - 1:
            print(f"  后一行: {repr(lines[i+1])}")

# 查找日期
for i, line in enumerate(lines):
    if '2025年02月24日' in line:
        print(f"\n日期在第 {i+1} 行: {repr(line)}")

# 查找购买方/销售方
for i, line in enumerate(lines):
    if '杭州趣链科技有限公司' in line:
        print(f"\n公司名称在第 {i+1} 行: {repr(line)}")
        
# 测试正则表达式
print("\n\n🧪 测试正则表达式匹配:")
print("-" * 60)

patterns = {
    "发票号码1": r'发\s*票\s*号\s*码\s*：\s*(\d+)',
    "发票号码2": r'发票号码:\s*(\d+)',
    "发票号码3": r'(\d{20})',
    "日期1": r'开\s*票\s*日\s*期\s*：\s*(\d{4}年\d{1,2}月\d{1,2}日)',
    "日期2": r'开票日期:\s*(\d{4}年\d{1,2}月\d{1,2}日)',
    "日期3": r'(\d{4}年\d{1,2}月\d{1,2}日)',
}

for name, pattern in patterns.items():
    matches = re.findall(pattern, text)
    if matches:
        print(f"✅ {name}: {matches}")
    else:
        print(f"❌ {name}: 无匹配")