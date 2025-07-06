#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试通过清除换行符解决垂直布局问题
"""

import pymupdf
import re
import json
from pathlib import Path

def test_newline_removal_solution():
    """测试移除换行符的解决方案"""
    
    # 原始正则表达式模式（从模板文件中获取）
    original_patterns = {
        'buyer_name': r'购.*?名\s*称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销|$)',
        'seller_name': r'销.*?名\s*称[：:]\s*([^\n]+?)(?=\n|$)',
        'buyer_tax_id': r'购.*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]{18})'
    }
    
    # 测试文件
    test_files = [
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
        "downloads/25439165666000019624.pdf", 
        "downloads/dzfp_25432000000032177192_杭州趣链科技有限公司_20250313093318.pdf"
    ]
    
    results = {}
    
    for pdf_path in test_files:
        if Path(pdf_path).exists():
            filename = Path(pdf_path).name
            print(f"\n=== 测试文件: {filename} ===")
            
            try:
                doc = pymupdf.open(pdf_path)
                page = doc[0]
                
                # 获取原始文本（带换行符）
                original_text = page.get_text()
                
                # 方法1: 简单移除所有换行符
                text_no_newlines = original_text.replace('\n', ' ')
                
                # 方法2: 更智能的换行移除（保留重要分隔符）
                text_smart_removal = re.sub(r'\n+', ' ', original_text)
                text_smart_removal = re.sub(r'\s+', ' ', text_smart_removal)  # 合并多个空格
                
                doc.close()
                
                print("原始文本片段:")
                print(original_text[:500] + "...")
                
                print("\n移除换行后:")
                print(text_no_newlines[:500] + "...")
                
                # 测试原始模式在不同文本版本上的效果
                result = {
                    "original_text_results": {},
                    "no_newlines_results": {},
                    "smart_removal_results": {}
                }
                
                # 在原始文本上测试
                for field, pattern in original_patterns.items():
                    match = re.search(pattern, original_text)
                    result["original_text_results"][field] = match.group(1) if match else None
                
                # 在移除换行的文本上测试
                for field, pattern in original_patterns.items():
                    match = re.search(pattern, text_no_newlines)
                    result["no_newlines_results"][field] = match.group(1) if match else None
                
                # 在智能移除换行的文本上测试
                for field, pattern in original_patterns.items():
                    match = re.search(pattern, text_smart_removal)
                    result["smart_removal_results"][field] = match.group(1) if match else None
                
                results[filename] = result
                
                print(f"\n提取结果对比:")
                print(f"原始文本: {result['original_text_results']}")
                print(f"移除换行: {result['no_newlines_results']}")
                print(f"智能移除: {result['smart_removal_results']}")
                
                # 分析改进效果
                original_count = sum(1 for v in result['original_text_results'].values() if v)
                newline_count = sum(1 for v in result['no_newlines_results'].values() if v)
                smart_count = sum(1 for v in result['smart_removal_results'].values() if v)
                
                print(f"成功提取字段数: 原始({original_count}) -> 移除换行({newline_count}) -> 智能移除({smart_count})")
                
            except Exception as e:
                print(f"处理文件失败 {filename}: {e}")
                results[filename] = {"error": str(e)}
    
    # 保存详细结果
    with open("newline_removal_test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 统计总体效果
    print(f"\n=== 总体效果统计 ===")
    total_original = 0
    total_newline = 0 
    total_smart = 0
    
    for filename, result in results.items():
        if "error" not in result:
            total_original += sum(1 for v in result['original_text_results'].values() if v)
            total_newline += sum(1 for v in result['no_newlines_results'].values() if v)
            total_smart += sum(1 for v in result['smart_removal_results'].values() if v)
    
    print(f"所有文件字段提取总数:")
    print(f"  原始方法: {total_original}")
    print(f"  移除换行: {total_newline}")
    print(f"  智能移除: {total_smart}")
    
    improvement_newline = ((total_newline - total_original) / max(total_original, 1)) * 100
    improvement_smart = ((total_smart - total_original) / max(total_original, 1)) * 100
    
    print(f"改进效果:")
    print(f"  移除换行方法: {improvement_newline:+.1f}%")
    print(f"  智能移除方法: {improvement_smart:+.1f}%")
    
    print(f"\n结果已保存到: newline_removal_test_results.json")

if __name__ == "__main__":
    test_newline_removal_solution()