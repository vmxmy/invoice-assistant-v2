#!/usr/bin/env python3
"""
调试invoice2data文本处理
"""

from invoice2data.extract.loader import read_templates
from invoice2data import extract_data
from pdfminer.high_level import extract_text
import tempfile, yaml, os, re

def debug_text_processing():
    # 创建包含必需字段的调试模板
    template = {
        'issuer': '调试模板',
        'keywords': ['电子发票'],
        'fields': {
            'invoice_number': r'发票号码[：:]\s*(\d+)',
            'date': r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            'amount': r'价税合计.*?（小写）\s*¥([\d,]+\.?\d*)',
            'text_sample': r'电子发票.*?(.{200})',  # 捕获关键区域文本
        }
    }

    temp_dir = tempfile.mkdtemp()
    template_file = os.path.join(temp_dir, 'debug.yml')
    with open(template_file, 'w', encoding='utf-8') as f:
        yaml.dump(template, f, allow_unicode=True)

    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    
    print("=== 原始PDF文本分析 ===")
    original_text = extract_text(pdf_path)
    print("前500字符:")
    print(repr(original_text[:500]))
    print()
    
    # 手动测试正则
    print("=== 手动正则测试 ===")
    patterns = {
        'seller_name': r'销\s*售\s*方\s*信\s*息\s*名\s*称\s*[：:]\s*([^\n]+)',
        'buyer_name': r'购\s*买\s*方\s*信\s*息\s*名\s*称\s*[：:]\s*([^\n]+)',
        'seller_name2': r'销售方信息.*?名称[：:]\s*([^\n]+)',
        'buyer_name2': r'购买方信息.*?名称[：:]\s*([^\n]+)',
    }
    
    for name, pattern in patterns.items():
        match = re.search(pattern, original_text, re.DOTALL)
        if match:
            print(f"{name}: ✅ '{match.group(1).strip()}'")
        else:
            print(f"{name}: ❌ 无匹配")
    print()
    
    # 测试invoice2data处理
    print("=== invoice2data处理测试 ===")
    try:
        templates = read_templates(temp_dir)
        result = extract_data(pdf_path, templates=templates)
        
        if result:
            print("invoice2data处理成功")
            if 'text_sample' in result:
                print("处理后的文本样本:")
                print(repr(result['text_sample']))
        else:
            print("invoice2data处理失败")
            
    except Exception as e:
        print(f"invoice2data出错: {e}")

    # 清理
    os.unlink(template_file)
    os.rmdir(temp_dir)

if __name__ == "__main__":
    debug_text_processing()