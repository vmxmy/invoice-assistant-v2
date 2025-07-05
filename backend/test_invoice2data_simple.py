#!/usr/bin/env python3
"""
简化的invoice2data中国发票模板测试
"""

import os
import tempfile
import yaml
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from pprint import pprint

def create_simple_chinese_template():
    """创建简化的中国发票模板"""
    template = {
        'issuer': '中国电子发票',
        'keywords': ['电子发票', '发票号码', '开票日期'],
        'fields': {
            'invoice_number': r'发票号码[：:]\s*(\d+)',
            'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            'seller_name': r'销\s*售\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)', 
            'buyer_name': r'购\s*买\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)',
            'seller_tax_id': r'销\s*售\s*方.*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]+)',
            'buyer_tax_id': r'购\s*买\s*方.*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]+)',
            'amount': r'价税合计.*?（小写）\s*¥([\d,]+\.?\d*)',
            'total_amount': r'价税合计.*?（小写）\s*¥([\d,]+\.?\d*)',
            'chinese_words': r'价税合计（大写）\s*([^\n（]+)',
            'issuer_person': r'开票人[：:]\s*([^\n\s]+)'
        },
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'date_formats': ['%Y年%m月%d日']
        }
    }
    return template

def test_invoice2data_simple():
    """简化测试"""
    print("🔧 创建中国电子发票自定义模板")
    
    # 创建临时目录和模板文件
    temp_dir = tempfile.mkdtemp()
    template_file = os.path.join(temp_dir, 'china_invoice.yml')
    
    # 创建模板
    template = create_simple_chinese_template()
    
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
                'buyer_name': '杭州趣链科技有限公司',
                'seller_tax_id': '92431302MA4QP59721',
                'buyer_tax_id': '91330108MA27Y5XH5G',
                'amount': 240.0,
                'chinese_words': '贰佰肆拾圆整',
                'issuer_person': '胡起贵'
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

if __name__ == "__main__":
    test_invoice2data_simple()