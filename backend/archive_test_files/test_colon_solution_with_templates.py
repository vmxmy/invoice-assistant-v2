#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用现有模板测试冒号换行移除方案的效果
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

def test_with_existing_client():
    """使用现有的invoice2data客户端测试"""
    
    try:
        from invoice2data_client import Invoice2DataClient
        
        client = Invoice2DataClient()
        print("成功创建Invoice2DataClient")
        
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
                    # 方法1: 原始客户端提取
                    print("1. 原始客户端提取:")
                    original_result = client.extract_invoice_data(pdf_path)
                    
                    print(f"   状态: {original_result.get('status')}")
                    original_fields = extract_key_fields(original_result)
                    print(f"   关键字段: {original_fields}")
                    original_count = len([v for v in original_fields.values() if v])
                    print(f"   字段数: {original_count}")
                    
                    # 方法2: 带预处理的提取
                    print("\n2. 预处理后提取:")
                    
                    # 修改客户端以使用预处理
                    processed_result = extract_with_preprocessing(client, pdf_path)
                    
                    print(f"   状态: {processed_result.get('status')}")
                    processed_fields = extract_key_fields(processed_result)
                    print(f"   关键字段: {processed_fields}")
                    processed_count = len([v for v in processed_fields.values() if v])
                    print(f"   字段数: {processed_count}")
                    
                    # 对比分析
                    improvement = processed_count - original_count
                    print(f"\n3. 效果对比:")
                    print(f"   原始: {original_count}个字段")
                    print(f"   处理后: {processed_count}个字段")
                    print(f"   改进: {improvement:+d}个字段")
                    
                    # 显示具体改进的字段
                    improved_fields = []
                    for field, value in processed_fields.items():
                        if value and (not original_fields.get(field) or original_fields[field] != value):
                            improved_fields.append(f"{field}: {value}")
                    
                    if improved_fields:
                        print(f"   新增/改进字段:")
                        for field in improved_fields:
                            print(f"     {field}")
                    
                    results[filename] = {
                        "original": original_result,
                        "processed": processed_result,
                        "original_fields": original_fields,
                        "processed_fields": processed_fields,
                        "improvement": improvement
                    }
                    
                except Exception as e:
                    print(f"处理失败: {e}")
                    import traceback
                    traceback.print_exc()
                    results[filename] = {"error": str(e)}
        
        return results
        
    except ImportError as e:
        print(f"无法导入invoice2data_client: {e}")
        return test_with_direct_template_matching()

def extract_with_preprocessing(client, pdf_path):
    """使用预处理进行提取"""
    
    # 获取原始文本
    doc = pymupdf.open(pdf_path)
    page = doc[0]
    original_text = page.get_text()
    doc.close()
    
    # 应用预处理
    processed_text = remove_colon_newlines(original_text)
    
    # 临时保存处理后的文本
    temp_file = f"temp_processed_{Path(pdf_path).stem}.txt"
    with open(temp_file, "w", encoding="utf-8") as f:
        f.write(processed_text)
    
    try:
        # 使用模拟的方式进行提取（因为invoice2data需要PDF文件）
        # 这里我们直接在处理后的文本上应用模板正则
        result = apply_template_patterns_to_text(processed_text)
        
        return result
        
    finally:
        # 清理临时文件
        if os.path.exists(temp_file):
            os.remove(temp_file)

def apply_template_patterns_to_text(text):
    """在文本上应用模板正则模式"""
    
    # 从现有模板中提取的正则模式
    patterns = {
        'invoice_number': r'发票号码[：:]\s*(\d+)',
        'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
        'amount': r'(?:价税合计.*?小写.*?[¥￥]\s*|合\s*计.*?[¥￥]\s*)([0-9,]+\.?\d*)',
        'buyer_name': r'购.*?名\s*称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销|统一社会信用代码|$)',
        'seller_name': r'销.*?名\s*称[：:]\s*([^\n]+?)(?=\n|统一社会信用代码|项目名称|$)',
        'buyer_tax_id': r'购.*?统一社会信用代码[/纳税人识别号]*[：:]\s*([A-Z0-9]{18})',
        'seller_tax_id': r'销.*?统一社会信用代码[/纳税人识别号]*[：:]\s*([A-Z0-9]{18})'
    }
    
    result = {
        'status': 'success',
        'extraction_method': 'colon_preprocessing',
        'raw_data': {},
        'structured_data': {
            'main_info': {},
            'buyer_info': {},
            'seller_info': {},
            'summary': {}
        }
    }
    
    # 应用模式
    for field, pattern in patterns.items():
        match = re.search(pattern, text)
        if match:
            value = match.group(1).strip()
            result['raw_data'][field] = value
            
            # 分类到结构化数据
            if field == 'invoice_number':
                result['structured_data']['main_info']['invoice_number'] = value
            elif field == 'date':
                result['structured_data']['main_info']['invoice_date'] = value
            elif field in ['buyer_name', 'buyer_tax_id']:
                key = 'name' if field == 'buyer_name' else 'tax_id'
                result['structured_data']['buyer_info'][key] = value
            elif field in ['seller_name', 'seller_tax_id']:
                key = 'name' if field == 'seller_name' else 'tax_id'
                result['structured_data']['seller_info'][key] = value
            elif field == 'amount':
                result['structured_data']['summary']['total_amount'] = value
    
    return result

