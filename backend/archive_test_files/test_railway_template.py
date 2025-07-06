#!/usr/bin/env python3
"""
测试铁路电子客票模板
"""

import sys
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
import yaml

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def test_railway_template():
    """测试铁路电子客票模板"""
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    
    # 测试文件
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/25439165666000019624.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/25439122799000011090.pdf", 
        "/Users/xumingyang/app/invoice_assist/downloads/25439165660000008536_1.pdf"
    ]
    
    print("🚂 测试铁路电子客票模板")
    print("=" * 60)
    
    # 加载模板
    templates = read_templates(str(templates_dir))
    print(f"加载了 {len(templates)} 个模板")
    
    for template in templates:
        print(f"- {template.get('issuer', 'Unknown')}")
    print()
    
    # 测试每个文件
    for i, pdf_file in enumerate(test_files, 1):
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
                print(f"   购买方: {result.get('buyer_name', 'N/A')}")
                print(f"   车次: {result.get('train_number', 'N/A')}")
                print(f"   座位类型: {result.get('seat_type', 'N/A')}")
                print(f"   所有字段: {list(result.keys())}")
            else:
                print("❌ 提取失败: 无结果")
                
        except Exception as e:
            print(f"❌ 提取失败: {e}")
        
        print()

def show_template_content():
    """显示模板内容"""
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    railway_template = templates_dir / 'china_railway_ticket.yml'
    
    if railway_template.exists():
        print("🔍 铁路电子客票模板内容:")
        print("=" * 60)
        with open(railway_template, 'r', encoding='utf-8') as f:
            content = f.read()
            print(content)
        print()

def main():
    show_template_content()
    test_railway_template()

if __name__ == "__main__":
    main()