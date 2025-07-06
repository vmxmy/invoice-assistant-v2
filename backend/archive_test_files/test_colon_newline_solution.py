#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试冒号后换行移除方案的实际效果
"""

import pymupdf
import re
import json
from pathlib import Path
import sys
import os

# 添加服务路径
sys.path.append('app/services/ocr')

def remove_colon_newlines(text):
    """
    移除所有格式冒号后的换行符
    这是解决PyMuPDF垂直布局问题的核心方法
    """
    if not text:
        return text
    
    # 支持所有冒号格式
    colon_variants = ['：', ':', '∶', '﹕', '︰']
    
    for colon in colon_variants:
        # 移除冒号后的换行符和多余空格，保留一个空格
        text = re.sub(f'{re.escape(colon)}\\s*\\n+\\s*', f'{colon} ', text)
        
        # 压缩冒号后的多个空格为一个
        text = re.sub(f'{re.escape(colon)}\\s+', f'{colon} ', text)
    
    return text

def test_with_invoice2data():
    """使用invoice2data库测试实际提取效果"""
    try:
        from invoice2data_client import Invoice2DataClient
        
        # 创建客户端
        client = Invoice2DataClient()
        
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
                    # 方法1: 原始invoice2data提取
                    original_result = client.extract_invoice_data(pdf_path)
                    
                    # 方法2: 预处理后的invoice2data提取
                    # 获取原始文本
                    doc = pymupdf.open(pdf_path)
                    page = doc[0]
                    original_text = page.get_text()
                    doc.close()
                    
                    # 应用冒号换行移除
                    processed_text = remove_colon_newlines(original_text)
                    
                    # 临时保存处理后的文本用于测试
                    temp_file = f"temp_processed_{filename}.txt"
                    with open(temp_file, "w", encoding="utf-8") as f:
                        f.write(processed_text)
                    
                    # 使用处理后的文本进行提取（这里需要模拟invoice2data处理）
                    processed_result = simulate_invoice2data_extraction(processed_text)
                    
                    # 清理临时文件
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                    
                    results[filename] = {
                        "original": original_result,
                        "processed": processed_result
                    }
                    
                    # 对比结果
                    print("原始提取结果:")
                    print(f"  状态: {original_result.get('status', 'unknown')}")
                    if original_result.get('status') == 'success':
                        extracted = original_result.get('structured_data', {})
                        print(f"  发票号码: {extracted.get('main_info', {}).get('invoice_number')}")
                        print(f"  开票日期: {extracted.get('main_info', {}).get('invoice_date')}")
                        print(f"  购买方: {extracted.get('buyer_info', {}).get('name')}")
                        print(f"  销售方: {extracted.get('seller_info', {}).get('name')}")
                        print(f"  购买方税号: {extracted.get('buyer_info', {}).get('tax_id')}")
                        print(f"  总金额: {extracted.get('summary', {}).get('total_amount')}")
                    
                    print("\n处理后提取结果:")
                    print(f"  状态: {processed_result.get('status', 'unknown')}")
                    if processed_result.get('status') == 'success':
                        print(f"  发票号码: {processed_result.get('invoice_number')}")
                        print(f"  开票日期: {processed_result.get('invoice_date')}")
                        print(f"  购买方: {processed_result.get('buyer_name')}")
                        print(f"  销售方: {processed_result.get('seller_name')}")
                        print(f"  购买方税号: {processed_result.get('buyer_tax_id')}")
                        print(f"  总金额: {processed_result.get('amount')}")
                    
                    # 统计改进效果
                    original_fields = count_extracted_fields(original_result)
                    processed_fields = count_extracted_fields(processed_result)
                    
                    print(f"\n提取字段数对比:")
                    print(f"  原始方法: {original_fields}个字段")
                    print(f"  处理后: {processed_fields}个字段")
                    if processed_fields > original_fields:
                        print(f"  改进: +{processed_fields - original_fields}个字段")
                    
                except Exception as e:
                    print(f"处理失败: {e}")
                    results[filename] = {"error": str(e)}
        
        return results
        
    except ImportError:
        print("无法导入invoice2data_client，使用正则表达式模拟测试")
        return test_with_regex_simulation()

def simulate_invoice2data_extraction(text):
    """模拟invoice2data的提取过程"""
    
    # 模拟现有模板的正则表达式
    patterns = {
        'invoice_number': r'发票号码[：:]\s*(\d+)',
        'invoice_date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
        'amount': r'(?:价税合计.*?小写.*?[¥￥]\s*|合\s*计.*?[¥￥]\s*)([0-9,]+\.?\d*)',
        'buyer_name': r'购.*?名\s*称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销|统一社会信用代码|$)',
        'seller_name': r'销.*?名\s*称[：:]\s*([^\n]+?)(?=\n|统一社会信用代码|项目名称|$)',
        'buyer_tax_id': r'购.*?统一社会信用代码[/纳税人识别号]*[：:]\s*([A-Z0-9]{18})',
        'seller_tax_id': r'销.*?统一社会信用代码[/纳税人识别号]*[：:]\s*([A-Z0-9]{18})'
    }
    
    result = {'status': 'success'}
    extracted_count = 0
    
    for field, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            result[field] = match.group(1).strip()
            extracted_count += 1
        else:
            result[field] = None
    
    result['extracted_fields_count'] = extracted_count
    
    return result

def test_with_regex_simulation():
    """使用正则表达式模拟测试"""
    
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
                original_result = simulate_invoice2data_extraction(original_text)
                
                # 处理后文本提取
                processed_text = remove_colon_newlines(original_text)
                processed_result = simulate_invoice2data_extraction(processed_text)
                
                results[filename] = {
                    "original": original_result,
                    "processed": processed_result
                }
                
                # 显示结果对比
                print("原始文本提取结果:")
                for field, value in original_result.items():
                    if field != 'status' and field != 'extracted_fields_count':
                        print(f"  {field}: {value}")
                
                print("\n处理后文本提取结果:")
                for field, value in processed_result.items():
                    if field != 'status' and field != 'extracted_fields_count':
                        print(f"  {field}: {value}")
                
                # 统计改进
                original_count = original_result.get('extracted_fields_count', 0)
                processed_count = processed_result.get('extracted_fields_count', 0)
                
                print(f"\n提取效果对比:")
                print(f"  原始方法: {original_count}个字段")
                print(f"  处理后: {processed_count}个字段")
                
                if processed_count > original_count:
                    improvement = processed_count - original_count
                    print(f"  改进: +{improvement}个字段 ({improvement/max(original_count,1)*100:.1f}%)")
                elif processed_count == original_count:
                    print(f"  效果: 保持一致")
                else:
                    print(f"  变化: {processed_count - original_count}个字段")
                
                # 显示具体改进的字段
                improved_fields = []
                for field in ['buyer_name', 'seller_name', 'buyer_tax_id', 'seller_tax_id']:
                    if not original_result.get(field) and processed_result.get(field):
                        improved_fields.append(f"{field}: {processed_result[field]}")
                
                if improved_fields:
                    print(f"  新提取到的字段:")
                    for field_info in improved_fields:
                        print(f"    {field_info}")
                
            except Exception as e:
                print(f"处理失败: {e}")
                results[filename] = {"error": str(e)}
    
    return results

def count_extracted_fields(result):
    """统计成功提取的字段数"""
    if result.get('status') != 'success':
        return 0
    
    count = 0
    key_fields = ['invoice_number', 'invoice_date', 'buyer_name', 'seller_name', 'buyer_tax_id', 'amount']
    
    for field in key_fields:
        if result.get(field):
            count += 1
    
    return count

def demonstrate_text_processing():
    """演示文本处理的具体效果"""
    
    print("=== 文本处理效果演示 ===\n")
    
    # 选择一个代表性文件进行详细分析
    test_file = "downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    if Path(test_file).exists():
        doc = pymupdf.open(test_file)
        page = doc[0]
        original_text = page.get_text()
        doc.close()
        
        print("原始文本中的关键部分:")
        # 显示包含冒号的关键行
        key_lines = []
        for i, line in enumerate(original_text.split('\n')):
            if any(keyword in line for keyword in ['名称：', '统一社会信用代码：', '发票号码：']):
                key_lines.append(f"行{i}: {repr(line)}")
        
        for line in key_lines[:10]:
            print(f"  {line}")
        
        # 应用处理
        processed_text = remove_colon_newlines(original_text)
        
        print("\n处理后的关键部分:")
        processed_lines = []
        for i, line in enumerate(processed_text.split('\n')):
            if any(keyword in line for keyword in ['名称：', '统一社会信用代码：', '发票号码：']):
                processed_lines.append(f"行{i}: {repr(line)}")
        
        for line in processed_lines[:10]:
            print(f"  {line}")
        
        # 显示具体的冒号处理效果
        print("\n冒号处理对比:")
        colon_samples_before = re.findall(r'.{0,20}[：:].{0,30}', original_text)[:5]
        colon_samples_after = re.findall(r'.{0,20}[：:].{0,30}', processed_text)[:5]
        
        for i, (before, after) in enumerate(zip(colon_samples_before, colon_samples_after)):
            if before != after:
                print(f"  示例{i+1}:")
                print(f"    处理前: {repr(before)}")
                print(f"    处理后: {repr(after)}")

def main():
    """主测试函数"""
    print("开始测试冒号后换行移除方案...")
    
    # 演示处理效果
    demonstrate_text_processing()
    
    # 测试实际提取效果
    print("\n" + "="*50)
    results = test_with_invoice2data()
    
    # 保存结果
    with open("colon_newline_test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 总结
    print(f"\n{'='*50}")
    print("测试总结:")
    
    total_files = len([r for r in results.values() if "error" not in r])
    total_improvements = 0
    
    for filename, result in results.items():
        if "error" not in result:
            original_count = count_extracted_fields(result.get("original", {}))
            processed_count = count_extracted_fields(result.get("processed", {}))
            if processed_count > original_count:
                total_improvements += (processed_count - original_count)
                print(f"  {filename}: +{processed_count - original_count}个字段")
    
    print(f"\n处理文件数: {total_files}")
    print(f"总改进字段数: {total_improvements}")
    print(f"结果已保存到: colon_newline_test_results.json")

if __name__ == "__main__":
    main()