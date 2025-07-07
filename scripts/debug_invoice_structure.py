#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
调试发票结构
"""
import re
from invoice2data.input import pdftotext

def debug_invoice():
    """调试发票结构"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底星奕酒店管理有限公司-507.00-25432000000029033553.pdf"
    
    # 提取原始文本
    text = pdftotext.to_text(pdf_path)
    
    print("原始文本（显示项目明细部分）:")
    print("=" * 80)
    
    # 查找项目明细区域
    lines = text.split('\n')
    
    # 寻找包含金额信息的行
    found_detail = False
    for i, line in enumerate(lines):
        # 查找项目明细开始的标志
        if '项目名称' in line or '规格型号' in line or '金额' in line:
            found_detail = True
            
        # 如果找到明细区域，打印接下来的几行
        if found_detail and i < len(lines) - 1:
            # 打印到合计行结束
            print(f"{i}: {line}")
            if '价税合计' in line:
                break
    
    print("\n" + "=" * 80)
    print("分析：")
    
    # 查找所有包含税率的行
    text_no_space = re.sub(r'\s+', ' ', text)
    
    # 查找 %号前的数字（税率）
    tax_rates = re.findall(r'(\d+)%', text_no_space)
    print(f"找到的税率: {set(tax_rates)}")
    
    # 查找金额和税率的组合
    pattern = r'([0-9,]+\.?\d*)\s*(\d+)%\s*([0-9,]+\.?\d*)'
    matches = re.findall(pattern, text_no_space)
    
    if matches:
        print("\n项目明细（金额 税率 税额）:")
        total_pretax = 0
        total_tax = 0
        for amount, rate, tax in matches:
            amount_f = float(amount.replace(',', ''))
            tax_f = float(tax.replace(',', ''))
            print(f"  ¥{amount} × {rate}% = ¥{tax}")
            total_pretax += amount_f
            total_tax += tax_f
        
        print(f"\n计算汇总:")
        print(f"  税前总计: ¥{total_pretax:.2f}")
        print(f"  税额总计: ¥{total_tax:.2f}")
        print(f"  价税合计: ¥{total_pretax + total_tax:.2f}")

if __name__ == "__main__":
    debug_invoice()