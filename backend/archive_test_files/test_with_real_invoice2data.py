#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用真实的invoice2data库测试冒号换行移除方案
"""

import pymupdf
import re
import json
from pathlib import Path
import sys
import os

def remove_colon_newlines(text):
    """移除所有格式冒号后的换行符"""
    if not text:
        return text
    
    colon_variants = ['：', ':', '∶', '﹕', '︰']
    
    for colon in colon_variants:
        # 移除冒号后的换行符和多余空格，保留一个空格
        text = re.sub(f'{re.escape(colon)}\\s*\\n+\\s*', f'{colon} ', text)
        # 压缩冒号后的多个空格为一个
        text = re.sub(f'{re.escape(colon)}\\s+', f'{colon} ', text)
    
    return text

def test_with_actual_invoice2data():
    """使用实际的invoice2data库进行测试"""
    
    try:
        import invoice2data
        from invoice2data import extract_data
        from invoice2data.input import pdftotext, pymupdf as pymupdf_input
        
        print("成功导入invoice2data库")
        
        # 使用PyMuPDF作为输入模块
        input_module = pymupdf_input
        
        # 加载模板
        templates_dir = Path("app/services/ocr/templates")
        if templates_dir.exists():
            template_files = list(templates_dir.glob("*.yml"))
            print(f"找到{len(template_files)}个模板文件:")
            for tmpl in template_files:
                print(f"  - {tmpl.name}")
        else:
            print("使用默认模板")
            template_files = None
        
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
                    # 方法1: 直接使用invoice2data（原始方法）
                    print("1. 原始invoice2data提取:")
                    try:
                        if template_files:
                            original_result = extract_data(pdf_path, input_module=input_module, template_folder=str(templates_dir))
                        else:
                            original_result = extract_data(pdf_path, input_module=input_module)
                        
                        print(f"   结果: {original_result}")
                        original_extracted = len([k for k, v in (original_result or {}).items() if v]) if original_result else 0
                        print(f"   提取字段数: {original_extracted}")
                    except Exception as e:
                        print(f"   提取失败: {e}")
                        original_result = None
                        original_extracted = 0
                    
                    # 方法2: 使用预处理后的文本
                    print("\n2. 预处理后提取:")
                    
                    # 获取原始文本
                    doc = pymupdf.open(pdf_path)
                    page = doc[0]
                    original_text = page.get_text()
                    doc.close()
                    
                    # 应用冒号换行移除
                    processed_text = remove_colon_newlines(original_text)
                    
                    # 保存处理后的文本到临时文件
                    temp_pdf_path = f"temp_processed_{filename}.txt"
                    with open(temp_pdf_path, "w", encoding="utf-8") as f:
                        f.write(processed_text)
                    
                    print(f"   原始文本长度: {len(original_text)}")
                    print(f"   处理后文本长度: {len(processed_text)}")
                    
                    # 显示处理效果示例
                    print("   处理效果示例:")
                    colon_examples = re.findall(r'.{0,15}[：:].{0,20}', processed_text)[:3]
                    for i, example in enumerate(colon_examples):
                        print(f"     {i+1}: {repr(example)}")
                    
                    # 由于invoice2data需要PDF文件，我们直接在处理后的文本上应用正则模式
                    # 模拟现有模板的正则表达式
                    template_patterns = {
                        'invoice_number': r'发票号码[：:]\s*(\d+)',
                        'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
                        'amount': r'(?:价税合计.*?小写.*?[¥￥]\s*|合\s*计.*?[¥￥]\s*)([0-9,]+\.?\d*)',
                        'buyer_name': r'购.*?名\s*称[：:]\s*([^\s\n]+(?:\s+[^\s\n]+)*?)(?=\s+销|统一社会信用代码|项目名称|$)',
                        'seller_name': r'销.*?名\s*称[：:]\s*([^\s\n]+(?:\s+[^\s\n]+)*?)(?=\s+购|统一社会信用代码|项目名称|$)',
                        'buyer_tax_id': r'购.*?统一社会信用代码[/纳税人识别号]*[：:]\s*([A-Z0-9]{18})',
                        'seller_tax_id': r'销.*?统一社会信用代码[/纳税人识别号]*[：:]\s*([A-Z0-9]{18})'
                    }
                    
                    processed_result = {}
                    for field, pattern in template_patterns.items():
                        match = re.search(pattern, processed_text)
                        if match:
                            processed_result[field] = match.group(1).strip()
                    
                    processed_extracted = len(processed_result)
                    print(f"   处理后提取结果: {processed_result}")
                    print(f"   提取字段数: {processed_extracted}")
                    
                    # 清理临时文件
                    if os.path.exists(temp_pdf_path):
                        os.remove(temp_pdf_path)
                    
                    results[filename] = {
                        "original": original_result,
                        "original_count": original_extracted,
                        "processed": processed_result,
                        "processed_count": processed_extracted,
                        "improvement": processed_extracted - original_extracted
                    }
                    
                    # 显示改进效果
                    improvement = processed_extracted - original_extracted
                    print(f"\n   效果对比:")
                    print(f"   原始方法: {original_extracted}个字段")
                    print(f"   处理后: {processed_extracted}个字段")
                    if improvement > 0:
                        print(f"   改进: +{improvement}个字段")
                        # 显示新提取到的字段
                        new_fields = [f"{k}: {v}" for k, v in processed_result.items() 
                                    if k not in (original_result or {}) or not (original_result or {}).get(k)]
                        if new_fields:
                            print(f"   新提取字段:")
                            for field in new_fields:
                                print(f"     {field}")
                    elif improvement == 0:
                        print(f"   效果: 保持一致")
                    else:
                        print(f"   变化: {improvement}个字段")
                    
                except Exception as e:
                    print(f"处理失败: {e}")
                    results[filename] = {"error": str(e)}
        
        return results
        
    except ImportError as e:
        print(f"无法导入invoice2data: {e}")
        return test_with_manual_patterns()

def test_with_manual_patterns():
    """使用手动模式进行测试"""
    
    print("使用手动正则模式测试...")
    
    # 更精确的正则模式
    enhanced_patterns = {
        'invoice_number': [
            r'发票号码[：:]\s*(\d+)',
            r'发票号码[：:]\s*([^\s\n]+)'
        ],
        'invoice_date': [
            r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'开票日期[：:]\s*([^\s\n]+年[^\s\n]+月[^\s\n]+日)'
        ],
        'buyer_name': [
            r'购买方[^：:]*名\s*称[：:]\s*([^\s\n]+(?:\s+[^\s\n]+)*?)(?=\s+销|统一社会信用代码|$)',
            r'购买方名称[：:]\s*([^\s\n]+(?:\s+[^\s\n]+)*?)(?=\s|$)',
            r'名称[：:]\s*([^\s\n]+有限公司)',  # 匹配公司名称
        ],
        'buyer_tax_id': [
            r'购买方[^：:]*统一社会信用代码[：:]\s*([A-Z0-9]{18})',
            r'统一社会信用代码[：:]\s*([A-Z0-9]{18})',
        ]
    }
    
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
                original_text = page.get_text()
                doc.close()
                
                # 原始文本提取
                print("1. 原始文本提取:")
                original_result = {}
                for field, patterns in enhanced_patterns.items():
                    for pattern in patterns:
                        match = re.search(pattern, original_text)
                        if match:
                            original_result[field] = match.group(1).strip()
                            break
                
                original_count = len([v for v in original_result.values() if v])
                print(f"   结果: {original_result}")
                print(f"   提取字段数: {original_count}")
                
                # 处理后文本提取
                print("\n2. 处理后文本提取:")
                processed_text = remove_colon_newlines(original_text)
                processed_result = {}
                for field, patterns in enhanced_patterns.items():
                    for pattern in patterns:
                        match = re.search(pattern, processed_text)
                        if match:
                            processed_result[field] = match.group(1).strip()
                            break
                
                processed_count = len([v for v in processed_result.values() if v])
                print(f"   结果: {processed_result}")
                print(f"   提取字段数: {processed_count}")
                
                # 显示文本处理的具体效果
                print("\n3. 文本处理效果:")
                key_changes = []
                for field in enhanced_patterns.keys():
                    if field not in original_result or not original_result[field]:
                        if field in processed_result and processed_result[field]:
                            key_changes.append(f"   新提取: {field} = {processed_result[field]}")
                
                if key_changes:
                    for change in key_changes:
                        print(change)
                else:
                    print("   没有新增字段")
                
                improvement = processed_count - original_count
                print(f"\n   总体效果: {original_count} -> {processed_count} ({improvement:+d})")
                
                results[filename] = {
                    "original": original_result,
                    "processed": processed_result,
                    "improvement": improvement
                }
                
            except Exception as e:
                print(f"处理失败: {e}")
                results[filename] = {"error": str(e)}
    
    return results

def main():
    """主测试函数"""
    print("测试冒号后换行移除方案的实际效果...")
    print("="*60)
    
    # 执行测试
    results = test_with_actual_invoice2data()
    
    # 保存结果
    with open("real_invoice2data_test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 总结统计
    print(f"\n{'='*60}")
    print("测试总结:")
    
    total_files = 0
    total_improvement = 0
    improved_files = []
    
    for filename, result in results.items():
        if "error" not in result:
            total_files += 1
            improvement = result.get("improvement", 0)
            total_improvement += improvement
            
            if improvement > 0:
                improved_files.append(f"  {filename}: +{improvement}个字段")
    
    print(f"\n处理文件数: {total_files}")
    print(f"总改进字段数: {total_improvement}")
    
    if improved_files:
        print(f"\n改进详情:")
        for improved in improved_files:
            print(improved)
    else:
        print(f"\n注意: 本次测试未显示明显改进")
        print(f"可能原因:")
        print(f"  1. 测试文件的格式特殊，冒号后换行不是主要问题")
        print(f"  2. 需要调整正则表达式模式以更好匹配处理后的文本")
        print(f"  3. PyMuPDF文本提取顺序问题需要其他解决方案")
    
    print(f"\n结果已保存到: real_invoice2data_test_results.json")

if __name__ == "__main__":
    main()