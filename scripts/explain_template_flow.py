#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
详细演示OCR流程中的模板调用机制
"""

import sys
import os
import json
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def explain_template_system():
    """详细解释模板调用系统"""
    print("🔧 OCR模板调用机制详解")
    print("=" * 80)
    
    # 1. 模板系统概述
    print("\n📋 1. 模板系统概述")
    print("-" * 40)
    print("""
OCR模块使用Invoice2Data库的模板引擎，通过YAML配置文件定义发票字段的提取规则。
模板系统提供了灵活、可配置的文本解析能力，支持多种发票格式。

核心组件：
- 模板加载器 (Template Loader)
- 正则解析器 (Regex Parser) 
- 字段映射器 (Field Mapper)
- 优先级排序 (Priority Sorting)
    """)
    
    # 2. 模板目录结构
    print("\n📁 2. 模板目录结构")
    print("-" * 40)
    
    templates_dir = Path("app/services/ocr/templates")
    if templates_dir.exists():
        print(f"模板目录: {templates_dir}")
        for template_file in templates_dir.glob("*.yml"):
            print(f"  - {template_file.name}")
    else:
        print("⚠️ 模板目录不存在")
    
    # 3. 模板加载流程
    print("\n🔄 3. 模板加载流程")
    print("-" * 40)
    
    try:
        from app.services.ocr.invoice2data_client import Invoice2DataClient
        from app.services.ocr.config import OCRConfig
        
        print("步骤1: 初始化客户端")
        config = OCRConfig()
        client = Invoice2DataClient(config)
        
        print("步骤2: 设置模板目录")
        print(f"  模板目录: {client.templates_dir}")
        
        print("步骤3: 加载模板文件")
        if client.custom_templates:
            print(f"  已加载 {len(client.custom_templates)} 个模板")
            for i, template in enumerate(client.custom_templates):
                issuer = template.get('issuer', 'Unknown')
                priority = template.get('priority', 0)
                print(f"    [{i+1}] {issuer} (优先级: {priority})")
        
    except Exception as e:
        print(f"⚠️ 模板加载演示失败: {e}")
    
    # 4. 模板结构解析
    print("\n📄 4. 模板结构解析")
    print("-" * 40)
    
    sample_template = {
        'issuer': '中国标准电子发票项目修正版',
        'priority': 120,
        'keywords': ['电子', '普通发票'],
        'fields': {
            'invoice_number': {
                'parser': 'regex',
                'regex': '发票号码[：:]\\s*(\\d+)'
            },
            'amount': {
                'parser': 'regex', 
                'regex': '(?:价税合计.*?[（(]\\s*小写\\s*[）)]\\s*[¥￥]\\s*)([0-9,]+\\.?\\d*)',
                'type': 'float'
            }
        },
        'options': {
            'currency': 'CNY',
            'date_formats': ['%Y年%m月%d日']
        }
    }
    
    print("模板结构说明:")
    print(f"  issuer: 发票发行方标识")
    print(f"  priority: 模板优先级 (数值越大优先级越高)")
    print(f"  keywords: 关键词匹配列表")
    print(f"  fields: 字段提取规则")
    print(f"  options: 解析选项配置")
    
    # 5. 字段提取规则
    print("\n🎯 5. 字段提取规则详解")
    print("-" * 40)
    
    field_examples = {
        '发票号码': {
            'regex': '发票号码[：:]\\s*(\\d+)',
            '说明': '匹配"发票号码："后的数字序列',
            '示例': '发票号码：25432000000031789815 → 25432000000031789815'
        },
        '开票日期': {
            'regex': '开票日期[：:]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)',
            '说明': '匹配中文日期格式',
            '示例': '开票日期：2025年03月12日 → 2025年03月12日'
        },
        '金额': {
            'regex': '(?:价税合计.*?[（(]\\s*小写\\s*[）)]\\s*[¥￥]\\s*)([0-9,]+\\.?\\d*)',
            '说明': '匹配价税合计小写金额',
            '示例': '价税合计（小写）¥80.00 → 80.00'
        },
        '购买方': {
            'regex': '购.*?名\\s*称[：:]\\s*([^\\n\\s]+(?:\\s+[^\\n\\s]+)*?)(?=\\s+销|$)',
            '说明': '匹配购买方名称，处理空格分隔',
            '示例': '购 名称： 杭州趣链科技有限公司 → 杭州趣链科技有限公司'
        }
    }
    
    for field_name, info in field_examples.items():
        print(f"\n  {field_name}:")
        print(f"    正则表达式: {info['regex']}")
        print(f"    说明: {info['说明']}")
        print(f"    示例: {info['示例']}")

def demonstrate_template_matching():
    """演示模板匹配过程"""
    print("\n🔍 6. 模板匹配过程演示")
    print("-" * 40)
    
    # 模拟PDF文本
    sample_text = """
    电子发票 ( 普通发票)
    发 票 号 码 : 25432000000031789815
    开 票 日 期 : 2025年03月12日
    
    购 名称: 杭州趣链科技有限公司
    销 名称:湖南曾小厨餐饮管理有限公司贤童店
    
    *餐饮服务*餐饮费  79.21  1%  0.79
    
    价税合计( 小写) ¥80.00
    开 票 人: 彭丽芳
    """
    
    print("📝 输入文本:")
    print(sample_text)
    
    print("\n🎯 模板匹配过程:")
    
    # 步骤1: 关键词匹配
    print("步骤1: 关键词匹配")
    keywords = ['电子', '普通发票']
    matched_keywords = []
    for keyword in keywords:
        if keyword in sample_text:
            matched_keywords.append(keyword)
    print(f"  匹配的关键词: {matched_keywords}")
    print(f"  匹配成功: {'是' if matched_keywords else '否'}")
    
    # 步骤2: 字段提取
    print("\n步骤2: 字段提取")
    import re
    
    extraction_rules = {
        'invoice_number': r'发票号码[：:]\s*(\d+)',
        'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)', 
        'buyer_name': r'购.*?名\s*称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销|$)',
        'seller_name': r'销.*?名\s*称[：:]\s*([^\n]+?)(?=\n|$)',
        'amount': r'价税合计.*?小写.*?¥\s*([0-9,]+\.?\d*)',
        'issuer_person': r'开\s*票\s*人[：:]\s*([^\s\n]+)'
    }
    
    extracted_data = {}
    for field_name, pattern in extraction_rules.items():
        match = re.search(pattern, sample_text, re.DOTALL)
        if match:
            extracted_data[field_name] = match.group(1).strip()
            print(f"  ✅ {field_name}: {extracted_data[field_name]}")
        else:
            print(f"  ❌ {field_name}: 未匹配")
    
    print(f"\n📊 提取结果: {len(extracted_data)}/6 个字段成功提取")
    
    return extracted_data

def show_template_priority():
    """展示模板优先级机制"""
    print("\n📈 7. 模板优先级机制")
    print("-" * 40)
    
    templates = [
        {'issuer': '中国标准电子发票项目修正版', 'priority': 120, 'keywords': ['电子', '普通发票']},
        {'issuer': '中国铁路电子客票', 'priority': 200, 'keywords': ['电子客票', '12306']},
        {'issuer': '中国增值税专用发票', 'priority': 100, 'keywords': ['增值税', '专用发票']},
        {'issuer': '飞猪航空发票', 'priority': 150, 'keywords': ['航空', '机票']}
    ]
    
    print("模板优先级排序 (数值越大优先级越高):")
    sorted_templates = sorted(templates, key=lambda x: x['priority'], reverse=True)
    
    for i, template in enumerate(sorted_templates):
        print(f"  {i+1}. {template['issuer']} (优先级: {template['priority']})")
        print(f"     关键词: {template['keywords']}")
    
    print("\n🔄 匹配流程:")
    print("1. 按优先级从高到低遍历模板")
    print("2. 检查关键词是否在文本中存在")
    print("3. 如果关键词匹配，尝试字段提取")
    print("4. 提取成功则使用该模板，否则尝试下一个")
    print("5. 如果所有模板都失败，使用默认模板")

def explain_invoice2data_integration():
    """解释Invoice2Data集成机制"""
    print("\n🔗 8. Invoice2Data集成机制")
    print("-" * 40)
    
    print("""
