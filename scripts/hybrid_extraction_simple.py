#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简化的混合提取方案：
- 使用invoice2data进行整体模板匹配和大部分字段提取
- 仅对买方/卖方信息使用坐标提取（解决垂直布局问题）
"""

import os
import json
import fitz  # PyMuPDF
from pathlib import Path
from datetime import datetime
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from invoice2data.input import pdftotext
from enhanced_coordinate_extractor import EnhancedCoordinateExtractor
from typing import Dict, Optional


def pymupdf_to_text(path: str, area_details: Optional[Dict] = None) -> str:
    """使用PyMuPDF提取PDF文本"""
    try:
        doc = fitz.open(str(path))
        if doc.page_count == 0:
            raise ValueError(f"PDF文件没有页面: {path}")
        
        text_parts = []
        for page_num in range(doc.page_count):
            page = doc[page_num]
            page_text = page.get_text("text", sort=True)
            if page_text.strip():
                text_parts.append(page_text)
        
        doc.close()
        return "\n\n".join(text_parts)
        
    except Exception as e:
        print(f"PyMuPDF提取失败: {e}")
        raise


# 创建一个模块对象供invoice2data使用
class PyMuPDFModule:
    to_text = staticmethod(pymupdf_to_text)


class HybridExtractor:
    """混合提取器"""
    
    def __init__(self, template_folder: str = "app/services/ocr/templates"):
        """初始化混合提取器"""
        self.template_folder = template_folder
        self.templates = read_templates(template_folder)
        self.coordinate_extractor = EnhancedCoordinateExtractor()
        self.pymupdf_module = PyMuPDFModule()
        
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
            # 使用已加载的模板
            invoice2data_result = extract_data(
                pdf_path, 
                templates=self.templates
            )
            
            if invoice2data_result:
                result = invoice2data_result.copy()
                result['extraction_method'] = 'invoice2data'
                # 标记所有字段的提取方法
                field_names = list(result.keys())  # 创建字段名列表副本
                for field in field_names:
                    if field not in ['extraction_method'] and not field.endswith('_method'):
                        result[f'{field}_method'] = 'invoice2data'
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
            
            # 如果invoice2data完全失败，但坐标提取成功，使用坐标提取的所有结果
            if result.get('extraction_method') == 'failed' and coordinate_result:
                result.update(coordinate_result)
                result['extraction_method'] = 'coordinate_only'
                for field in coordinate_result:
                    if field != 'error':
                        result[f'{field}_method'] = 'coordinate'
                
        except Exception as e:
            print(f"坐标提取失败: {e}")
        
        return result


def test_hybrid_extraction():
    """测试混合提取方案"""
    
    extractor = HybridExtractor()
    
    # 测试特定的几个文件
    test_files = [
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
        "downloads/25439165666000019624.pdf",
        "downloads/dzfp_25432000000032177192_杭州趣链科技有限公司_20250313093318.pdf"
    ]
    
    print(f"测试 {len(test_files)} 个文件的混合提取效果")
    print("="*60)
    
    for i, pdf_path in enumerate(test_files):
        if not Path(pdf_path).exists():
            continue
            
        filename = os.path.basename(pdf_path)
        print(f"\n[{i+1}/{len(test_files)}] 处理: {filename}")
        
        result = extractor.extract(pdf_path)
        
        # 显示提取结果
        if result:
            print(f"  提取方法: {result.get('extraction_method', 'unknown')}")
            
            # 显示关键字段
            key_fields = ['invoice_number', 'invoice_date', 'buyer_name', 'seller_name', 
                         'buyer_tax_id', 'seller_tax_id', 'amount', 'project_name']
            
            print("  提取结果:")
            for field in key_fields:
                if field in result:
                    method = result.get(f'{field}_method', '')
                    value = result[field]
                    if method == 'coordinate':
                        print(f"    {field}: {value} [坐标提取]")
                    else:
                        print(f"    {field}: {value}")
            
            # 统计混合提取的改进
            coordinate_used = [f for f in extractor.coordinate_fields 
                             if result.get(f'{f}_method') == 'coordinate']
            if coordinate_used:
                print(f"  使用坐标提取改进了 {len(coordinate_used)} 个字段: {', '.join(coordinate_used)}")


def test_all_pdfs_hybrid():
    """测试所有PDF文件的混合提取"""
    
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
        'invoice2data_only': 0,
        'coordinate_only': 0,
        'mixed': 0,
        'failed': 0
    }
    
    # 统计坐标提取改进
    coordinate_improvements = {
        'buyer_name': 0,
        'seller_name': 0,
        'buyer_tax_id': 0,
        'seller_tax_id': 0
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
                    method_stats['coordinate_only'] += 1
                elif any(result.get(f'{field}_method') == 'coordinate' for field in extractor.coordinate_fields):
                    method_stats['mixed'] += 1
                else:
                    method_stats['invoice2data_only'] += 1
                
                # 统计字段成功率
                for field in field_stats:
                    if field in result and result[field]:
                        field_stats[field] += 1
                
                # 统计坐标提取改进
                for field in coordinate_improvements:
                    if result.get(f'{field}_method') == 'coordinate':
                        coordinate_improvements[field] += 1
                
                # 显示提取结果摘要
                extracted_fields = [f for f in field_stats if f in result and result[f]]
                print(f"  成功提取 {len(extracted_fields)} 个字段")
                
                # 显示使用坐标提取的字段
                coordinate_used = [f for f in extractor.coordinate_fields 
                                 if result.get(f'{f}_method') == 'coordinate']
                if coordinate_used:
                    print(f"  坐标提取: {', '.join(coordinate_used)}")
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
        print(f"  {method:<20}: {count:>2} 个文件 ({percentage:5.1f}%)")
    
    print("\n字段提取成功率:")
    for field, count in field_stats.items():
        percentage = count / len(pdf_files) * 100
        print(f"  {field:<15}: {count:>2}/{len(pdf_files)} ({percentage:5.1f}%)")
    
    print("\n坐标提取改进统计:")
    for field, count in coordinate_improvements.items():
        if count > 0:
            percentage = count / len(pdf_files) * 100
            print(f"  {field:<15}: {count:>2} 个文件使用坐标提取 ({percentage:5.1f}%)")
    
    # 保存结果
    output_file = f"hybrid_extraction_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # 转换datetime对象为字符串
    serializable_results = {}
    for filename, data in results.items():
        serializable_data = {}
        for key, value in data.items():
            if hasattr(value, 'isoformat'):  # 检查是否是datetime对象
                serializable_data[key] = value.isoformat()
            else:
                serializable_data[key] = value
        serializable_results[filename] = serializable_data
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_files': len(pdf_files),
                'successful_files': successful_files,
                'field_stats': field_stats,
                'method_stats': method_stats,
                'coordinate_improvements': coordinate_improvements
            },
            'results': serializable_results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")


if __name__ == "__main__":
    # 先测试几个文件
    test_hybrid_extraction()
    
    print("\n" + "="*60)
    print("开始测试所有PDF文件...")
    print("="*60)
    
    # 测试所有文件
    test_all_pdfs_hybrid()