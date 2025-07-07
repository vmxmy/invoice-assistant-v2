#!/usr/bin/env python3
"""
为中国电子发票创建自定义模板并测试
"""

import os
import tempfile
import yaml
from invoice2data import extract_data
from pdfminer.high_level import extract_text
from pprint import pprint

def create_chinese_invoice_template():
    """创建中国电子发票模板"""
    template = {
        'issuer': '中国电子发票',
        'keywords': ['电子发票', '发票号码', '开票日期', '价税合计'],
        'exclude_keywords': [],
        'fields': {
            'invoice_number': {
                'parser': 'regex',
                'regex': r'发票号码[：:]\s*(\d+)',
                'type': 'text'
            },
            'date': {
                'parser': 'regex', 
                'regex': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
                'type': 'date',
                'date_format': '%Y年%m月%d日'
            },
            'seller_name': {
                'parser': 'regex',
                'regex': r'销\s*售\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
                'type': 'text'
            },
            'seller_tax_id': {
                'parser': 'regex',
                'regex': r'销\s*售\s*方.*?统一社会信用代码/纳税人识别号[：:]\s*(\w+)',
                'type': 'text'
            },
            'buyer_name': {
                'parser': 'regex',
                'regex': r'购\s*买\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
                'type': 'text'  
            },
            'buyer_tax_id': {
                'parser': 'regex',
                'regex': r'购\s*买\s*方.*?统一社会信用代码/纳税人识别号[：:]\s*(\w+)',
                'type': 'text'
            },
            'amount': {
                'parser': 'regex',
                'regex': r'合\s*计\s*¥([\d,]+\.?\d*)',
                'type': 'float'
            },
            'total_amount': {
                'parser': 'regex', 
                'regex': r'价税合计.*?（小写）\s*¥([\d,]+\.?\d*)',
                'type': 'float'
            },
            'amount_in_words': {
                'parser': 'regex',
                'regex': r'价税合计（大写）\s*([^\n（]+)',
                'type': 'text'
            },
            'issuer_person': {
                'parser': 'regex',
                'regex': r'开票人[：:]\s*([^\n\s]+)',
                'type': 'text'
            }
        },
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'remove_whitespace': True,
            'remove_accents': False,
            'lowercase': False,
            'date_formats': ['%Y年%m月%d日', '%Y-%m-%d']
        }
    }
    return template

def test_with_custom_template():
    """使用自定义模板测试"""
    print("🔧 创建中国电子发票自定义模板")
    
    # 创建模板
    template = create_chinese_invoice_template()
    
    # 保存模板到临时文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False, encoding='utf-8') as f:
        yaml.dump(template, f, default_flow_style=False, allow_unicode=True)
        template_path = f.name
    
    print(f"📄 模板已保存到: {template_path}")
    
    # 测试文件
    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    
    if not os.path.exists(pdf_path):
        print(f"❌ 测试文件不存在: {pdf_path}")
        return
    
    print(f"📄 测试文件: {os.path.basename(pdf_path)}")
    
    try:
        # 使用自定义模板提取数据
        from invoice2data.extract.loader import read_templates
        templates = read_templates([template_path])
        result = extract_data(pdf_path, templates=templates)
        
        if result:
            print("✅ 自定义模板解析成功！")
            print("📊 提取的数据:")
            pprint(result, width=80)
            
            # 验证关键字段
            key_checks = {
                'invoice_number': '25432000000022020617',
                'seller_name': '娄底市娄星区萝卜餐饮店',
                'total_amount': 240.0,
                'buyer_name': '杭州趣链科技有限公司'
            }
            
            print("\n🔍 关键字段验证:")
            for field, expected in key_checks.items():
                if field in result:
                    actual = result[field]
                    status = "✅" if str(actual).strip() == str(expected).strip() else "❌"
                    print(f"   {status} {field}: {actual} (期望: {expected})")
                else:
                    print(f"   ❌ {field}: 未提取到 (期望: {expected})")
        else:
            print("❌ 自定义模板解析失败")
            
            # 显示原始文本用于调试
            print("\n📄 原始文本 (用于模板调试):")
            text = extract_text(pdf_path)
            print(text[:1000])
            
    except Exception as e:
        print(f"❌ 解析出错: {e}")
    
    finally:
        # 清理临时文件
        try:
            os.unlink(template_path)
        except:
            pass

def test_regex_patterns():
    """单独测试正则表达式模式"""
    print("\n🧪 测试正则表达式模式")
    
    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    text = extract_text(pdf_path)
    
    import re
    
    patterns = {
        '发票号码': r'发票号码[：:]\s*(\d+)',
        '开票日期': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
        '销售方名称': r'销\s*售\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
        '买方名称': r'购\s*买\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
        '价税合计': r'价税合计.*?（小写）\s*¥([\d,]+\.?\d*)',
        '开票人': r'开票人[：:]\s*([^\n\s]+)'
    }
    
    for name, pattern in patterns.items():
        match = re.search(pattern, text, re.DOTALL)
        if match:
            print(f"   ✅ {name}: {match.group(1)}")
        else:
            print(f"   ❌ {name}: 未匹配")

if __name__ == "__main__":
    test_with_custom_template()
    test_regex_patterns()