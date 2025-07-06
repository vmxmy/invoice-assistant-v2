#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试增强的坐标提取器在所有PDF文件上的效果
"""

import os
import json
from pathlib import Path
from datetime import datetime
from enhanced_coordinate_extractor import EnhancedCoordinateExtractor

def test_all_pdfs():
    """测试所有PDF文件"""
    
    extractor = EnhancedCoordinateExtractor()
    
    # 获取所有PDF文件
    pdf_files = []
    for root, dirs, files in os.walk("downloads"):
        for file in files:
            if file.endswith('.pdf'):
                pdf_files.append(os.path.join(root, file))
    
    print(f"找到 {len(pdf_files)} 个PDF文件")
    
    results = {}
    field_stats = {
        'invoice_number': 0,
        'invoice_date': 0,
        'buyer_name': 0,
        'seller_name': 0,
        'buyer_tax_id': 0,
        'seller_tax_id': 0,
        'amount': 0
    }
    
    successful_files = 0
    
    for i, pdf_path in enumerate(pdf_files):
        filename = os.path.basename(pdf_path)
        print(f"\n[{i+1}/{len(pdf_files)}] 处理: {filename}")
        
        try:
            result = extractor.extract_from_pdf(pdf_path)
            
            if 'error' not in result:
                results[filename] = result
                successful_files += 1
                
                # 统计字段成功率
                for field in field_stats:
                    if field in result and result[field]:
                        field_stats[field] += 1
                
                # 显示提取结果摘要
                extracted_fields = [f for f in field_stats if f in result and result[f]]
                print(f"  成功提取 {len(extracted_fields)} 个字段")
            else:
                print(f"  错误: {result['error']}")
                results[filename] = result
        
        except Exception as e:
            print(f"  异常: {str(e)}")
            results[filename] = {'error': str(e)}
    
    # 显示总体统计
    print("\n" + "="*60)
    print("总体统计:")
    print(f"成功处理: {successful_files}/{len(pdf_files)} 个文件 ({successful_files/len(pdf_files)*100:.1f}%)")
    
    print("\n字段提取成功率:")
    for field, count in field_stats.items():
        percentage = count / len(pdf_files) * 100
        print(f"  {field:<15}: {count}/{len(pdf_files)} ({percentage:5.1f}%)")
    
    # 保存结果
    output_file = f"enhanced_extractor_all_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': len(pdf_files),
                'successful_files': successful_files,
                'field_stats': field_stats
            },
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")
    
    # 分析失败案例
    print("\n字段提取失败分析:")
    failed_fields = {}
    for field in field_stats:
        failed_files = []
        for filename, result in results.items():
            if 'error' not in result and (field not in result or not result.get(field)):
                failed_files.append(filename)
        
        if failed_files:
            failed_fields[field] = failed_files
            print(f"\n{field} 失败的文件 ({len(failed_files)} 个):")
            for f in failed_files[:3]:  # 只显示前3个
                print(f"  - {f}")
            if len(failed_files) > 3:
                print(f"  ... 还有 {len(failed_files)-3} 个文件")

if __name__ == "__main__":
    test_all_pdfs()