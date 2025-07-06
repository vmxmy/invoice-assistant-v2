#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
调试PDF文本结构 - 分析PyMuPDF提取的垂直布局问题
"""

import pymupdf
import os
import json
from pathlib import Path

def extract_text_with_coordinates(pdf_path):
    """提取PDF文本及其坐标信息"""
    try:
        doc = pymupdf.open(pdf_path)
        page = doc[0]  # 只分析第一页
        
        # 方法1: 基本文本提取
        basic_text = page.get_text()
        
        # 方法2: 带坐标的文本块提取
        text_blocks = page.get_text("dict")
        
        # 方法3: 文本行提取
        text_lines = []
        for block in text_blocks["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    line_text = ""
                    line_bbox = line["bbox"]
                    for span in line["spans"]:
                        line_text += span["text"]
                    if line_text.strip():
                        text_lines.append({
                            "text": line_text.strip(),
                            "bbox": line_bbox,
                            "y": line_bbox[1]  # y坐标用于排序
                        })
        
        # 按y坐标排序
        text_lines.sort(key=lambda x: x["y"])
        
        doc.close()
        
        return {
            "basic_text": basic_text,
            "text_lines": text_lines,
            "blocks": text_blocks
        }
        
    except Exception as e:
        print(f"提取失败 {pdf_path}: {e}")
        return None

def analyze_buyer_seller_pattern(text_lines):
    """分析购买方/销售方信息的布局模式"""
    patterns = {
        "buyer_patterns": [],
        "seller_patterns": [],
        "name_patterns": [],
        "tax_id_patterns": []
    }
    
    for i, line in enumerate(text_lines):
        text = line["text"]
        
        # 查找购买方相关信息
        if "购买方" in text or "买方" in text:
            context = []
            # 收集前后5行作为上下文
            start = max(0, i-2)
            end = min(len(text_lines), i+8)
            for j in range(start, end):
                context.append({
                    "index": j,
                    "text": text_lines[j]["text"],
                    "y": text_lines[j]["y"]
                })
            patterns["buyer_patterns"].append({
                "trigger_line": i,
                "trigger_text": text,
                "context": context
            })
        
        # 查找销售方相关信息  
        if "销售方" in text or "卖方" in text:
            context = []
            start = max(0, i-2)
            end = min(len(text_lines), i+8)
            for j in range(start, end):
                context.append({
                    "index": j,
                    "text": text_lines[j]["text"],
                    "y": text_lines[j]["y"]
                })
            patterns["seller_patterns"].append({
                "trigger_line": i,
                "trigger_text": text,
                "context": context
            })
        
        # 查找名称字段
        if "名称" in text and ("：" in text or ":" in text):
            patterns["name_patterns"].append({
                "line": i,
                "text": text,
                "y": line["y"]
            })
            
        # 查找税号字段
        if ("统一社会信用代码" in text or "纳税人识别号" in text) and ("：" in text or ":" in text):
            patterns["tax_id_patterns"].append({
                "line": i,
                "text": text,
                "y": line["y"]
            })
    
    return patterns

def main():
    """主函数"""
    downloads_dir = Path("downloads")
    
    # 选择几个代表性文件进行分析
    test_files = [
        "25432000000022020617-杭州趣链科技有限公司.pdf",
        "25439165666000019624.pdf", 
        "dzfp_25432000000032177192_杭州趣链科技有限公司_20250313093318.pdf"
    ]
    
    analysis_results = {}
    
    for filename in test_files:
        pdf_path = downloads_dir / filename
        if pdf_path.exists():
            print(f"\n=== 分析文件: {filename} ===")
            
            # 提取文本结构
            result = extract_text_with_coordinates(str(pdf_path))
            if result:
                # 分析模式
                patterns = analyze_buyer_seller_pattern(result["text_lines"])
                
                analysis_results[filename] = {
                    "text_lines_count": len(result["text_lines"]),
                    "patterns": patterns,
                    "sample_lines": result["text_lines"][:20]  # 前20行作为样本
                }
                
                print(f"文本行数: {len(result['text_lines'])}")
                print(f"购买方模式: {len(patterns['buyer_patterns'])}")
                print(f"销售方模式: {len(patterns['seller_patterns'])}")
                print(f"名称字段: {len(patterns['name_patterns'])}")
                print(f"税号字段: {len(patterns['tax_id_patterns'])}")
                
                # 显示购买方信息的上下文
                if patterns["buyer_patterns"]:
                    print("\n购买方信息上下文:")
                    for pattern in patterns["buyer_patterns"]:
                        print(f"  触发行: {pattern['trigger_text']}")
                        for ctx in pattern["context"]:
                            print(f"    {ctx['index']}: {ctx['text']}")
    
    # 保存分析结果
    with open("pdf_text_structure_analysis.json", "w", encoding="utf-8") as f:
        json.dump(analysis_results, f, ensure_ascii=False, indent=2)
    
    print(f"\n分析结果已保存到: pdf_text_structure_analysis.json")

if __name__ == "__main__":
    main()