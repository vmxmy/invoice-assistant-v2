#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分析失败的发票文本，找出问题原因
"""
import os
from invoice2data.input import pdftotext
import re

def analyze_failing_invoice():
    """分析湖南曾小厨发票"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"
    
    print(f"分析文件: {os.path.basename(pdf_path)}")
    print("="*80)
    
    # 提取文本
    try:
        text = pdftotext.to_text(pdf_path)
        print(f"\n文本长度: {len(text)} 字符")
        
        # 显示完整文本用于分析
        print("\n完整文本内容:")
        print("-"*80)
        print(text)
        print("-"*80)
        
        # 查找关键模式
        print("\n查找关键信息:")
        
        # 发票号码模式
        invoice_patterns = [
            r'发票号码[：:]\s*(\d+)',
            r'发票号码\s*[：:]\s*(\d+)',
            r'发\s*票\s*号\s*码\s*[：:]\s*(\d+)',
            r'号码[：:]\s*(\d+)',
            r'(\d{20})',  # 20位数字
            r'(\d{15,25})'  # 15-25位数字
        ]
        
        for pattern in invoice_patterns:
            matches = re.findall(pattern, text)
            if matches:
                print(f"✓ 模式 '{pattern}' 找到: {matches}")
            else:
                print(f"✗ 模式 '{pattern}' 未找到")
        
        # 日期模式
        date_patterns = [
            r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'开票日期\s*[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'开\s*票\s*日\s*期\s*[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'(\d{4}年\d{1,2}月\d{1,2}日)',
            r'(\d{4}-\d{1,2}-\d{1,2})',
            r'(\d{4}/\d{1,2}/\d{1,2})'
        ]
        
        print("\n日期查找:")
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            if matches:
                print(f"✓ 模式 '{pattern}' 找到: {matches}")
            else:
                print(f"✗ 模式 '{pattern}' 未找到")
                
        # 查找包含关键词的行
        print("\n包含关键词的行:")
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if '发票' in line or '号码' in line or '日期' in line:
                print(f"第{i+1}行: {line.strip()}")
                
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_failing_invoice()