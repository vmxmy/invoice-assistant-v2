#!/usr/bin/env python3
"""
测试优化后的普通发票模板
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

def test_optimized_template(pdf_path, templates_dir):
    """测试优化后的模板"""
    
    print(f"🔍 测试文件: {pdf_path.name}")
    print(f"=" * 60)
    
    # 加载所有模板
    custom_templates = read_templates(str(templates_dir))
    print(f"📋 加载了 {len(custom_templates)} 个模板")
    
    # 显示模板信息
    for template in custom_templates:
        issuer = template.get('issuer', 'Unknown')
        priority = template.get('priority', 50)
        print(f"   - {issuer} (优先级: {priority})")
    
    # 使用PyMuPDF提取
    try:
        from app.services.ocr import pymupdf_input
        result = extract_data(str(pdf_path), templates=custom_templates, input_module=pymupdf_input)
        
        if result:
            print(f"\n✅ 提取成功!")
            print(f"   使用模板: {result.get('template', 'Unknown')}")
            print(f"   关键字段:")
            
            key_fields = ['invoice_number', 'date', 'amount', 'buyer_name', 'seller_name']
            for field in key_fields:
                if field in result:
                    print(f"     {field}: {result[field]}")
            
            print(f"\n   所有字段:")
            for key, value in result.items():
                if key not in ['template']:
                    print(f"     {key}: {value}")
                    
            return True
        else:
            print(f"❌ 提取失败 - 无匹配结果")
            return False
        
    except Exception as e:
        print(f"❌ 提取异常: {e}")
        return False

def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    templates_dir = Path(__file__).parent / "app/services/ocr/templates"
    
    # 测试普通发票文件
    test_files = [
        "25442000000101203423.pdf",  # Unicode问题文件 (现已修复)
        "25432000000031789815.pdf",  # 空格问题文件 (现已修复)
        "25359134169000052039.pdf"   # 火车票文件 (对比测试)
    ]
    
    print(f"🚀 优化模板测试")
    print(f"=" * 60)
    print(f"模板目录: {templates_dir}")
    
    success_count = 0
    total_count = 0
    
    for file_name in test_files:
        pdf_path = downloads_dir / file_name
        
        if not pdf_path.exists():
            print(f"⚠️ 跳过不存在的文件: {file_name}")
            continue
        
        total_count += 1
        print(f"\n" + "="*60)
        
        if test_optimized_template(pdf_path, templates_dir):
            success_count += 1
    
    print(f"\n" + "="*60)
    print(f"🎉 测试完成!")
    print(f"成功率: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")
    
    if success_count > 1:  # 原来只有1个成功
        print(f"🎯 改善效果: 从33.3%提升到{success_count/total_count*100:.1f}%")

if __name__ == "__main__":
    main()