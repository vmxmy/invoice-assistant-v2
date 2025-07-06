#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用混合提取方案测试所有PDF发票
"""

import os
import json
from pathlib import Path
from datetime import datetime
from hybrid_extraction_simple import HybridExtractor
from collections import defaultdict

def test_all_pdfs():
    """测试downloads目录下的所有PDF文件"""
    
    print("初始化混合提取器...")
    extractor = HybridExtractor()
    
    # 获取所有PDF文件
    pdf_files = []
    for root, dirs, files in os.walk("downloads"):
        for file in files:
            if file.endswith('.pdf') and not file.endswith('_annotated.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    print(f"\n找到 {len(pdf_files)} 个PDF文件")
    print("="*80)
    
    # 统计数据
    results = {}
    successful_files = 0
    failed_files = []
    
    # 字段统计
    field_stats = defaultdict(int)
    field_extraction_methods = defaultdict(lambda: defaultdict(int))
    
    # 关键字段列表
    key_fields = [
        'invoice_number', 'invoice_date', 'buyer_name', 'seller_name',
        'buyer_tax_id', 'seller_tax_id', 'amount', 'project_name'
    ]
    
    # 逐个处理文件
    for i, pdf_path in enumerate(pdf_files):
        filename = os.path.basename(pdf_path)
        relative_path = os.path.relpath(pdf_path, 'downloads')
        print(f"\n[{i+1}/{len(pdf_files)}] 处理: {relative_path}")
        
        try:
            result = extractor.extract(pdf_path)
            
            if result and 'error' not in result:
                results[filename] = result
                successful_files += 1
                
                # 统计提取的字段
                extracted_fields = []
                for field in key_fields:
                    if field in result and result[field]:
                        field_stats[field] += 1
                        extracted_fields.append(field)
                        
                        # 统计提取方法
                        method = result.get(f'{field}_method', 'unknown')
                        field_extraction_methods[field][method] += 1
                
                print(f"  ✓ 成功提取 {len(extracted_fields)} 个字段")
                
                # 显示使用坐标提取的字段
                coordinate_fields = [f for f in key_fields 
                                   if result.get(f'{f}_method') == 'coordinate']
                if coordinate_fields:
                    print(f"  → 坐标提取: {', '.join(coordinate_fields)}")
            else:
                failed_files.append(relative_path)
                print(f"  ✗ 提取失败")
                
        except Exception as e:
            print(f"  ✗ 异常: {str(e)}")
            failed_files.append(relative_path)
            results[filename] = {'error': str(e)}
    
    # 显示总体统计
    print("\n" + "="*80)
    print("总体统计:")
    print(f"  成功处理: {successful_files}/{len(pdf_files)} 个文件 ({successful_files/len(pdf_files)*100:.1f}%)")
    print(f"  失败文件: {len(failed_files)} 个")
    
    # 字段提取成功率
    print("\n字段提取成功率:")
    print("-"*50)
    print(f"{'字段':<20} {'成功数':<10} {'成功率':<10}")
    print("-"*50)
    for field in key_fields:
        count = field_stats[field]
        percentage = count / len(pdf_files) * 100
        print(f"{field:<20} {count:<10} {percentage:>6.1f}%")
    
    # 提取方法分析
    print("\n提取方法分析:")
    print("-"*60)
    for field in key_fields:
        methods = field_extraction_methods[field]
        if methods:
            print(f"\n{field}:")
            for method, count in methods.items():
                percentage = count / field_stats[field] * 100 if field_stats[field] > 0 else 0
                print(f"  {method:<15}: {count:>3} 次 ({percentage:>5.1f}%)")
    
    # 失败文件列表
    if failed_files:
        print("\n失败文件列表:")
        for f in failed_files[:10]:  # 只显示前10个
            print(f"  - {f}")
        if len(failed_files) > 10:
            print(f"  ... 还有 {len(failed_files)-10} 个文件")
    
    # 保存详细结果
    output_file = f"hybrid_final_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # 转换datetime对象
    serializable_results = {}
    for filename, data in results.items():
        if isinstance(data, dict):
            serializable_data = {}
            for key, value in data.items():
                if hasattr(value, 'isoformat'):
                    serializable_data[key] = value.isoformat()
                else:
                    serializable_data[key] = value
            serializable_results[filename] = serializable_data
        else:
            serializable_results[filename] = data
    
    # 保存JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': len(pdf_files),
                'successful_files': successful_files,
                'failed_files': len(failed_files),
                'field_stats': dict(field_stats),
                'field_extraction_methods': {
                    field: dict(methods) 
                    for field, methods in field_extraction_methods.items()
                }
            },
            'failed_files': failed_files,
            'results': serializable_results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细结果已保存到: {output_file}")
    
    # 与之前的结果对比
    print("\n" + "="*80)
    print("混合方案效果总结:")
    print("-"*80)
    
    # 计算平均字段提取数
    total_fields_extracted = sum(field_stats.values())
    avg_fields_per_file = total_fields_extracted / successful_files if successful_files > 0 else 0
    print(f"平均每个文件提取: {avg_fields_per_file:.1f} 个字段")
    
    # 显示最成功的字段
    print("\n提取成功率最高的字段:")
    sorted_fields = sorted(field_stats.items(), key=lambda x: x[1], reverse=True)
    for field, count in sorted_fields[:5]:
        percentage = count / len(pdf_files) * 100
        print(f"  {field:<20}: {percentage:>6.1f}%")
    
    # 显示坐标提取的贡献
    print("\n坐标提取的贡献:")
    for field in ['buyer_name', 'seller_name', 'buyer_tax_id', 'seller_tax_id']:
        coord_count = field_extraction_methods[field].get('coordinate', 0)
        if coord_count > 0:
            percentage = coord_count / len(pdf_files) * 100
            print(f"  {field:<20}: {coord_count:>3} 个文件 ({percentage:>5.1f}%)")

if __name__ == "__main__":
    test_all_pdfs()