#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
精确测试正则模式
"""
import re

def test_exact_pattern():
    # 从前面的测试中获取的替换后文本片段
    text_samples = [
        "发票号码 ： 25432000000031789815",  # 注意冒号前有空格
        "开票日期 ： 2025年03月12日",
        "发票号码： 25432000000031789815",   # 标准格式
        "开票日期： 2025年03月12日"
    ]
    
    # 测试不同的正则模式
    patterns = {
        '原始模式': {
            'invoice': r'发票号码[：:]\s*(\d+)',
            'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)'
        },
        '改进模式（支持冒号前空格）': {
            'invoice': r'发票号码\s*[：:]\s*(\d+)',
            'date': r'开票日期\s*[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)'
        }
    }
    
    print("测试正则模式匹配:")
    print("="*80)
    
    for text in text_samples:
        print(f"\n测试文本: '{text}'")
        for pattern_name, pattern_dict in patterns.items():
            print(f"\n  {pattern_name}:")
            # 测试发票号码
            if '发票号码' in text:
                match = re.search(pattern_dict['invoice'], text)
                if match:
                    print(f"    ✓ 发票号码: {match.group(1)}")
                else:
                    print(f"    ✗ 发票号码: 未匹配")
            # 测试日期
            if '开票日期' in text:
                match = re.search(pattern_dict['date'], text)
                if match:
                    print(f"    ✓ 日期: {match.group(1)}")
                else:
                    print(f"    ✗ 日期: 未匹配")

if __name__ == "__main__":
    test_exact_pattern()