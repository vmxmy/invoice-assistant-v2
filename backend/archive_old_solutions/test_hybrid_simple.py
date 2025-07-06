#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简单测试混合提取方案
"""

import os
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from enhanced_coordinate_extractor import EnhancedCoordinateExtractor

def test_single_file():
    """测试单个文件"""
    
    pdf_path = "downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    template_folder = "app/services/ocr/templates"
    
    print(f"测试文件: {pdf_path}")
    print("="*60)
    
    # 1. 测试invoice2data
    print("\n1. Invoice2data提取:")
    invoice2data_result = None
    try:
        # 正确的方式：先加载模板
        templates = read_templates(template_folder)
        invoice2data_result = extract_data(pdf_path, templates=templates)
        if invoice2data_result:
            print(f"  成功提取 {len(invoice2data_result)} 个字段")
            for key, value in invoice2data_result.items():
                print(f"    {key}: {value}")
        else:
            print("  未能提取到数据")
    except Exception as e:
        print(f"  错误: {e}")
    
    # 2. 测试坐标提取
    print("\n2. 坐标提取:")
    coordinate_result = None
    try:
        extractor = EnhancedCoordinateExtractor()
        coordinate_result = extractor.extract_from_pdf(pdf_path)
        if coordinate_result and 'error' not in coordinate_result:
            print(f"  成功提取 {len(coordinate_result)} 个字段")
            for key, value in coordinate_result.items():
                print(f"    {key}: {value}")
        else:
            print("  未能提取到数据")
    except Exception as e:
        print(f"  错误: {e}")
    
    # 3. 混合方案
    print("\n3. 混合方案效果:")
    final_result = {}
    
    # 先使用invoice2data的结果
    if invoice2data_result:
        final_result.update(invoice2data_result)
    
    # 对特定字段使用坐标提取
    coordinate_fields = ['buyer_name', 'seller_name', 'buyer_tax_id', 'seller_tax_id']
    
    for field in coordinate_fields:
        if coordinate_result and field in coordinate_result:
            # 如果invoice2data没有提取到或结果较短，使用坐标提取
            if field not in final_result or not final_result.get(field) or len(str(final_result.get(field, ''))) < 3:
                print(f"  使用坐标提取改进 {field}: {coordinate_result[field]}")
                final_result[field] = coordinate_result[field]
    
    print(f"\n最终提取 {len(final_result)} 个字段:")
    for key, value in final_result.items():
        print(f"    {key}: {value}")

if __name__ == "__main__":
    test_single_file()