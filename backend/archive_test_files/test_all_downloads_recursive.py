#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试downloads目录下所有PDF文件（包括子目录）
使用智能融合方案
"""

import os
import json
from pathlib import Path
from datetime import datetime
from smart_invoice_extractor import SmartInvoiceExtractor

def find_all_pdfs(root_dir):
    """递归查找所有PDF文件"""
    pdf_files = []
    
    for root, dirs, files in os.walk(root_dir):
        # 跳过隐藏目录
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            if file.endswith('.pdf') and not file.endswith('_annotated.pdf'):
                pdf_path = os.path.join(root, file)
                pdf_files.append(pdf_path)
    
    return sorted(pdf_files)

def main():
    # 创建提取器
    extractor = SmartInvoiceExtractor(template_dir="app/services/ocr/templates")
    
    # 查找所有PDF文件
    pdf_files = find_all_pdfs("downloads")
    print(f"找到 {len(pdf_files)} 个PDF文件")
    
    # 按目录分组显示
    dir_groups = {}
    for pdf_path in pdf_files:
        dir_name = os.path.dirname(pdf_path)
        if dir_name not in dir_groups:
            dir_groups[dir_name] = []
        dir_groups[dir_name].append(pdf_path)
    
    print(f"\n目录分布:")
    for dir_name, files in sorted(dir_groups.items()):
        print(f"  {dir_name}: {len(files)} 个文件")
    
    # 初始化统计
    results = []
    stats = {
        'total': len(pdf_files),
        'success': 0,
        'by_directory': {},
        'field_counts': {},
        'source_counts': {},
        'failed_files': []
    }
    
    # 定义要统计的字段
    target_fields = ['invoice_number', 'invoice_date', 'total_amount', 
                    'buyer_name', 'seller_name', 'project_name']
    
    for field in target_fields:
        stats['field_counts'][field] = 0
        stats['source_counts'][field] = {'camelot': 0, 'invoice2data': 0, 'coordinate': 0}
    
    # 处理每个文件
    print(f"\n开始处理...")
    print("="*80)
    
    for i, pdf_path in enumerate(pdf_files):
        dir_name = os.path.dirname(pdf_path)
        file_name = os.path.basename(pdf_path)
        
        # 初始化目录统计
        if dir_name not in stats['by_directory']:
            stats['by_directory'][dir_name] = {
                'total': 0,
                'success': 0,
                'field_counts': {field: 0 for field in target_fields}
            }
        
        stats['by_directory'][dir_name]['total'] += 1
        
        print(f"\n[{i+1}/{len(pdf_files)}] 处理: {os.path.relpath(pdf_path, 'downloads')}")
        
        try:
            result = extractor.extract_from_pdf(pdf_path)
            results.append(result)
            
            if result['success']:
                stats['success'] += 1
                stats['by_directory'][dir_name]['success'] += 1
                
                # 统计字段提取情况和来源
                sources = result['data'].get('_extraction_sources', {})
                for field in target_fields:
                    if field in result['data'] and result['data'][field]:
                        stats['field_counts'][field] += 1
                        stats['by_directory'][dir_name]['field_counts'][field] += 1
                        
                        source = sources.get(field, 'unknown')
                        if source in stats['source_counts'][field]:
                            stats['source_counts'][field][source] += 1
            else:
                stats['failed_files'].append({
                    'file': os.path.relpath(pdf_path, 'downloads'),
                    'error': result.get('error', 'Unknown error'),
                    'data': result.get('data', {})
                })
                
        except Exception as e:
            print(f"  错误: {e}")
            stats['failed_files'].append({
                'file': os.path.relpath(pdf_path, 'downloads'),
                'error': str(e),
                'data': {}
            })
            results.append({
                'file': file_name,
                'success': False,
                'error': str(e)
            })
    
    # 打印详细统计
    print_detailed_statistics(stats, target_fields)
    
    # 保存结果
    output_file = f"all_downloads_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # 转换datetime对象
    def serialize_value(obj):
        if hasattr(obj, 'strftime'):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(obj, dict):
            return {k: serialize_value(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [serialize_value(v) for v in obj]
        else:
            return obj
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'statistics': stats,
            'results': serialize_value(results)
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")

def print_detailed_statistics(stats, target_fields):
    """打印详细统计信息"""
    print("\n" + "="*80)
    print("总体统计:")
    print("="*80)
    
    success_rate = stats['success'] / stats['total'] * 100
    print(f"总体成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
    
    # 按目录统计
    print("\n按目录统计:")
    print("-"*60)
    for dir_name, dir_stats in sorted(stats['by_directory'].items()):
        dir_success_rate = dir_stats['success'] / dir_stats['total'] * 100
        print(f"\n{dir_name}:")
        print(f"  成功率: {dir_stats['success']}/{dir_stats['total']} ({dir_success_rate:.1f}%)")
        
        # 显示该目录的字段提取率
        print("  字段提取率:")
        field_names = {
            'invoice_number': '发票号码',
            'invoice_date': '开票日期',
            'total_amount': '含税金额',
            'buyer_name': '采购方',
            'seller_name': '销售方',
            'project_name': '项目名称'
        }
        
        for field, count in dir_stats['field_counts'].items():
            if dir_stats['total'] > 0:
                field_rate = count / dir_stats['total'] * 100
                field_name = field_names.get(field, field)
                print(f"    {field_name:<10}: {count:>3}/{dir_stats['total']} ({field_rate:>5.1f}%)")
    
    # 总体字段统计
    print("\n总体字段提取成功率:")
    print("-"*60)
    field_names = {
        'invoice_number': '发票号码',
        'invoice_date': '开票日期',
        'total_amount': '含税金额',
        'buyer_name': '采购方',
        'seller_name': '销售方',
        'project_name': '项目名称'
    }
    
    for field, count in stats['field_counts'].items():
        percentage = count / stats['total'] * 100
        field_name = field_names.get(field, field)
        print(f"  {field_name:<10}: {count:>3}/{stats['total']} ({percentage:>5.1f}%)")
    
    # 数据来源分布
    print("\n数据来源分布:")
    print("-"*60)
    for field in stats['source_counts']:
        sources = stats['source_counts'][field]
        total_extracted = sum(sources.values())
        if total_extracted > 0:
            field_name = field_names.get(field, field)
            print(f"\n  {field_name}:")
            for source, count in sources.items():
                if count > 0:
                    percentage = count / total_extracted * 100
                    print(f"    {source:<12}: {count:>3} ({percentage:>5.1f}%)")
    
    # 失败文件列表
    if stats['failed_files']:
        print("\n失败文件详情:")
        print("-"*60)
        for failed in stats['failed_files']:
            print(f"\n文件: {failed['file']}")
            if 'error' in failed:
                print(f"错误: {failed['error']}")
            if failed.get('data'):
                print("部分提取的数据:")
                for k, v in failed['data'].items():
                    if not k.startswith('_'):
                        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()