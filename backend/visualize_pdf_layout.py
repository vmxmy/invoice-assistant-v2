#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
可视化PDF文本布局，帮助理解坐标提取
"""

import pymupdf
import json
from pathlib import Path
from coordinate_based_extraction import CoordinateBasedExtractor

def visualize_and_analyze():
    """可视化并分析PDF布局"""
    
    extractor = CoordinateBasedExtractor()
    
    # 选择一个复杂的测试文件
    test_file = "downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    if Path(test_file).exists():
        print(f"分析文件: {test_file}")
        
        # 1. 可视化文本块
        output_pdf, blocks_json = extractor.visualize_text_blocks(test_file)
        
        # 2. 加载并分析文本块
        with open(blocks_json, 'r', encoding='utf-8') as f:
            blocks = json.load(f)
        
        print(f"\n总共找到 {len(blocks)} 个文本块")
        
        # 3. 分析关键字段的位置关系
        print("\n关键字段位置分析:")
        
        # 查找关键文本
        key_texts = {
            "购买方": None,
            "名称": [],
            "杭州趣链科技有限公司": None,
            "销售方": None,
            "91330108MA27Y5XH5G": None
        }
        
        for block in blocks:
            text = block['text']
            
            # 精确匹配
            if text in key_texts:
                if isinstance(key_texts[text], list):
                    key_texts[text].append(block)
                else:
                    key_texts[text] = block
            
            # 包含匹配
            for key in key_texts:
                if key in text and key != text:
                    print(f"  '{key}' 包含在: {text} (位置: x={block['x0']:.1f}, y={block['y0']:.1f})")
        
        # 显示找到的关键文本
        print("\n找到的关键文本块:")
        for key, value in key_texts.items():
            if value:
                if isinstance(value, list):
                    print(f"  '{key}' 找到 {len(value)} 次:")
                    for v in value:
                        print(f"    - 位置: x={v['x0']:.1f}, y={v['y0']:.1f}")
                else:
                    print(f"  '{key}': x={value['x0']:.1f}, y={value['y0']:.1f}")
        
        # 4. 分析位置关系
        print("\n位置关系分析:")
        
        # 寻找"购买方"相关的文本块
        buyer_related = []
        for i, block in enumerate(blocks):
            if '购' in block['text'] or '买' in block['text'] or '方' in block['text']:
                buyer_related.append((i, block))
        
        if buyer_related:
            print(f"购买方相关文本块 ({len(buyer_related)} 个):")
            for idx, (i, block) in enumerate(buyer_related[:5]):  # 只显示前5个
                print(f"  {i}: '{block['text']}' at ({block['x0']:.1f}, {block['y0']:.1f})")
        
        # 5. 生成改进的提取策略
        print("\n建议的提取策略:")
        print("1. 垂直布局的字符（如'购买方'）需要合并处理")
        print("2. 字段值可能在标签的右侧、下方或更远的位置")
        print("3. 需要考虑PDF的多列布局")
        
        return blocks

def create_enhanced_extractor():
    """创建增强的基于坐标的提取器"""
    
    print("\n=== 创建增强提取器 ===")
    
    # 分析布局
    blocks = visualize_and_analyze()
    
    # 基于分析结果提出改进建议
    print("\n改进建议:")
    print("1. 合并垂直排列的单字符（如'购'、'买'、'方'）")
    print("2. 使用更大的搜索半径查找字段值")
    print("3. 考虑多列布局，左右两列分别处理")
    print("4. 建立字段标签和值的空间关系模型")

if __name__ == "__main__":
    create_enhanced_extractor()