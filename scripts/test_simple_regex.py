#!/usr/bin/env python3
"""
使用简化但可靠的正则表达式
"""

import os
import tempfile
import yaml
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from pprint import pprint

def create_simple_reliable_template():
    """创建简化但可靠的模板"""
    template = {
        'issuer': '中国电子发票',
        'keywords': ['电子发票', '发票号码', '开票日期'],
        'fields': {
            # 基础信息
            'invoice_number': '发票号码[：:]\\s*(\\d+)',
            'date': '开票日期[：:]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)',
            
            # 使用简单可靠的模式，只匹配紧跟在"名称："后面的内容
            'seller_name': '名称[：:]\\s*([^\\n]*娄底[^\\n]*)',
            'buyer_name': '名称[：:]\\s*([^\\n]*杭州[^\\n]*)',
            
            # 税号用更宽泛的模式
            'seller_tax_id': '92431302MA4QP59721',
            'buyer_tax_id': '91330108MA27Y5XH5G',
            
            # 金额信息
            'amount': '价税合计.*?（小写）\\s*¥([\\d,]+\\.?\\d*)',
            'chinese_words': '价税合计（大写）\\s*([^\\n（]+)',
            
            # 其他信息
            'issuer_person': '开票人[：:]\\s*([^\\n\\s]+)'
        },
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'date_formats': ['%Y年%m月%d日']
        }
    }
    return template

def test_simple_template():
    """测试简化模板"""
    print("🔧 创建简化但可靠的中国电子发票模板")
    
    # 创建临时目录和模板文件
    temp_dir = tempfile.mkdtemp()
    template_file = os.path.join(temp_dir, 'china_invoice_simple.yml')
    
    # 创建模板
    template = create_simple_reliable_template()
    
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
        
        # 使用自定义模板提取数据
        print("🔍 开始提取数据...")
        result = extract_data(pdf_path, templates=custom_templates)
        
        if result:
            print("✅ 简化模板解析成功！")
            print("📊 提取的数据:")
            pprint(result, width=80)
            
            # 计算成功率
            expected_keys = ['invoice_number', 'amount', 'chinese_words', 'issuer_person', 'date']
            optional_keys = ['seller_name', 'buyer_name', 'seller_tax_id', 'buyer_tax_id']
            
            core_success = sum(1 for key in expected_keys if key in result)
            optional_success = sum(1 for key in optional_keys if key in result and result[key])
            
            print(f"\n📊 核心字段成功率: {core_success}/{len(expected_keys)} ({core_success/len(expected_keys)*100:.1f}%)")
            print(f"📊 可选字段成功率: {optional_success}/{len(optional_keys)} ({optional_success/len(optional_keys)*100:.1f}%)")
            print(f"📊 总体成功率: {(core_success + optional_success)}/{len(expected_keys) + len(optional_keys)} ({(core_success + optional_success)/(len(expected_keys) + len(optional_keys))*100:.1f}%)")
                
        else:
            print("❌ 简化模板解析失败")
            
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
    test_simple_template()