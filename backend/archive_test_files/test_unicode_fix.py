#!/usr/bin/env python3
"""
测试Unicode字符修复
"""

import sys
from pathlib import Path
from pdfminer.high_level import extract_text
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

def test_unicode_fix():
    """测试Unicode字符修复"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    
    print("🔧 测试Unicode字符修复")
    print("=" * 60)
    
    # 分析文本中的Unicode字符
    text = extract_text(pdf_path)
    print("文本中的关键部分:")
    lines = text.split('\n')
    for line in lines[:10]:
        if '电' in line or '发票' in line:
            print(f"   '{line.strip()}'")
            # 显示每个字符的Unicode码点
            for char in line.strip():
                print(f"      '{char}' = U+{ord(char):04X}")
    
    # 加载模板
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    
    print(f"\n📋 加载了 {len(templates)} 个模板")
    
    # 找到我们的Unicode变体模板
    unicode_template = None
    for template in templates:
        if template.get('issuer') == '中国电子发票-Unicode变体':
            unicode_template = template
            break
    
    if unicode_template:
        print(f"✅ 找到Unicode变体模板")
        
        # 测试单个模板
        print(f"\n🧪 测试Unicode变体模板:")
        try:
            result = extract_data(pdf_path, templates=[unicode_template])
            if result:
                print(f"✅ Unicode模板成功: {result}")
                return True
            else:
                print(f"❌ Unicode模板失败")
        except Exception as e:
            print(f"❌ Unicode模板异常: {e}")
    
    # 测试所有模板
    print(f"\n🧪 测试所有模板:")
    try:
        result = extract_data(pdf_path, templates=templates)
        if result:
            print(f"✅ 全模板测试成功: {result}")
            return True
        else:
            print(f"❌ 全模板测试失败")
    except Exception as e:
        print(f"❌ 全模板测试异常: {e}")
    
    return False

def create_comprehensive_template():
    """创建综合模板，处理各种Unicode变体"""
    
    comprehensive_template = {
        'issuer': 'AAA_万能发票模板',  # 使用AAA前缀确保优先级
        'keywords': [
            '发票号码',  # 最可靠的关键词
            '开票日期'
        ],
        'fields': {
            'invoice_number': r'发票号码[：:]\s*(\d+)',
            'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            'amount': r'[¥￥]\s*([\d,]+\.\d{2})',
            'buyer_name': r'购\s*买\s*方[\s\S]*?名称[：:]\s*([^\n]+?)(?=\s*统一社会信用代码|$)',
            'seller_name': r'销\s*售\s*方[\s\S]*?名称[：:]\s*([^\n]+?)(?=\s*统一社会信用代码|$)',
            'buyer_tax_id': r'购\s*买\s*方[\s\S]*?统一社会信用代码.*?[：:]\s*([A-Z0-9]{18})',
            'seller_tax_id': r'销\s*售\s*方[\s\S]*?统一社会信用代码.*?[：:]\s*([A-Z0-9]{18})',
            'issuer_person': r'开票人[：:]\s*([^\n\s]+)',
        },
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'date_formats': ['%Y年%m月%d日'],
            'remove_whitespace': False,
            'remove_accents': False,
            'lowercase': False
        }
    }
    
    # 保存模板
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    template_file = templates_dir / 'aaa_universal_invoice.yml'
    
    with open(template_file, 'w', encoding='utf-8') as f:
        import yaml
        yaml.dump(comprehensive_template, f, default_flow_style=False, allow_unicode=True)
    
    print(f"💾 万能模板已保存: {template_file.name}")
    
    # 测试万能模板
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    
    print(f"\n🧪 测试万能模板:")
    templates = read_templates(str(templates_dir))
    
    try:
        result = extract_data(pdf_path, templates=templates)
        if result:
            print(f"✅ 万能模板成功: {result}")
            return True
        else:
            print(f"❌ 万能模板失败")
    except Exception as e:
        print(f"❌ 万能模板异常: {e}")
    
    return False

def main():
    """主函数"""
    print("🚀 Unicode字符修复测试")
    
    # 测试Unicode修复
    success1 = test_unicode_fix()
    
    # 创建万能模板
    success2 = create_comprehensive_template()
    
    print(f"\n📊 修复结果:")
    print(f"   Unicode修复: {'✅' if success1 else '❌'}")
    print(f"   万能模板: {'✅' if success2 else '❌'}")
    
    if success1 or success2:
        print(f"\n🎉 问题已解决！")
    else:
        print(f"\n😔 仍需进一步分析...")

if __name__ == "__main__":
    main()