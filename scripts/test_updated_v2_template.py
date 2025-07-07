#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试更新后的V2模板
"""
import os
import json
from datetime import datetime, date
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def test_single_pdf_detailed(pdf_path, templates):
    """详细测试单个PDF"""
    filename = os.path.basename(pdf_path)
    print(f"\n{'='*60}")
    print(f"测试: {filename}")
    print(f"{'='*60}")
    
    try:
        result = extract_data(pdf_path, templates=templates)
        
        if result:
            print("✅ 提取成功")
            # 显示所有提取的字段
            for key, value in result.items():
                if key != 'desc':
                    if isinstance(value, (datetime, date)):
                        value = value.strftime('%Y-%m-%d')
                    print(f"  {key}: {value}")
            return True, result
        else:
            print("❌ 未匹配模板")
            return False, None
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        return False, None

def main():
    """主函数"""
    template_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates"
    
    # 重点测试的文件
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf"
    ]
    
    # 加载模板
    templates = read_templates(template_dir)
    print(f"加载了 {len(templates)} 个模板")
    
    success_count = 0
    complete_extraction = 0  # 完整提取（包括公司名称）
    
    for pdf_path in test_files:
        success, result = test_single_pdf_detailed(pdf_path, templates)
        
        if success:
            success_count += 1
            # 检查是否完整提取
            if result.get('buyer_name') and result.get('seller_name'):
                complete_extraction += 1
    
    # 汇总
    print(f"\n\n{'='*60}")
    print("测试汇总:")
    print(f"{'='*60}")
    print(f"总文件数: {len(test_files)}")
    print(f"成功提取: {success_count} ({success_count/len(test_files)*100:.0f}%)")
    print(f"完整提取（含公司名称）: {complete_extraction} ({complete_extraction/len(test_files)*100:.0f}%)")

if __name__ == "__main__":
    main()