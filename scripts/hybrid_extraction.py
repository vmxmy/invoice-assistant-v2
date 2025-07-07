#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
混合提取方案：
- 使用invoice2data进行整体模板匹配和大部分字段提取
- 仅对买方/卖方信息使用坐标提取（解决垂直布局问题）
"""

import os
import json
import pymupdf
from pathlib import Path
from datetime import datetime
from invoice2data import extract_data
from invoice2data.input import pdftotext
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app/services/ocr'))
from app.services.ocr.pymupdf_input import PyMuPDFInput
from enhanced_coordinate_extractor import EnhancedCoordinateExtractor
from typing import Dict, Optional

class HybridExtractor:
    """混合提取器"""
    
    def __init__(self, template_folder: str = "app/services/ocr/templates"):
        """初始化混合提取器"""
        self.template_folder = template_folder
        self.coordinate_extractor = EnhancedCoordinateExtractor()
        self.pymupdf_input = PyMuPDFInput()
        
        # 需要使用坐标提取的字段
        self.coordinate_fields = [
            'buyer_name',
            'seller_name', 
            'buyer_tax_id',
            'seller_tax_id'
        ]
    
    def extract(self, pdf_path: str) -> Dict:
        """混合提取"""
        result = {}
        
        # 1. 首先使用invoice2data提取
        try:
            # 使用PyMuPDF输入模块
            invoice2data_result = extract_data(
                pdf_path, 
                templates=self.template_folder,
                input_module=self.pymupdf_input
            )
            
            if invoice2data_result:
                result = invoice2data_result.copy()
                result['extraction_method'] = 'invoice2data'
        except Exception as e:
            print(f"invoice2data提取失败: {e}")
            result['extraction_method'] = 'failed'
        
        # 2. 对特定字段使用坐标提取
        try:
            coordinate_result = self.coordinate_extractor.extract_from_pdf(pdf_path)
            
            # 合并坐标提取的结果
            for field in self.coordinate_fields:
                if field in coordinate_result and coordinate_result[field]:
                    # 如果invoice2data没有提取到或提取结果较短，使用坐标提取
                    if field not in result or not result.get(field) or len(str(result.get(field, ''))) < 3:
                        result[field] = coordinate_result[field]
                        result[f'{field}_method'] = 'coordinate'
                    else:
                        result[f'{field}_method'] = 'invoice2data'
            
            # 如果invoice2data完全失败，但坐标提取成功，使用坐标提取的所有结果
            if result.get('extraction_method') == 'failed' and coordinate_result:
                result.update(coordinate_result)
                result['extraction_method'] = 'coordinate_only'
                
        except Exception as e:
            print(f"坐标提取失败: {e}")
        
        return result

def test_hybrid_extraction():
    """测试混合提取方案"""
    
    extractor = HybridExtractor()
    
    # 获取所有PDF文件
    pdf_files = []
    for root, dirs, files in os.walk("downloads"):
        for file in files:
            if file.endswith('.pdf') and not file.endswith('_annotated.pdf'):
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
        'amount': 0,
        'project_name': 0
    }
    
    # 统计提取方法
    method_stats = {
        'invoice2data': 0,
        'coordinate': 0,
        'mixed': 0,
        'failed': 0
    }
    
    successful_files = 0
    
    for i, pdf_path in enumerate(pdf_files):
        filename = os.path.basename(pdf_path)
        print(f"\n[{i+1}/{len(pdf_files)}] 处理: {filename}")
        
        try:
            result = extractor.extract(pdf_path)
            
            if result and result.get('extraction_method') != 'failed':
                results[filename] = result
                successful_files += 1
                
                # 统计提取方法
                if result.get('extraction_method') == 'coordinate_only':
                    method_stats['coordinate'] += 1
                elif any(result.get(f'{field}_method') == 'coordinate' for field in extractor.coordinate_fields):
                    method_stats['mixed'] += 1
                else:
                    method_stats['invoice2data'] += 1
                
                # 统计字段成功率
                for field in field_stats:
                    if field in result and result[field]:
                        field_stats[field] += 1
                
                # 显示提取结果摘要
                extracted_fields = [f for f in field_stats if f in result and result[f]]
                print(f"  成功提取 {len(extracted_fields)} 个字段")
                
                # 显示使用坐标提取的字段
                coordinate_used = [f for f in extractor.coordinate_fields 
                                 if result.get(f'{f}_method') == 'coordinate']
                if coordinate_used:
                    print(f"  使用坐标提取: {', '.join(coordinate_used)}")
            else:
                print(f"  提取失败")
                results[filename] = {'error': '提取失败'}
                method_stats['failed'] += 1
        
        except Exception as e:
            print(f"  异常: {str(e)}")
            results[filename] = {'error': str(e)}
            method_stats['failed'] += 1
    
    # 显示总体统计
    print("\n" + "="*60)
    print("总体统计:")
    print(f"成功处理: {successful_files}/{len(pdf_files)} 个文件 ({successful_files/len(pdf_files)*100:.1f}%)")
    
    print("\n提取方法统计:")
    for method, count in method_stats.items():
        percentage = count / len(pdf_files) * 100
        print(f"  {method:<15}: {count} 个文件 ({percentage:5.1f}%)")
    
    print("\n字段提取成功率:")
    for field, count in field_stats.items():
        percentage = count / len(pdf_files) * 100
        print(f"  {field:<15}: {count}/{len(pdf_files)} ({percentage:5.1f}%)")
    
    # 保存结果
    output_file = f"hybrid_extraction_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': len(pdf_files),
                'successful_files': successful_files,
                'field_stats': field_stats,
                'method_stats': method_stats
            },
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")
    
    # 分析改进效果
    print("\n混合方案改进分析:")
    
    # 统计坐标提取改进的字段
    coordinate_improvements = {}
    for field in extractor.coordinate_fields:
        improved_count = sum(1 for r in results.values() 
                           if r.get(f'{field}_method') == 'coordinate')
        if improved_count > 0:
            coordinate_improvements[field] = improved_count
    
    if coordinate_improvements:
        print("坐标提取改进的字段:")
        for field, count in coordinate_improvements.items():
            print(f"  {field}: {count} 个文件使用坐标提取")

if __name__ == "__main__":
    test_hybrid_extraction()