#!/usr/bin/env python3
"""
调试模板匹配问题
"""

import sys
from pathlib import Path
from pdfminer.high_level import extract_text
from invoice2data.extract.loader import read_templates
from invoice2data.extract.invoice_template import InvoiceTemplate
import re

def debug_template_matching(pdf_path: str):
    """调试模板匹配问题"""
    print(f"🔍 调试模板匹配: {Path(pdf_path).name}")
    print("=" * 60)
    
    # 提取文本
    text = extract_text(pdf_path)
    print(f"文本内容:\n{text}")
    print("-" * 60)
    
    # 加载模板
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    
    # 检查每个模板的匹配情况
    for template_data in templates:
        issuer = template_data.get('issuer', 'Unknown')
        print(f"\n📋 测试模板: {issuer}")
        
        # 创建模板对象
        try:
            template = InvoiceTemplate(template_data)
            print(f"   关键词: {template_data.get('keywords', [])}")
            
            # 检查关键词匹配
            keywords = template_data.get('keywords', [])
            matched_keywords = []
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
            
            print(f"   匹配的关键词: {matched_keywords}")
            
            # 如果关键词匹配，检查字段
            if matched_keywords:
                print(f"   ✅ 关键词匹配，检查字段:")
                fields = template_data.get('fields', {})
                field_results = {}
                required_fields = set()
                
                for field_name, pattern in fields.items():
                    try:
                        matches = re.findall(pattern, text)
                        field_results[field_name] = matches
                        if matches:
                            print(f"      ✅ {field_name}: {matches}")
                        else:
                            print(f"      ❌ {field_name}: 无匹配")
                    except Exception as e:
                        print(f"      ❌ {field_name}: 正则错误 - {e}")
                
                # 检查必需字段
                # invoice2data默认需要: issuer, amount, date, invoice_number
                required_fields = ['amount', 'date', 'invoice_number']
                missing_required = []
                for req_field in required_fields:
                    if req_field not in field_results or not field_results[req_field]:
                        missing_required.append(req_field)
                
                if missing_required:
                    print(f"      ❌ 缺少必需字段: {missing_required}")
                else:
                    print(f"      ✅ 所有必需字段都匹配")
            else:
                print(f"   ❌ 关键词不匹配")
                
        except Exception as e:
            print(f"   ❌ 模板创建失败: {e}")

def optimize_template_for_file(pdf_path: str):
    """为特定文件优化模板"""
    text = extract_text(pdf_path)
    filename = Path(pdf_path).stem
    
    print(f"\n💡 为 {filename} 优化模板:")
    print("-" * 40)
    
    # 分析文本中的关键特征
    features = {
        'has_electronic_invoice': '电子发票' in text,
        'has_ordinary_invoice': '普通发票' in text,
        'has_vat_invoice': '增值税' in text,
        'has_invoice_number': '发票号码' in text,
        'has_issue_date': '开票日期' in text,
        'has_buyer_info': '购买方' in text or '购\s*买\s*方' in text,
        'has_seller_info': '销售方' in text or '销\s*售\s*方' in text,
        'has_total_amount': '价税合计' in text,
        'has_amount': '合计' in text,
    }
    
    print("文本特征:")
    for feature, present in features.items():
        print(f"   {feature}: {'✅' if present else '❌'}")
    
    # 基于特征生成关键词
    keywords = []
    if features['has_electronic_invoice']:
        keywords.append('电子发票')
    if features['has_ordinary_invoice']:
        keywords.append('普通发票')
    if features['has_vat_invoice']:
        keywords.append('增值税')
    if features['has_invoice_number']:
        keywords.append('发票号码')
    if features['has_issue_date']:
        keywords.append('开票日期')
    
    print(f"\n建议关键词: {keywords}")
    
    # 测试字段模式
    print("\n字段匹配测试:")
    field_patterns = {
        'invoice_number': [
            r'发票号码[：:]\s*(\d+)',
            r'发票号码.*?[：:]\s*(\d+)',
            r'(\d{20,})',
        ],
        'date': [
            r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'开票日期.*?[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
        ],
        'amount': [
            r'[¥￥]([\d,]+\.\d{2})',
            r'价税合计.*?[¥￥]([\d,]+\.\d{2})',
            r'合计.*?[¥￥]([\d,]+\.\d{2})',
        ],
        'buyer_name': [
            r'购\s*买\s*方.*?名称[：:]\s*([^\n]+?)(?=\s*统一社会信用代码|$)',
            r'购买方.*?名称[：:]\s*([^\n]+)',
        ],
        'seller_name': [
            r'销\s*售\s*方.*?名称[：:]\s*([^\n]+?)(?=\s*统一社会信用代码|$)',
            r'销售方.*?名称[：:]\s*([^\n]+)',
        ]
    }
    
    best_patterns = {}
    for field, patterns in field_patterns.items():
        print(f"\n   {field}:")
        for i, pattern in enumerate(patterns, 1):
            try:
                matches = re.findall(pattern, text, re.DOTALL)
                if matches:
                    print(f"      模式{i} ✅: {pattern} -> {matches}")
                    if field not in best_patterns:
                        best_patterns[field] = pattern
                else:
                    print(f"      模式{i} ❌: {pattern}")
            except Exception as e:
                print(f"      模式{i} ❌: {pattern} (错误: {e})")
    
    # 生成优化的模板
    optimized_template = {
        'issuer': f'优化模板-{filename[:10]}',
        'keywords': keywords,
        'fields': best_patterns,
        'options': {
            'currency': 'CNY',
            'decimal_separator': '.',
            'date_formats': ['%Y年%m月%d日'],
            'remove_whitespace': False,
            'remove_accents': False,
            'lowercase': False
        }
    }
    
    print(f"\n📝 生成的优化模板:")
    import yaml
    template_yaml = yaml.dump(optimized_template, default_flow_style=False, allow_unicode=True)
    print(template_yaml)
    
    return optimized_template

def main():
    """主函数"""
    failed_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    ]
    
    for pdf_file in failed_files:
        if Path(pdf_file).exists():
            debug_template_matching(pdf_file)
            optimize_template_for_file(pdf_file)
            print("\n" + "=" * 80)

if __name__ == "__main__":
    main()