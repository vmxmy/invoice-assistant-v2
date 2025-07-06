#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
详细测试Camelot的表格提取效果
"""

import camelot
import pandas as pd
from pathlib import Path

def test_camelot_detailed():
    """详细测试Camelot提取结果"""
    
    test_file = "downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    if not Path(test_file).exists():
        print(f"文件不存在: {test_file}")
        return
    
    print(f"测试文件: {test_file}")
    print("="*80)
    
    # 测试Lattice方法
    print("\n1. Lattice方法（基于表格线）:")
    print("-"*40)
    
    try:
        tables_lattice = camelot.read_pdf(test_file, flavor='lattice', pages='1')
        print(f"找到 {tables_lattice.n} 个表格")
        
        for i, table in enumerate(tables_lattice):
            print(f"\n表格 {i+1}:")
            print(f"  形状: {table.shape}")
            print(f"  准确度: {table.accuracy:.2f}")
            print(f"  白空间: {table.whitespace:.2f}")
            print(f"  顺序: {table.order}")
            print(f"  页码: {table.page}")
            
            # 显示表格数据
            df = table.df
            print(f"\n  表格内容预览:")
            print(df.to_string(max_rows=10))
            
            # 分析发票相关字段
            print(f"\n  发票字段分析:")
            for idx, row in df.iterrows():
                row_text = ' '.join(str(cell) for cell in row if cell)
                if any(keyword in row_text for keyword in ['项目', '金额', '税率', '餐饮', '服务']):
                    print(f"    行{idx}: {row_text}")
                    
    except Exception as e:
        print(f"Lattice方法错误: {e}")
    
    # 测试Stream方法
    print("\n\n2. Stream方法（基于文本流）:")
    print("-"*40)
    
    try:
        tables_stream = camelot.read_pdf(test_file, flavor='stream', pages='1')
        print(f"找到 {tables_stream.n} 个表格")
        
        for i, table in enumerate(tables_stream):
            print(f"\n表格 {i+1}:")
            print(f"  形状: {table.shape}")
            print(f"  准确度: {table.accuracy:.2f}")
            
            # 显示表格数据
            df = table.df
            print(f"\n  表格内容预览:")
            print(df.to_string(max_rows=10))
            
            # 导出为CSV查看
            csv_file = f"camelot_table_{i+1}_stream.csv"
            df.to_csv(csv_file, index=False, encoding='utf-8')
            print(f"\n  已导出到: {csv_file}")
            
    except Exception as e:
        print(f"Stream方法错误: {e}")
    
    # 高级设置测试
    print("\n\n3. 高级设置测试:")
    print("-"*40)
    
    try:
        # 使用更精确的参数
        tables_advanced = camelot.read_pdf(
            test_file, 
            flavor='stream',
            pages='1',
            edge_tol=50,  # 边缘容差
            row_tol=2,    # 行容差
            column_tol=0  # 列容差
        )
        
        print(f"找到 {tables_advanced.n} 个表格（高级设置）")
        
        if tables_advanced.n > 0:
            table = tables_advanced[0]
            df = table.df
            
            # 尝试识别发票结构
            print("\n发票数据结构分析:")
            
            # 查找包含金额的行
            for idx, row in df.iterrows():
                row_text = ' '.join(str(cell) for cell in row if cell)
                if '¥' in row_text or '￥' in row_text or any(char.isdigit() for char in row_text):
                    print(f"  可能的金额行 {idx}: {row.tolist()}")
            
            # 提取关键信息
            extract_invoice_info(df)
            
    except Exception as e:
        print(f"高级设置错误: {e}")

def extract_invoice_info(df):
    """从DataFrame中提取发票信息"""
    print("\n关键信息提取:")
    
    # 遍历所有单元格查找关键信息
    for i, row in df.iterrows():
        for j, cell in enumerate(row):
            cell_str = str(cell)
            
            # 项目名称
            if any(keyword in cell_str for keyword in ['餐饮', '服务', '费']):
                print(f"  项目: {cell_str} (位置: [{i},{j}])")
            
            # 金额
            if '.' in cell_str and any(char.isdigit() for char in cell_str):
                try:
                    amount = float(cell_str.replace(',', ''))
                    if amount > 0:
                        print(f"  可能的金额: {amount} (位置: [{i},{j}])")
                except:
                    pass
            
            # 税率
            if '%' in cell_str:
                print(f"  税率: {cell_str} (位置: [{i},{j}])")

if __name__ == "__main__":
    test_camelot_detailed()