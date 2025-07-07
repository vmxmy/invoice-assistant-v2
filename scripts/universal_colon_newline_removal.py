#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
通用冒号后换行移除 - 兼容所有格式的冒号
"""

import pymupdf
import re
import json
from pathlib import Path

def universal_colon_newline_removal(text):
    """
    通用冒号后换行移除：兼容所有格式的冒号
    - 中文全角冒号：：
    - 英文半角冒号：:
    - 其他可能的冒号变体
    """
    if not text:
        return text
    
    # 定义所有可能的冒号格式
    colon_patterns = [
        '：',    # 中文全角冒号
        ':',     # 英文半角冒号
        '∶',     # 数学冒号
        '﹕',    # 小型冒号
        '︰',    # 垂直冒号
    ]
    
    # 为每种冒号格式移除后面的换行符
    for colon in colon_patterns:
        # 移除冒号后的换行符和空白字符，保留一个空格
        pattern = f'{re.escape(colon)}\\s*\\n+\\s*'
        text = re.sub(pattern, f'{colon} ', text)
    
    # 额外处理：移除冒号后的多余空格
    for colon in colon_patterns:
        # 将冒号后的多个空格压缩为一个
        pattern = f'{re.escape(colon)}\\s+'
        text = re.sub(pattern, f'{colon} ', text)
    
    return text

def enhanced_colon_processing(text):
    """
    增强的冒号处理：不仅移除换行，还处理冒号周围的空格
    """
    if not text:
        return text
    
    # 1. 统一冒号格式 - 将所有冒号变体转换为标准格式
    colon_variants = ['：', ':', '∶', '﹕', '︰']
    
    # 2. 处理每种冒号后的换行和空格
    for colon in colon_variants:
        # 移除冒号前的多余空格
        text = re.sub(f'\\s+{re.escape(colon)}', colon, text)
        
        # 移除冒号后的换行符和多余空格，保留一个空格
        text = re.sub(f'{re.escape(colon)}\\s*\\n+\\s*', f'{colon} ', text)
        
        # 压缩冒号后的多个空格为一个
        text = re.sub(f'{re.escape(colon)}\\s+', f'{colon} ', text)
    
    return text

def test_universal_colon_solution():
    """测试通用冒号处理方案"""
    
    # 更新的正则表达式模式，兼容所有冒号格式
    universal_patterns = {
        'buyer_name': r'购.*?名\s*称[：:∶﹕︰]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销|统一社会信用代码|$)',
        'seller_name': r'销.*?名\s*称[：:∶﹕︰]\s*([^\n]+?)(?=\n|统一社会信用代码|项目名称|$)',
        'buyer_tax_id': r'购.*?统一社会信用代码[/纳税人识别号]*[：:∶﹕︰]\s*([A-Z0-9]{18})',
        'seller_tax_id': r'销.*?统一社会信用代码[/纳税人识别号]*[：:∶﹕︰]\s*([A-Z0-9]{18})',
        'invoice_number': r'发票号码[：:∶﹕︰]\s*(\d+)',
        'invoice_date': r'开票日期[：:∶﹕︰]\s*(\d{4}年\d{1,2}月\d{1,2}日)'
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
                
                # 应用通用冒号处理
                universal_processed = universal_colon_newline_removal(original_text)
                enhanced_processed = enhanced_colon_processing(original_text)
                
                doc.close()
                
                # 显示处理前后的关键部分
                print("原始文本中的冒号样例:")
                colon_samples = re.findall(r'.{0,10}[：:∶﹕︰].{0,20}', original_text)[:5]
                for sample in colon_samples:
                    print(f"  {repr(sample)}")
                
                # 测试提取效果
                result = {
                    "original_results": {},
                    "universal_processed_results": {},
                    "enhanced_processed_results": {}
                }
                
                # 在原始文本上测试
                for field, pattern in universal_patterns.items():
                    match = re.search(pattern, original_text)
                    result["original_results"][field] = match.group(1) if match else None
                
                # 在通用处理的文本上测试
                for field, pattern in universal_patterns.items():
                    match = re.search(pattern, universal_processed)
                    result["universal_processed_results"][field] = match.group(1) if match else None
                
                # 在增强处理的文本上测试
                for field, pattern in universal_patterns.items():
                    match = re.search(pattern, enhanced_processed)
                    result["enhanced_processed_results"][field] = match.group(1) if match else None
                
                results[filename] = result
                
                # 统计结果
                original_count = sum(1 for v in result['original_results'].values() if v)
                universal_count = sum(1 for v in result['universal_processed_results'].values() if v)
                enhanced_count = sum(1 for v in result['enhanced_processed_results'].values() if v)
                
                print(f"\n提取结果统计:")
                print(f"  原始: {original_count}个字段")
                print(f"  通用处理: {universal_count}个字段")
                print(f"  增强处理: {enhanced_count}个字段")
                
                # 显示成功提取的字段
                for method, method_results in [
                    ("通用处理", result['universal_processed_results']),
                    ("增强处理", result['enhanced_processed_results'])
                ]:
                    successful_fields = [f"{k}: {v}" for k, v in method_results.items() if v]
                    if successful_fields:
                        print(f"\n{method}成功提取:")
                        for field_info in successful_fields:
                            print(f"  {field_info}")
                
            except Exception as e:
                print(f"处理文件失败 {filename}: {e}")
                results[filename] = {"error": str(e)}
    
    # 保存结果
    with open("universal_colon_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 总体统计
    print(f"\n=== 总体效果统计 ===")
    total_original = 0
    total_universal = 0
    total_enhanced = 0
    
    for filename, result in results.items():
        if "error" not in result:
            total_original += sum(1 for v in result['original_results'].values() if v)
            total_universal += sum(1 for v in result['universal_processed_results'].values() if v)
            total_enhanced += sum(1 for v in result['enhanced_processed_results'].values() if v)
    
    print(f"所有文件字段提取总数:")
    print(f"  原始方法: {total_original}")
    print(f"  通用冒号处理: {total_universal}")
    print(f"  增强冒号处理: {total_enhanced}")
    
    if total_original > 0:
        universal_improvement = ((total_universal - total_original) / total_original) * 100
        enhanced_improvement = ((total_enhanced - total_original) / total_original) * 100
        print(f"改进效果:")
        print(f"  通用处理: {universal_improvement:+.1f}%")
        print(f"  增强处理: {enhanced_improvement:+.1f}%")
    else:
        print(f"改进效果:")
        print(f"  通用处理: +{total_universal}个字段")
        print(f"  增强处理: +{total_enhanced}个字段")

def demonstrate_colon_variants():
    """演示不同冒号格式的处理"""
    
    test_samples = [
        "发票号码：25432000000022020617",  # 中文冒号
        "发票号码:25432000000022020617",   # 英文冒号
        "发票号码∶25432000000022020617",   # 数学冒号
        "名称：\n杭州趣链科技有限公司",      # 冒号后换行
        "名称:\n杭州趣链科技有限公司",       # 英文冒号后换行
        "统一社会信用代码：   \n  91330108MA27Y5XH5G",  # 冒号后多空格+换行
    ]
    
    print("=== 冒号格式兼容性演示 ===")
    
    for sample in test_samples:
        print(f"\n原始: {repr(sample)}")
        
        universal_result = universal_colon_newline_removal(sample)
        enhanced_result = enhanced_colon_processing(sample)
        
        print(f"通用处理: {repr(universal_result)}")
        print(f"增强处理: {repr(enhanced_result)}")

if __name__ == "__main__":
    demonstrate_colon_variants()
    test_universal_colon_solution()