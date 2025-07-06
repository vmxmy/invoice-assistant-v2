#!/usr/bin/env python3
"""
深度调试最后一个失败的文件
"""

import sys
from pathlib import Path
from pdfminer.high_level import extract_text
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from invoice2data.extract.invoice_template import InvoiceTemplate
import re
import yaml

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def deep_debug_file():
    """深度调试最后失败的文件"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    
    print("🔍 深度调试最后失败的文件")
    print("=" * 80)
    print(f"文件: {Path(pdf_path).name}")
    
    # 1. 提取并分析文本
    text = extract_text(pdf_path)
    print(f"\n📝 PDF文本 (长度: {len(text)} 字符):")
    print("-" * 60)
    print(text)
    print("-" * 60)
    
    # 2. 加载所有模板
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    print(f"\n📋 加载了 {len(templates)} 个模板:")
    for i, template in enumerate(templates, 1):
        print(f"   {i}. {template.get('issuer', 'Unknown')}")
    
    # 3. 测试每个模板的详细匹配过程
    print(f"\n🧪 详细模板匹配测试:")
    for i, template_data in enumerate(templates, 1):
        issuer = template_data.get('issuer', f'Template_{i}')
        print(f"\n--- 模板 {i}: {issuer} ---")
        
        try:
            # 检查关键词匹配
            keywords = template_data.get('keywords', [])
            print(f"关键词: {keywords}")
            
            matched_keywords = []
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
            
            print(f"匹配的关键词: {matched_keywords}")
            
            if not matched_keywords and keywords:
                print("❌ 关键词不匹配，跳过此模板")
                continue
            
            if not keywords:
                print("⚠️ 模板无关键词，将尝试字段匹配")
            
            # 检查字段匹配
            fields = template_data.get('fields', {})
            required_fields = ['invoice_number', 'date', 'amount']  # invoice2data默认必需字段
            field_results = {}
            
            print("字段匹配测试:")
            for field_name, pattern in fields.items():
                try:
                    matches = re.findall(pattern, text, re.DOTALL)
                    field_results[field_name] = matches
                    
                    if matches:
                        print(f"   ✅ {field_name}: {matches}")
                    else:
                        print(f"   ❌ {field_name}: 无匹配")
                        if field_name in required_fields:
                            print(f"      ⚠️ 这是必需字段！")
                            
                except Exception as e:
                    print(f"   ❌ {field_name}: 正则错误 - {e}")
                    field_results[field_name] = []
            
            # 检查是否满足必需字段
            missing_required = []
            for req_field in required_fields:
                if req_field not in field_results or not field_results[req_field]:
                    missing_required.append(req_field)
            
            if missing_required:
                print(f"❌ 缺少必需字段: {missing_required}")
            else:
                print(f"✅ 所有必需字段都匹配！")
                
                # 如果字段都匹配，尝试用invoice2data提取
                print("🔧 尝试使用单个模板提取...")
                try:
                    result = extract_data(pdf_path, templates=[template_data])
                    if result:
                        print(f"✅ 单模板提取成功: {result}")
                        return True, template_data, result
                    else:
                        print("❌ 单模板提取失败")
                except Exception as e:
                    print(f"❌ 单模板提取异常: {e}")
        
        except Exception as e:
            print(f"❌ 模板测试异常: {e}")
    
    return False, None, None

def test_template_priority():
    """测试模板优先级问题"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    
    print(f"\n🔄 测试模板优先级问题:")
    print("-" * 60)
    
    # 找到能匹配的模板
    templates = read_templates(str(templates_dir))
    
    # 根据之前的分析，这些模板应该能匹配
    target_templates = [
        '中国电子发票-普通发票',
        '中国电子发票-多模式匹配',
        '中国电子发票'
    ]
    
    for target_name in target_templates:
        matching_templates = [t for t in templates if t.get('issuer') == target_name]
        
        if matching_templates:
            template = matching_templates[0]
            print(f"\n🧪 单独测试模板: {target_name}")
            
            try:
                result = extract_data(pdf_path, templates=[template])
                if result:
                    print(f"✅ 成功: {result}")
                    
                    # 尝试将此模板放在最前面
                    print(f"🔄 将模板放在最前面重新测试...")
                    priority_templates = [template] + [t for t in templates if t != template]
                    
                    result2 = extract_data(pdf_path, templates=priority_templates)
                    if result2:
                        print(f"✅ 优先级测试成功: {result2}")
                        return True, template, result2
                    else:
                        print(f"❌ 优先级测试失败")
                else:
                    print(f"❌ 失败: 无结果")
            except Exception as e:
                print(f"❌ 异常: {e}")
    
    return False, None, None

