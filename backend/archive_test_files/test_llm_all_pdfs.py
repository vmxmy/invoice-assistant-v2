#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用增强规则提取（模拟LLM）测试所有PDF文件
"""

import os
import json
from datetime import datetime
from test_llm_extraction_simple import SimpleLLMExtractor

def test_all_pdfs():
    """测试所有PDF文件"""
    extractor = SimpleLLMExtractor()
    
    # 获取所有PDF文件
    pdf_files = []
    for root, dirs, files in os.walk("downloads"):
        for file in files:
            if file.endswith('.pdf') and not file.endswith('_annotated.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    pdf_files.sort()
    print(f"找到 {len(pdf_files)} 个PDF文件")
    
    results = []
    stats = {
        'total': len(pdf_files),
        'success': 0,
        'errors': [],
        'field_extraction': {},
        'invoice_types': {}
    }
    
    # 定义要统计的字段
    target_fields = ['invoice_number', 'invoice_date', 'buyer_name', 
                    'seller_name', 'total_amount', 'project_name']
    
    for field in target_fields:
        stats['field_extraction'][field] = 0
    
    print("\n开始处理...")
    print("="*80)
    
    for i, pdf_path in enumerate(pdf_files):
        print(f"\n[{i+1}/{len(pdf_files)}] 处理: {os.path.relpath(pdf_path, 'downloads')}")
        
        try:
            result = extractor.extract_from_pdf(pdf_path)
            
            file_result = {
                'file': os.path.basename(pdf_path),
                'success': 'error' not in result,
                'data': result
            }
            results.append(file_result)
            
            if 'error' not in result:
                stats['success'] += 1
                
                # 统计字段提取
                for field in target_fields:
                    if field in result and result[field] is not None:
                        stats['field_extraction'][field] += 1
                
                # 统计发票类型
                invoice_type = result.get('invoice_type', '未知类型')
                if invoice_type not in stats['invoice_types']:
                    stats['invoice_types'][invoice_type] = 0
                stats['invoice_types'][invoice_type] += 1
                
                # 打印关键信息
                print(f"  ✅ 成功提取")
                print(f"     发票号码: {result.get('invoice_number', '未提取')}")
                print(f"     购买方: {result.get('buyer_name', '未提取')}")
                print(f"     金额: {result.get('total_amount', '未提取')}")
                if result.get('project_name'):
                    print(f"     项目: {result.get('project_name')}")
            else:
                stats['errors'].append({
                    'file': os.path.basename(pdf_path),
                    'error': result.get('error')
                })
                print(f"  ❌ 失败: {result.get('error')}")
                
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            stats['errors'].append({
                'file': os.path.basename(pdf_path),
                'error': str(e)
            })
            results.append({
                'file': os.path.basename(pdf_path),
                'success': False,
                'error': str(e)
            })
    
    # 打印详细统计
    print("\n" + "="*80)
    print("增强规则提取（模拟LLM）统计:")
    print("="*80)
    
    success_rate = stats['success'] / stats['total'] * 100
    print(f"\n总体成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
    
    print("\n字段提取成功率:")
    field_names = {
        'invoice_number': '发票号码',
        'invoice_date': '开票日期',
        'buyer_name': '采购方',
        'seller_name': '销售方',
        'total_amount': '含税金额',
        'project_name': '项目名称'
    }
    
    for field, count in stats['field_extraction'].items():
        percentage = count / stats['total'] * 100
        field_name = field_names.get(field, field)
        print(f"  {field_name:<10}: {count:>2}/{stats['total']} ({percentage:>5.1f}%)")
    
    print("\n发票类型分布:")
    for invoice_type, count in stats['invoice_types'].items():
        percentage = count / stats['total'] * 100
        print(f"  {invoice_type}: {count} ({percentage:.1f}%)")
    
    if stats['errors']:
        print(f"\n失败文件 ({len(stats['errors'])}个):")
        for error in stats['errors']:
            print(f"  {error['file']}: {error['error']}")
    
    # 与之前的方案对比
    print("\n" + "="*80)
    print("与其他方案对比:")
    print("="*80)
    print("| 方案 | 成功率 | 发票号码 | 开票日期 | 采购方 | 销售方 | 金额 | 项目名称 |")
    print("|------|--------|----------|----------|--------|--------|------|----------|")
    
    # 智能融合方案的结果
    print("| 智能融合 | 96.4% | 96.4% | 96.4% | 96.4% | 96.4% | 96.4% | 25.0% |")
    
    # 当前方案
    current_stats = []
    current_stats.append(f"{success_rate:.1f}%")
    for field in ['invoice_number', 'invoice_date', 'buyer_name', 'seller_name', 'total_amount', 'project_name']:
        field_rate = stats['field_extraction'][field] / stats['total'] * 100
        current_stats.append(f"{field_rate:.1f}%")
    print(f"| 增强规则(LLM) | {' | '.join(current_stats)} |")
    
    # 保存结果
    output_file = f"llm_all_pdfs_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'statistics': stats,
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")

if __name__ == "__main__":
    test_all_pdfs()