#!/usr/bin/env python3
"""
分析失败的两个PDF文件
"""

import sys
from pathlib import Path
from pdfminer.high_level import extract_text
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
import re

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def analyze_failed_file(pdf_path: str):
    """分析单个失败的PDF文件"""
    print(f"📄 分析文件: {Path(pdf_path).name}")
    print("=" * 60)
    
    # 1. 检查文件是否存在
    if not Path(pdf_path).exists():
        print("❌ 文件不存在")
        return
    
    # 2. 提取PDF文本
    try:
        text = extract_text(pdf_path)
        print(f"📝 PDF文本长度: {len(text)} 字符")
        print(f"📖 文本预览 (前500字符):")
        print(text[:500])
        print("-" * 40)
        
        # 3. 分析文本内容特征
        analyze_text_features(text)
        
        # 4. 测试现有模板
        test_existing_templates(pdf_path, text)
        
        # 5. 分析可能的匹配模式
        analyze_potential_patterns(text)
        
    except Exception as e:
        print(f"❌ 文本提取失败: {e}")

def analyze_text_features(text: str):
    """分析文本特征"""
    print("🔍 文本特征分析:")
    
    # 检查关键词
    keywords = [
        "电子发票", "增值税", "发票号码", "开票日期", "价税合计", 
        "销售方", "购买方", "合计", "金额", "票价", "总计"
    ]
    
    found_keywords = []
    for keyword in keywords:
        if keyword in text:
            found_keywords.append(keyword)
    
    print(f"   关键词: {found_keywords}")
    
    # 查找发票号码
    invoice_numbers = re.findall(r'发票号码[：:]?\s*(\d+)', text)
    if invoice_numbers:
        print(f"   发票号码: {invoice_numbers}")
    else:
        # 查找可能的发票号码（长数字）
        long_numbers = re.findall(r'\d{20,}', text)
        if long_numbers:
            print(f"   可能的发票号码: {long_numbers[:3]}")
    
    # 查找日期
    dates = re.findall(r'\d{4}年\d{1,2}月\d{1,2}日', text)
    if dates:
        print(f"   日期: {dates}")
    
    # 查找金额
    amounts = re.findall(r'[¥￥]([\d,]+\.?\d*)', text)
    if amounts:
        print(f"   金额: {amounts}")
    
    # 查找可能的金额关键词
    amount_keywords = ['价税合计', '合计', '总计', '金额', '票价', '应付']
    found_amount_keywords = [kw for kw in amount_keywords if kw in text]
    if found_amount_keywords:
        print(f"   金额相关词: {found_amount_keywords}")
    
    print()

def test_existing_templates(pdf_path: str, text: str):
    """测试现有模板"""
    print("🧪 测试现有模板:")
    
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    
    print(f"   加载了 {len(templates)} 个模板")
    
    # 尝试使用invoice2data
    try:
        result = extract_data(pdf_path, templates=templates)
        if result:
            print(f"   ✅ 提取成功: {result}")
        else:
            print("   ❌ 无模板匹配")
            
            # 检查哪些模板的关键词匹配
            for template in templates:
                issuer = template.get('issuer', 'Unknown')
                keywords = template.get('keywords', [])
                
                matched_keywords = [kw for kw in keywords if kw in text]
                if matched_keywords:
                    print(f"   📋 模板 '{issuer}' 匹配关键词: {matched_keywords}")
                    
                    # 测试各个字段
                    fields = template.get('fields', {})
                    print(f"      字段测试:")
                    for field_name, pattern in fields.items():
                        try:
                            matches = re.findall(pattern, text)
                            if matches:
                                print(f"         ✅ {field_name}: {matches}")
                            else:
                                print(f"         ❌ {field_name}: 无匹配")
                        except Exception as e:
                            print(f"         ❌ {field_name}: 正则错误 - {e}")
    
    except Exception as e:
        print(f"   ❌ 模板测试失败: {e}")
    
    print()

def analyze_potential_patterns(text: str):
    """分析可能的新模式"""
    print("🔧 潜在模式分析:")
    
    # 查找所有可能的发票号码模式
    print("   发票号码模式:")
    patterns = [
        r'发票号码[：:]?\s*(\d+)',
        r'No[.:]?\s*(\d+)',
        r'票据号码[：:]?\s*(\d+)',
        r'(\d{20,})',  # 长数字序列
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            print(f"      {pattern}: {matches[:3]}")
    
    # 查找所有可能的日期模式
    print("   日期模式:")
    date_patterns = [
        r'\d{4}年\d{1,2}月\d{1,2}日',
        r'\d{4}-\d{1,2}-\d{1,2}',
        r'\d{4}/\d{1,2}/\d{1,2}',
        r'\d{2}/\d{2}/\d{4}',
    ]
    
    for pattern in date_patterns:
        matches = re.findall(pattern, text)
        if matches:
            print(f"      {pattern}: {matches[:3]}")
    
    # 查找所有可能的金额模式
    print("   金额模式:")
    amount_patterns = [
        r'[¥￥]([\d,]+\.?\d*)',
        r'金额[：:]?\s*[¥￥]?([\d,]+\.?\d*)',
        r'合计[：:]?\s*[¥￥]?([\d,]+\.?\d*)',
        r'总计[：:]?\s*[¥￥]?([\d,]+\.?\d*)',
        r'应付[：:]?\s*[¥￥]?([\d,]+\.?\d*)',
        r'价税合计[：:]?\s*[¥￥]?([\d,]+\.?\d*)',
        r'([\d,]+\.\d{2})',  # 纯数字金额
    ]
    
    for pattern in amount_patterns:
        matches = re.findall(pattern, text)
        if matches:
            print(f"      {pattern}: {matches[:3]}")
    
    print()

def suggest_new_template(pdf_path: str, text: str):
    """根据分析结果建议新模板"""
    print("💡 新模板建议:")
    
    # 基于文本分析建议模板
    template_suggestion = {
        'issuer': f'发票类型-{Path(pdf_path).stem[:10]}',
        'keywords': [],
        'fields': {}
    }
    
    # 分析关键词
    if '增值税' in text:
        template_suggestion['keywords'].append('增值税')
    if '电子发票' in text:
        template_suggestion['keywords'].append('电子发票')
    if '普通发票' in text:
        template_suggestion['keywords'].append('普通发票')
    
    # 分析字段模式
    invoice_numbers = re.findall(r'发票号码[：:]?\s*(\d+)', text)
    if invoice_numbers:
        template_suggestion['fields']['invoice_number'] = '发票号码[：:]?\\s*(\\d+)'
    
    dates = re.findall(r'\d{4}年\d{1,2}月\d{1,2}日', text)
    if dates:
        template_suggestion['fields']['date'] = '开票日期[：:]?\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)'
    
    amounts = re.findall(r'[¥￥]([\d,]+\.?\d*)', text)
    if amounts:
        template_suggestion['fields']['amount'] = '[¥￥]([\\d,]+\\.\\d{2})'
    
    print(f"   建议模板结构:")
    import yaml
    print(yaml.dump(template_suggestion, default_flow_style=False, allow_unicode=True))

def main():
    """主函数"""
    failed_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf"
    ]
    
    print("🔍 分析失败的PDF文件")
    print("=" * 80)
    
    for i, pdf_file in enumerate(failed_files, 1):
        print(f"\n📄 [{i}/2] 分析文件")
        analyze_failed_file(pdf_file)
        suggest_new_template(pdf_file, extract_text(pdf_file) if Path(pdf_file).exists() else "")
        print("\n" + "=" * 80)

if __name__ == "__main__":
    main()