def create_optimized_template():
    """基于分析创建优化模板"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    text = extract_text(pdf_path)
    
    print(f"\n🔧 创建专门优化的模板:")
    print("-" * 60)
    
    # 基于文本分析创建最优模板
    optimized_template = {
        'issuer': '广东电子发票-餐饮服务',
        'keywords': ['发票号码', '开票日期'],  # 简化关键词
        'fields': {
            # 必需字段
            'invoice_number': '发票号码[：:]\s*(\d+)',
            'date': '开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            'amount': '[¥￥]([\\d,]+\\.\\d{2})',
            
            # 可选字段
            'buyer_name': '购\\s*买\\s*方.*?名称[：:]\\s*([^\\n]+?)(?=\\s*统一社会信用代码|$)',
            'seller_name': '销\\s*售\\s*方.*?名称[：:]\\s*([^\\n]+?)(?=\\s*统一社会信用代码|$)',
            'buyer_tax_id': '购\\s*买\\s*方[\\s\\S]*?统一社会信用代码.*?[：:]\\s*([A-Z0-9]{18})',
            'seller_tax_id': '销\\s*售\\s*方[\\s\\S]*?统一社会信用代码.*?[：:]\\s*([A-Z0-9]{18})',
            'issuer_person': '开票人[：:]\\s*([^\\n\\s]+)',
            'tax_amount': '税\\s*额\\s*([\\d,]+\\.\\d{2})',
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
    
    print("优化模板内容:")
    print(yaml.dump(optimized_template, default_flow_style=False, allow_unicode=True))
    
    # 测试优化模板
    print(f"\n🧪 测试优化模板:")
    try:
        result = extract_data(pdf_path, templates=[optimized_template])
        if result:
            print(f"✅ 优化模板成功: {result}")
            return True, optimized_template, result
        else:
            print(f"❌ 优化模板失败")
    except Exception as e:
        print(f"❌ 优化模板异常: {e}")
    
    return False, None, None

def save_working_template(template_data):
    """保存有效的模板"""
    if not template_data:
        return
    
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    template_file = templates_dir / 'china_guangdong_restaurant_invoice.yml'
    
    with open(template_file, 'w', encoding='utf-8') as f:
        yaml.dump(template_data, f, default_flow_style=False, allow_unicode=True)
    
    print(f"\n💾 有效模板已保存: {template_file.name}")

def final_comprehensive_test():
    """最终综合测试"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    
    print(f"\n🎯 最终综合测试:")
    print("-" * 60)
    
    # 重新加载所有模板（包括新创建的）
    templates = read_templates(str(templates_dir))
    print(f"当前共有 {len(templates)} 个模板")
    
    try:
        result = extract_data(pdf_path, templates=templates)
        if result:
            print(f"✅ 最终测试成功: {result}")
            return True
        else:
            print(f"❌ 最终测试失败")
            return False
    except Exception as e:
        print(f"❌ 最终测试异常: {e}")
        return False

def main():
    """主函数"""
    print("🚀 开始深度调试最后一个失败的PDF文件")
    
    # 步骤1: 深度调试
    success1, template1, result1 = deep_debug_file()
    
    # 步骤2: 测试模板优先级
    success2, template2, result2 = test_template_priority()
    
    # 步骤3: 创建优化模板
    success3, template3, result3 = create_optimized_template()
    
    # 步骤4: 保存有效模板
    if success3 and template3:
        save_working_template(template3)
    elif success2 and template2:
        # 如果优化模板不行，尝试调整现有模板的优先级
        template2['issuer'] = 'AAA_' + template2.get('issuer', 'Priority_Template')  # 添加前缀提高优先级
        save_working_template(template2)
    
    # 步骤5: 最终测试
    final_success = final_comprehensive_test()
    
    print(f"\n📊 调试结果总结:")
    print(f"   深度调试: {'✅' if success1 else '❌'}")
    print(f"   优先级测试: {'✅' if success2 else '❌'}")
    print(f"   优化模板: {'✅' if success3 else '❌'}")
    print(f"   最终测试: {'✅' if final_success else '❌'}")
    
    if final_success:
        print(f"\n🎉 恭喜！最后一个文件已成功解决！")
        print(f"   现在应该能达到 100% 成功率 (28/28)")
    else:
        print(f"\n😔 仍需进一步分析...")

if __name__ == "__main__":
    main()