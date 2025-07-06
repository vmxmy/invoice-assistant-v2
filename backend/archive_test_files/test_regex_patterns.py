#!/usr/bin/env python3
"""
测试销售方名称提取的正则表达式
"""

import re
from pathlib import Path
from invoice2data.input import pdftotext

# 提取PDF文本
pdf_file = Path('downloads/25432000000031789815.pdf')
text = pdftotext.to_text(str(pdf_file))

print('测试正则表达式匹配:')
print('='*60)

# 测试销售方名称提取
test_patterns = [
    ('原始模式', r'销\s*名称：([^\n]+)'),
    ('优化模式1', r'销\s*名称[：:]\s*(.+?)(?:\s*$)'),
    ('优化模式2', r'销\s*名称[：:]\s*([^$\n]+?)$'),
    ('精确模式', r'销\s*名称[：:]\s*([^\s].*?)(?:\s*$)'),
    ('贪婪模式', r'销\s*名称[：:](.+)$'),
]

# 找到包含销售方的行
lines = text.split('\n')
for line in lines:
    if '销' in line and '名称' in line:
        print(f'\n原始行: {repr(line)}')
        print(f'行长度: {len(line)}')
        
        # 显示行的最后20个字符
        print(f'行尾部分: {repr(line[-30:])}')
        
        for name, pattern in test_patterns:
            match = re.search(pattern, line)
            if match:
                print(f'\n{name} 匹配成功:')
                print(f'  匹配内容: "{match.group(1)}"')
                print(f'  匹配长度: {len(match.group(1))}')
            else:
                print(f'\n{name} 匹配失败')
        
        # 测试分割方式
        print('\n\n使用分割方式提取:')
        if '销 名称' in line:
            parts = line.split('销 名称')
            if len(parts) > 1:
                seller_part = parts[1]
                print(f'  销售方部分: {repr(seller_part)}')
                # 提取冒号后的内容
                if '：' in seller_part or ':' in seller_part:
                    seller_name = re.sub(r'^[：:]', '', seller_part).strip()
                    print(f'  提取的销售方名称: "{seller_name}"')