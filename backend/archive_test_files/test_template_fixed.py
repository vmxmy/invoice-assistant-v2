#!/usr/bin/env python3
"""
修正后的invoice2data自定义模板测试
"""

import os
import tempfile
import yaml
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from pdfminer.high_level import extract_text
from pprint import pprint

def create_chinese_invoice_template():
    """创建中国电子发票模板"""
    template = {
        'issuer': '中国电子发票',
        'keywords': ['电子发票', '发票号码', '开票日期'],
        'exclude_keywords': [],
        'fields': {
            'invoice_number': r'发票号码[：:]\s*(\d+)',
            'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            'seller_name': r'销\s*售\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
            'seller_tax_id': r'销\s*售\s*方.*?统一社会信用代码/纳税人识别号[：:]\s*(\w+)',
            'buyer_name': r'购\s*买\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
            'buyer_tax_id': r'购\s*买\s*方.*?统一社会信用代码/纳税人识别号[：:]\s*(\w+)',
            'amount': r'合\s*计\s*¥([\d,]+\.?\d*)',
            'total_amount': r'价税合计.*?（小写）\s*¥([\d,]+\.?\d*)',
            'amount_in_words': r'价税合计（大写）\s*([^\n（]+)',
            'issuer_person': r'开票人[：:]\s*([^\n\s]+)'
        },
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'remove_whitespace': True,
            'date_formats': ['%Y年%m月%d日']
        }
    }
    return template

def test_with_custom_template():
    """使用自定义模板测试"""
    print("🔧 创建中国电子发票自定义模板")
    
    # 创建临时目录和模板文件
    temp_dir = tempfile.mkdtemp()
    template_file = os.path.join(temp_dir, 'china_invoice.yml')
    
    # 创建模板
    template = create_chinese_invoice_template()
    
    # 保存模板到文件
    with open(template_file, 'w', encoding='utf-8') as f:
        yaml.dump(template, f, default_flow_style=False, allow_unicode=True)
    
    print(f"📄 模板已保存到: {template_file}")
    
    # 测试文件
    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    
    if not os.path.exists(pdf_path):
        print(f"❌ 测试文件不存在: {pdf_path}")
        return
    
    print(f"📄 测试文件: {os.path.basename(pdf_path)}")
    
    try:
        # 加载自定义模板
        print("📋 加载自定义模板...")
        custom_templates = read_templates(temp_dir)
        print(f"   加载了 {len(custom_templates)} 个自定义模板")
        
        if custom_templates:
            print(f"   模板issuer: {custom_templates[0]['issuer']}")
            print(f"   模板keywords: {custom_templates[0]['keywords']}")
        
        # 使用自定义模板提取数据
        print("🔍 开始提取数据...")
        result = extract_data(pdf_path, templates=custom_templates)
        
        if result:
            print("✅ 自定义模板解析成功！")
            print("📊 提取的数据:")
            pprint(result, width=80)
            
            # 验证关键字段
            key_checks = {
                'invoice_number': '25432000000022020617',
                'seller_name': '娄底市娄星区萝卜餐饮店',
                'total_amount': '240.00',
                'buyer_name': '杭州趣链科技有限公司'
            }
            
            print("\\n🔍 关键字段验证:")
            for field, expected in key_checks.items():
                if field in result:
                    actual = str(result[field]).strip()
                    expected = str(expected).strip()
                    status = "✅" if actual == expected else "❌"
                    print(f"   {status} {field}: {actual} (期望: {expected})")
                else:
                    print(f"   ❌ {field}: 未提取到 (期望: {expected})")
        else:
            print("❌ 自定义模板解析失败")
            
            # 调试：检查模板匹配
            print("\\n🔍 调试信息:")
            text = extract_text(pdf_path)
            
            # 检查keywords匹配
            for keyword in template['keywords']:
                if keyword in text:
                    print(f"   ✅ 关键词匹配: {keyword}")
                else:
                    print(f"   ❌ 关键词不匹配: {keyword}")
            
            # 显示文本片段
            print("\\n📄 原始文本前500字符:")
            print(text[:500])
            
    except Exception as e:
        print(f"❌ 解析出错: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 清理临时文件
        try:
            os.unlink(template_file)
            os.rmdir(temp_dir)
        except:
            pass

def test_template_matching():
    """测试模板匹配逻辑"""
    print("\\n🧪 测试模板匹配逻辑")
    
    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    text = extract_text(pdf_path)
    
    # 测试关键词
    keywords = ['电子发票', '发票号码', '开票日期', '价税合计']
    print("🔍 关键词匹配测试:")
    for keyword in keywords:
        if keyword in text:
            print(f"   ✅ {keyword}")
        else:
            print(f"   ❌ {keyword}")
    
    # 测试字段提取
    import re
    fields = {
        'invoice_number': r'发票号码[：:]\s*(\d+)',
        'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
        'seller_name': r'销\s*售\s*方\s*信\s*息\s*名称[：:]\s*([^\\n]+)',
        'total_amount': r'价税合计.*?（小写）\s*¥([\d,]+\.?\d*)'
    }
    
    print("\\n🔍 字段提取测试:")
    for field_name, pattern in fields.items():
        match = re.search(pattern, text, re.DOTALL)
        if match:
            print(f"   ✅ {field_name}: {match.group(1)}")
        else:
            print(f"   ❌ {field_name}: 无匹配")

if __name__ == "__main__":
    test_with_custom_template()
    test_template_matching()