Invoice2Data库的核心调用流程：

1. 模板加载 (Template Loading)
   - read_templates() 读取YAML模板文件
   - 解析模板结构和字段规则
   - 按优先级排序模板列表

2. 文本输入 (Text Input)
   - 使用自定义输入模块 (PyMuPDF)
   - 替代默认的pdftotext
   - 解决Unicode和空格问题

3. 模板匹配 (Template Matching)
   - 遍历模板按优先级
   - 检查关键词匹配
   - 执行字段提取规则

4. 数据提取 (Data Extraction)
   - 应用正则表达式规则
   - 类型转换 (日期、金额等)
   - 构建提取结果字典

5. 后处理 (Post Processing)
   - 数据验证和清理
   - 转换为标准格式
   - 计算置信度分数
    """)
    
    print("\n核心API调用:")
    print("```python")
    print("from invoice2data import extract_data")
    print("from invoice2data.extract.loader import read_templates")
    print("")
    print("# 加载模板")
    print("templates = read_templates('/path/to/templates')")
    print("")
    print("# 提取数据")
    print("result = extract_data(")
    print("    file_path, ")
    print("    templates=templates,")
    print("    input_module=pymupdf_input")
    print(")")
    print("```")

def show_practical_example():
    """展示实际例子"""
    print("\n💡 9. 实际调用示例")
    print("-" * 40)
    
    try:
        # 检查是否有PDF文件可以演示
        downloads_dir = Path("downloads")
        if downloads_dir.exists():
            pdf_files = list(downloads_dir.glob("*.pdf"))
            if pdf_files:
                pdf_file = pdf_files[0]
                print(f"📄 使用文件: {pdf_file.name}")
                
                # 模拟模板调用过程
                print("\n🔄 模板调用过程:")
                print("1. 初始化Invoice2DataClient")
                print("2. 加载模板目录中的所有YAML文件")
                print("3. 按优先级排序模板")
                print("4. 调用extract_data()函数")
                print("5. 遍历模板进行匹配")
                print("6. 返回最佳匹配结果")
                
                # 实际调用 (简化版)
                try:
                    from app.services.ocr.invoice2data_client import Invoice2DataClient
                    from app.services.ocr.config import OCRConfig
                    import asyncio
                    
                    config = OCRConfig()
                    client = Invoice2DataClient(config)
                    
                    print(f"\n✅ 成功加载 {len(client.custom_templates)} 个模板")
                    
                    # 显示将要使用的模板
                    print("\n📋 可用模板:")
                    for template in client.custom_templates:
                        issuer = template.get('issuer', 'Unknown')
                        priority = template.get('priority', 0)
                        keywords = template.get('keywords', [])
                        print(f"  - {issuer} (优先级: {priority}, 关键词: {keywords})")
                    
                except Exception as e:
                    print(f"⚠️ 演示失败: {e}")
            else:
                print("⚠️ 没有找到PDF文件进行演示")
        else:
            print("⚠️ downloads目录不存在")
            
    except Exception as e:
        print(f"❌ 示例演示失败: {e}")

def main():
    """主函数"""
    explain_template_system()
    extracted_data = demonstrate_template_matching()
    show_template_priority()
    explain_invoice2data_integration()
    show_practical_example()
    
    print("\n" + "=" * 80)
    print("📝 总结")
    print("=" * 80)
    print("""
OCR模板调用机制的核心特点:

1. 🎯 基于优先级的模板匹配系统
2. 📝 YAML配置驱动的字段提取规则  
3. 🔄 灵活的正则表达式解析器
4. 🚀 异步处理和并发支持
5. 🛡️ 完善的错误处理和降级策略

模板系统使OCR服务具备了:
- 高度可配置性 (支持新发票格式)
- 强大的扩展性 (添加新模板无需修改代码)
- 优秀的准确性 (针对性的提取规则)
- 良好的维护性 (规则与代码分离)
    """)

if __name__ == "__main__":
    main()