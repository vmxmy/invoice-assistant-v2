#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
分析金额提取失败的原因
"""

import json
import os
from test_enhanced_standalone import StandaloneEnhancedExtractor
import fitz  # PyMuPDF

def analyze_missing_amounts():
    """分析金额提取失败的文件"""
    
    # 读取测试结果
    with open('enhanced_rule_all_pdfs_test_20250706_102034.json', 'r', encoding='utf-8') as f:
        test_data = json.load(f)
    
    # 找到金额为null的文件
    missing_amount_files = []
    for result in test_data['detailed_results']:
        if result.get('success') and not result.get('total_amount'):
            missing_amount_files.append(result)
    
    print(f"金额提取失败分析")
    print("="*80)
    print(f"总文件数: {test_data['test_info']['total_files']}")
    print(f"金额提取成功: {test_data['field_extraction_rates']['金额']['count']}")
    print(f"金额提取失败: {len(missing_amount_files)}")
    print(f"失败率: {len(missing_amount_files)/test_data['test_info']['total_files']*100:.1f}%")
    
    # 按发票类型分类
    invoice_types = {}
    for result in missing_amount_files:
        invoice_type = result.get('invoice_type', '未知')
        if invoice_type not in invoice_types:
            invoice_types[invoice_type] = []
        invoice_types[invoice_type].append(result)
    
    print(f"\n按发票类型分类:")
    print("-"*60)
    for invoice_type, files in invoice_types.items():
        print(f"{invoice_type}: {len(files)} 个文件")
        for file_info in files[:3]:  # 显示前3个
            print(f"  - {file_info['file']}")
        if len(files) > 3:
            print(f"  ... 还有 {len(files)-3} 个文件")
    
    # 详细分析几个代表性文件
    print(f"\n详细分析代表性文件:")
    print("="*80)
    
    extractor = StandaloneEnhancedExtractor()
    
    # 分析每种类型的第一个文件
    for invoice_type, files in invoice_types.items():
        if files:
            file_info = files[0]
            file_path = file_info.get('relative_path', '')
            
            print(f"\n分析文件: {file_info['file']}")
            print(f"发票类型: {invoice_type}")
            print(f"路径: {file_path}")
            print("-"*40)
            
            if os.path.exists(file_path):
                # 提取PDF文本
                try:
                    doc = fitz.open(file_path)
                    text = ""
                    for page in doc:
                        text += page.get_text()
                    doc.close()
                    
                    # 显示文本片段
                    print("PDF文本内容 (前500字符):")
                    print(text[:500])
                    print("...")
                    
                    # 查找金额相关的文本
                    amount_keywords = ['价税合计', '合计', '金额', '票价', '¥', '￥', '元']
                    print(f"\n查找金额关键词:")
                    lines = text.split('\n')
                    for i, line in enumerate(lines):
                        if any(keyword in line for keyword in amount_keywords):
                            print(f"  第{i+1}行: {line.strip()}")
                    
                    # 测试当前的金额提取
                    print(f"\n当前金额提取结果:")
                    amount = extractor._extract_amount(text)
                    print(f"  提取到的金额: {amount}")
                    
                except Exception as e:
                    print(f"  ❌ 无法分析文件: {e}")
            else:
                print(f"  ❌ 文件不存在: {file_path}")
    
    return missing_amount_files, invoice_types

def analyze_amount_patterns():
    """分析金额提取模式的覆盖情况"""
    
    print(f"\n当前金额提取模式分析:")
    print("="*80)
    
    # 从代码中提取当前的模式
    patterns = [
        r'价税合计.*?[¥￥]\s*([\d,]+\.?\d*)',
        r'合计.*?[¥￥]\s*([\d,]+\.?\d*)', 
        r'[¥￥]\s*([\d,]+\.?\d*)(?=.*价税合计)',
        r'小写[）)]\s*[¥￥]\s*([\d,]+\.?\d*)',
        r'票价[:：]\s*[¥￥]?\s*([\d,]+\.?\d*)',
    ]
    
    print("当前使用的金额提取正则模式:")
    for i, pattern in enumerate(patterns, 1):
        print(f"  {i}. {pattern}")
    
    print(f"\n建议新增的模式 (基于失败案例):")
    suggested_patterns = [
        r'总价[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)',
        r'应付[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)',
        r'实付[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)',
        r'金额[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)',
        r'([0-9,]+\.[0-9]{2})\s*元',  # 匹配 "123.45 元" 格式
        r'[¥￥]\s*([0-9,]+\.?[0-9]*)\s*$',  # 行末的金额
    ]
    
    for i, pattern in enumerate(suggested_patterns, 1):
        print(f"  {i}. {pattern}")

if __name__ == "__main__":
    missing_files, types = analyze_missing_amounts()
    analyze_amount_patterns()