def test_with_direct_template_matching():
    """直接使用模板正则进行测试"""
    
    print("使用直接模板匹配进行测试...")
    
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
                
                print("1. 原始文本提取:")
                original_result = apply_template_patterns_to_text(original_text)
                original_fields = extract_key_fields(original_result)
                original_count = len([v for v in original_fields.values() if v])
                print(f"   字段: {original_fields}")
                print(f"   数量: {original_count}")
                
                print("\n2. 处理后文本提取:")
                processed_text = remove_colon_newlines(original_text)
                
                # 显示处理效果
                print("   文本处理效果:")
                colon_before = len(re.findall(r'[：:]\s*\n', original_text))
                colon_after = len(re.findall(r'[：:]\s*\n', processed_text))
                print(f"     冒号后换行数: {colon_before} -> {colon_after}")
                
                processed_result = apply_template_patterns_to_text(processed_text)
                processed_fields = extract_key_fields(processed_result)
                processed_count = len([v for v in processed_fields.values() if v])
                print(f"   字段: {processed_fields}")
                print(f"   数量: {processed_count}")
                
                improvement = processed_count - original_count
                print(f"\n3. 效果分析:")
                print(f"   改进: {improvement:+d}个字段")
                
                # 分析具体改进
                for field in processed_fields:
                    orig_val = original_fields.get(field)
                    proc_val = processed_fields.get(field)
                    
                    if proc_val and not orig_val:
                        print(f"   新增: {field} = {proc_val}")
                    elif proc_val and orig_val and proc_val != orig_val:
                        print(f"   改进: {field} = {orig_val} -> {proc_val}")
                
                results[filename] = {
                    "original_fields": original_fields,
                    "processed_fields": processed_fields,
                    "improvement": improvement
                }
                
            except Exception as e:
                print(f"处理失败: {e}")
                results[filename] = {"error": str(e)}
    
    return results

def extract_key_fields(result):
    """从结果中提取关键字段"""
    if not result or result.get('status') != 'success':
        return {}
    
    key_fields = {}
    
    # 从raw_data提取
    if 'raw_data' in result:
        raw_data = result['raw_data']
        key_fields.update({
            'invoice_number': raw_data.get('invoice_number'),
            'invoice_date': raw_data.get('date'),
            'buyer_name': raw_data.get('buyer_name'),
            'seller_name': raw_data.get('seller_name'),
            'buyer_tax_id': raw_data.get('buyer_tax_id'),
            'amount': raw_data.get('amount')
        })
    
    # 从structured_data提取
    if 'structured_data' in result:
        structured = result['structured_data']
        main_info = structured.get('main_info', {})
        buyer_info = structured.get('buyer_info', {})
        seller_info = structured.get('seller_info', {})
        summary = structured.get('summary', {})
        
        key_fields.update({
            'invoice_number': key_fields.get('invoice_number') or main_info.get('invoice_number'),
            'invoice_date': key_fields.get('invoice_date') or main_info.get('invoice_date'),
            'buyer_name': key_fields.get('buyer_name') or buyer_info.get('name'),
            'seller_name': key_fields.get('seller_name') or seller_info.get('name'),
            'buyer_tax_id': key_fields.get('buyer_tax_id') or buyer_info.get('tax_id'),
            'amount': key_fields.get('amount') or summary.get('total_amount')
        })
    
    # 过滤空值
    return {k: v for k, v in key_fields.items() if v}

def main():
    """主测试函数"""
    print("测试冒号后换行移除方案 - 使用现有模板")
    print("="*60)
    
    results = test_with_existing_client()
    
    # 保存结果
    with open("colon_template_test_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 统计总结
    print(f"\n{'='*60}")
    print("测试总结:")
    
    total_files = 0
    total_improvement = 0
    successful_improvements = []
    
    for filename, result in results.items():
        if "error" not in result:
            total_files += 1
            improvement = result.get("improvement", 0)
            total_improvement += improvement
            
            if improvement > 0:
                successful_improvements.append((filename, improvement, result.get("processed_fields", {})))
    
    print(f"\n处理文件数: {total_files}")
    print(f"总改进字段数: {total_improvement}")
    
    if successful_improvements:
        print(f"\n成功改进的文件:")
        for filename, improvement, fields in successful_improvements:
            print(f"  {filename}:")
            print(f"    改进: +{improvement}个字段")
            for field, value in fields.items():
                print(f"    {field}: {value}")
    else:
        print(f"\n本次测试中，冒号换行移除方案在这些特定文件上未显示明显改进")
        print(f"可能的原因:")
        print(f"  1. 这些PDF文件的文本结构较为特殊")
        print(f"  2. 主要问题不是冒号后换行，而是文本提取顺序")
        print(f"  3. 需要结合其他预处理方法")
    
    print(f"\n结果已保存到: colon_template_test_results.json")

if __name__ == "__main__":
    main()