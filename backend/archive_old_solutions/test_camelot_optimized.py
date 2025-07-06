#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试Camelot优化参数的效果
"""

import camelot
import pandas as pd
from pathlib import Path

def compare_extraction_methods():
    """比较不同参数的提取效果"""
    
    test_file = "downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    if not Path(test_file).exists():
        print(f"文件不存在: {test_file}")
        return
    
    print(f"测试文件: {test_file}")
    print("="*80)
    
    # 1. 默认参数提取
    print("\n1. 默认参数提取:")
    print("-"*40)
    
    tables_default = camelot.read_pdf(test_file, flavor='stream', pages='1')
    if tables_default.n > 0:
        df_default = tables_default[0].df
        print(f"表格形状: {df_default.shape}")
        print("\n前5行数据:")
        print(df_default.head().to_string())
        
        # 保存为CSV查看
        df_default.to_csv("camelot_default.csv", index=False, encoding='utf-8')
        print("\n已保存到: camelot_default.csv")
    
    # 2. 使用strip_text参数
    print("\n\n2. 使用strip_text=' \\n'参数:")
    print("-"*40)
    
    tables_strip = camelot.read_pdf(test_file, flavor='stream', pages='1', strip_text=' \n')
    if tables_strip.n > 0:
        df_strip = tables_strip[0].df
        print(f"表格形状: {df_strip.shape}")
        print("\n前5行数据:")
        print(df_strip.head().to_string())
        
        # 保存为CSV查看
        df_strip.to_csv("camelot_strip_text.csv", index=False, encoding='utf-8')
        print("\n已保存到: camelot_strip_text.csv")
    
    # 3. 使用strip_text和shift_text参数
    print("\n\n3. 使用strip_text=' \\n'和shift_text=['']参数:")
    print("-"*40)
    
    tables_optimized = camelot.read_pdf(
        test_file, 
        flavor='stream', 
        pages='1', 
        strip_text=' \n',
        shift_text=['']
    )
    if tables_optimized.n > 0:
        df_optimized = tables_optimized[0].df
        print(f"表格形状: {df_optimized.shape}")
        print("\n前5行数据:")
        print(df_optimized.head().to_string())
        
        # 保存为CSV查看
        df_optimized.to_csv("camelot_optimized.csv", index=False, encoding='utf-8')
        print("\n已保存到: camelot_optimized.csv")
    
    # 4. 分析单元格内容差异
    print("\n\n4. 单元格内容对比:")
    print("-"*40)
    
    if tables_default.n > 0 and tables_optimized.n > 0:
        # 检查包含换行符的单元格
        print("\n默认方法中包含换行符的单元格:")
        for i, row in df_default.iterrows():
            for j, cell in enumerate(row):
                if '\n' in str(cell):
                    print(f"  [{i},{j}]: {repr(cell)}")
        
        print("\n优化后的对应单元格:")
        for i, row in df_optimized.iterrows():
            for j, cell in enumerate(row):
                cell_str = str(cell)
                if i < 5 and j < 4:  # 只显示前几个单元格
                    print(f"  [{i},{j}]: {repr(cell_str)}")
    
    # 5. 提取关键信息测试
    print("\n\n5. 关键信息提取测试:")
    print("-"*40)
    
    if tables_optimized.n > 0:
        all_text = ' '.join(df_optimized.astype(str).values.flatten())
        
        # 测试发票号码提取
        import re
        invoice_numbers = re.findall(r'\b(\d{20})\b', all_text)
        print(f"发票号码: {invoice_numbers[0] if invoice_numbers else '未找到'}")
        
        # 测试日期提取
        dates = re.findall(r'(\d{4}年\d{1,2}月\d{1,2}日)', all_text)
        print(f"开票日期: {dates[0] if dates else '未找到'}")
        
        # 测试公司名称提取
        companies = re.findall(r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店)[\u4e00-\u9fa5]*)', all_text)
        print(f"找到的公司: {companies[:3] if companies else '未找到'}")

if __name__ == "__main__":
    compare_extraction_methods()