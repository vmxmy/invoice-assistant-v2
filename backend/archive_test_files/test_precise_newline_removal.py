#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试精确的换行移除 - 只移除冒号后的换行符
"""

import pymupdf
import re
import json
from pathlib import Path

def precise_newline_removal(text):
    """
    精确移除换行符：只移除全角/半角冒号后的换行
    保持文档整体结构，仅解决字段标签和值分离问题
    """
    if not text:
        return text
    
    # 1. 移除全角冒号后的换行符（保留一个空格）
    text = re.sub(r'：\s*\n+\s*', '：', text)
    
    # 2. 移除半角冒号后的换行符（保留一个空格）  
    text = re.sub(r':\s*\n+\s*', ': ', text)
    
    # 3. 清理多余的空格（但保持基本结构）
    text = re.sub(r'[ \t]+', ' ', text)
    
    return text

def test_precise_solution():
    """测试精确的冒号后换行移除方案"""
    
    # 原始正则表达式模式
    original_patterns = {
        'buyer_name': r'购.*?名\s*称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销|$)',
        'seller_name': r'销.*?名\s*称[：:]\s*([^\n]+?)(?=\n|$)', 
        'buyer_tax_id': r'购.*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]{18})',
        'seller_tax_id': r'销.*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]{18})',
        'invoice_number': r'发票号码[：:]\s*(\d+)',
        'invoice_date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)'
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
                
                # 获取原始文本
                original_text = page.get_text()
                
                # 应用精确的换行移除
                processed_text = precise_newline_removal(original_text)
                
                doc.close()
                
                print("原始文本示例（前200字符）:")
                print(repr(original_text[:200]))
                
                print("\n精确处理后:")
                print(repr(processed_text[:200]))
                
                # 测试提取效果
                result = {
                    "original_results": {},
                    "precise_removal_results": {}
                }
                
                # 在原始文本上测试
                for field, pattern in original_patterns.items():
                    match = re.search(pattern, original_text)
                    result["original_results"][field] = match.group(1) if match else None
                
                # 在精确处理的文本上测试
                for field, pattern in original_patterns.items():
                    match = re.search(pattern, processed_text)
                    result["precise_removal_results"][field] = match.group(1) if match else None
                
                results[filename] = result
                
                print(f"\n提取结果对比:")
                print(f"原始文本: {result['original_results']}")
                print(f"精确处理: {result['precise_removal_results']}")
                
                # 分析改进效果
                original_count = sum(1 for v in result['original_results'].values() if v)
                precise_count = sum(1 for v in result['precise_removal_results'].values() if v)
                
                print(f"成功提取字段数: 原始({original_count}) -> 精确处理({precise_count})")
                
                # 显示关键字段的对比
                key_fields = ['buyer_name', 'seller_name', 'buyer_tax_id', 'invoice_number']
                for field in key_fields:
                    orig = result['original_results'].get(field)
                    precise = result['precise_removal_results'].get(field)
                    if orig != precise:
                        print(f"  {field}: '{orig}' -> '{precise}'")
                
            except Exception as e:
                print(f"处理文件失败 {filename}: {e}")
                results[filename] = {"error": str(e)}
    
    # 保存详细结果
    with open("precise_newline_removal_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 统计总体效果
    print(f"\n=== 总体效果统计 ===")
    total_original = 0
    total_precise = 0
    
    for filename, result in results.items():
        if "error" not in result:
            total_original += sum(1 for v in result['original_results'].values() if v)
            total_precise += sum(1 for v in result['precise_removal_results'].values() if v)
    
    print(f"所有文件字段提取总数:")
    print(f"  原始方法: {total_original}")
    print(f"  精确处理: {total_precise}")
    
    if total_original > 0:
        improvement = ((total_precise - total_original) / total_original) * 100
        print(f"改进效果: {improvement:+.1f}%")
    else:
        print(f"改进效果: +{total_precise}个字段（从0开始）")
    
    print(f"\n结果已保存到: precise_newline_removal_results.json")

def demonstrate_precision():
    """演示精确处理的效果"""
    
    sample_text = """购买方信息
名称：
杭州趣链科技有限公司
统一社会信用代码/纳税人识别号：
91330108MA27Y5XH5G

销售方信息  
名称：
娄底市中税通财税咨询有限公司
开票日期：
2025年03月13日"""

    print("=== 演示精确处理效果 ===")
    print("原始文本:")
    print(sample_text)
    
    processed = precise_newline_removal(sample_text)
    print("\n精确处理后:")
    print(processed)
    
    # 测试正则匹配
    pattern = r'名称[：:]\s*([^\n]+?)(?=\n|统一社会信用代码|$)'
    
    print(f"\n正则匹配测试: {pattern}")
    
    orig_match = re.search(pattern, sample_text)
    processed_match = re.search(pattern, processed)
    
    print(f"原始文本匹配: {orig_match.group(1) if orig_match else None}")
    print(f"处理后匹配: {processed_match.group(1) if processed_match else None}")

if __name__ == "__main__":
    demonstrate_precision()
    test_precise_solution()