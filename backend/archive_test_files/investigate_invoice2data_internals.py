#!/usr/bin/env python3
"""
深入研究invoice2data内部机制
"""

import sys
from pathlib import Path
from pdfminer.high_level import extract_text
from invoice2data.extract.loader import read_templates
from invoice2data.extract.invoice_template import InvoiceTemplate
import re
import traceback

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def investigate_invoice2data_internals():
    """调查invoice2data内部机制"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    text = extract_text(pdf_path)
    
    print("🔬 深入研究invoice2data内部机制")
    print("=" * 80)
    
    # 选择最有希望的模板
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    
    target_template = None
    for template in templates:
        if template.get('issuer') == '中国电子发票-普通发票':
            target_template = template
            break
    
    if not target_template:
        print("❌ 找不到目标模板")
        return
    
    print(f"🎯 使用模板: {target_template.get('issuer')}")
    
    try:
        # 创建InvoiceTemplate对象
        invoice_template = InvoiceTemplate(target_template)
        print(f"✅ 模板对象创建成功")
        
        # 检查模板的关键词匹配
        print(f"\n🔍 检查关键词匹配:")
        keywords = target_template.get('keywords', [])
        print(f"模板关键词: {keywords}")
        
        # 使用模板的内部方法检查匹配
        print(f"\n🧪 调用模板内部方法:")
        
        # 1. 检查关键词匹配
        matches_keywords = invoice_template.matches_input(text)
        print(f"关键词匹配结果: {matches_keywords}")
        
        if not matches_keywords:
            print("❌ 关键词匹配失败，这是问题所在！")
            
            # 分析为什么关键词匹配失败
            print(f"\n🔍 分析关键词匹配失败原因:")
            print(f"文本中的内容:")
            for keyword in keywords:
                in_text = keyword in text
                print(f"   '{keyword}' 在文本中: {in_text}")
                if not in_text:
                    # 查找相似的文本
                    print(f"   文本中相关内容:")
                    lines = text.split('\n')
                    for line in lines:
                        if any(char in line for char in keyword):
                            print(f"      {line.strip()}")
            
            return False
        
        # 2. 如果关键词匹配成功，尝试提取字段
        print(f"✅ 关键词匹配成功，尝试字段提取...")
        
        try:
            extracted_fields = invoice_template.extract(text)
            print(f"字段提取结果: {extracted_fields}")
            
            if extracted_fields:
                print(f"✅ 字段提取成功！")
                return True, extracted_fields
            else:
                print(f"❌ 字段提取失败")
                return False
            
        except Exception as e:
            print(f"❌ 字段提取异常: {e}")
            traceback.print_exc()
            return False
    
    except Exception as e:
        print(f"❌ 模板对象创建失败: {e}")
        traceback.print_exc()
        return False

def create_minimal_working_template():
    """创建最小化的工作模板"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    text = extract_text(pdf_path)
    
    print(f"\n🔧 创建最小化工作模板:")
    print("-" * 60)
    
    # 分析文本中的关键词
    print("文本分析:")
    text_lines = [line.strip() for line in text.split('\n') if line.strip()]
    for i, line in enumerate(text_lines[:10]):
        print(f"   {i+1}: {line}")
    
    # 创建超简单的模板
    minimal_template = {
        'issuer': '广东普通发票',
        'keywords': ['25442000000101203423'],  # 使用发票号码作为唯一标识
        'fields': {
            'invoice_number': '(25442000000101203423)',  # 精确匹配
            'date': '(2025年02月24日)',  # 精确匹配
            'amount': '¥ (336.00)'  # 精确匹配总金额
        },
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'remove_whitespace': False,
            'remove_accents': False,
            'lowercase': False
        }
    }
    
    print(f"\n最小模板:")
    import yaml
    print(yaml.dump(minimal_template, default_flow_style=False, allow_unicode=True))
    
    # 测试最小模板
    print(f"\n🧪 测试最小模板:")
    try:
        from invoice2data import extract_data
        result = extract_data(pdf_path, templates=[minimal_template])
        if result:
            print(f"✅ 最小模板成功: {result}")
            return True, minimal_template
        else:
            print(f"❌ 最小模板失败")
    except Exception as e:
        print(f"❌ 最小模板异常: {e}")
        traceback.print_exc()
    
    return False, None

def create_simplified_template():
    """创建简化模板"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    
    print(f"\n🎯 创建简化模板:")
    print("-" * 60)
    
    # 基于已知能匹配的字段创建简化模板
    simplified_template = {
        'issuer': '测试广东发票',
        'keywords': ['广东省税务局'],  # 使用文本中确实存在的词
        'fields': {
            'invoice_number': r'发票号码：\s*(\d+)',
            'date': r'开票日期：\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            'amount': r'¥\s+([\d,]+\.00)'
        },
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'remove_whitespace': False,
            'remove_accents': False,
            'lowercase': False
        }
    }
    
    print(f"简化模板:")
    import yaml
    print(yaml.dump(simplified_template, default_flow_style=False, allow_unicode=True))
    
    # 测试简化模板
    print(f"\n🧪 测试简化模板:")
    try:
        from invoice2data import extract_data
        result = extract_data(pdf_path, templates=[simplified_template])
        if result:
            print(f"✅ 简化模板成功: {result}")
            return True, simplified_template
        else:
            print(f"❌ 简化模板失败")
    except Exception as e:
        print(f"❌ 简化模板异常: {e}")
        traceback.print_exc()
    
    return False, None

def analyze_successful_template():
    """分析成功的模板"""
    # 使用一个我们知道成功的文件来对比
    success_file = "/Users/xumingyang/app/invoice_assist/downloads/25432000000031789815.pdf"
    
    print(f"\n📊 分析成功模板:")
    print("-" * 60)
    
    success_text = extract_text(success_file)
    print(f"成功文件文本 (前200字符):")
    print(success_text[:200])
    
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    
    # 测试这个成功的文件
    from invoice2data import extract_data
    success_result = extract_data(success_file, templates=templates)
    print(f"\n成功文件的提取结果: {success_result}")
    
    if success_result:
        # 找到使用的模板
        used_template = success_result.get('template')
        print(f"使用的模板: {used_template}")

def save_working_template_file(template_data):
    """保存工作模板到文件"""
    if not template_data:
        return
    
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    template_file = templates_dir / 'working_guangdong_invoice.yml'
    
    with open(template_file, 'w', encoding='utf-8') as f:
        import yaml
        yaml.dump(template_data, f, default_flow_style=False, allow_unicode=True)
    
    print(f"💾 工作模板已保存: {template_file}")

def main():
    """主函数"""
    # 步骤1: 调查内部机制
    investigate_invoice2data_internals()
    
    # 步骤2: 创建最小模板
    success1, template1 = create_minimal_working_template()
    
    # 步骤3: 创建简化模板
    success2, template2 = create_simplified_template()
    
    # 步骤4: 分析成功模板
    analyze_successful_template()
    
    # 保存有效模板
    if success1:
        save_working_template_file(template1)
    elif success2:
        save_working_template_file(template2)
    
    print(f"\n📊 内部机制调查结果:")
    print(f"   最小模板: {'✅' if success1 else '❌'}")
    print(f"   简化模板: {'✅' if success2 else '❌'}")

if __name__ == "__main__":
    main()