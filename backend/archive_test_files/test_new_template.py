#!/usr/bin/env python3
"""
测试新的普通发票模板
"""

import sys
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

def test_new_template():
    """测试新的普通发票模板"""
    failed_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    ]
    
    print("🧪 测试新的普通发票模板")
    print("=" * 60)
    
    # 加载模板
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    print(f"加载了 {len(templates)} 个模板")
    
    for template in templates:
        print(f"- {template.get('issuer', 'Unknown')}")
    print()
    
    # 测试失败的文件
    for i, pdf_file in enumerate(failed_files, 1):
        if not Path(pdf_file).exists():
            print(f"文件不存在: {pdf_file}")
            continue
            
        print(f"📄 [{i}] 测试: {Path(pdf_file).name}")
        print("-" * 40)
        
        try:
            result = extract_data(pdf_file, templates=templates)
            
            if result:
                print(f"✅ 提取成功!")
                print(f"   发票号码: {result.get('invoice_number', 'N/A')}")
                print(f"   开票日期: {result.get('date', 'N/A')}")
                print(f"   金额: {result.get('amount', 'N/A')}")
                print(f"   销售方: {result.get('seller_name', 'N/A')}")
                print(f"   购买方: {result.get('buyer_name', 'N/A')}")
                print(f"   大写金额: {result.get('chinese_words', 'N/A')}")
                print(f"   开票人: {result.get('issuer_person', 'N/A')}")
                print(f"   所有字段: {list(result.keys())}")
            else:
                print("❌ 提取失败: 无结果")
                
        except Exception as e:
            print(f"❌ 提取失败: {e}")
        
        print()

if __name__ == "__main__":
    test_new_template()