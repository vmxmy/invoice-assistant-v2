#!/usr/bin/env python3
"""
分析invoice2data处理过的文本
"""

import os
import tempfile
import yaml
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from pdfminer.high_level import extract_text

def analyze_invoice2data_processing():
    """分析invoice2data的文本处理"""
    
    # 创建一个调试模板，用于获取处理后的文本
    template = {
        'issuer': '调试模板',
        'keywords': ['电子发票'],
        'fields': {
            'invoice_number': '发票号码[：:]\\s*(\\d+)',
            'date': '开票日期[：:]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)',
            'amount': '价税合计.*?（小写）\\s*¥([\\d,]+\\.?\\d*)',
            'raw_text': '(.*)',  # 捕获所有文本
        },
        'options': {
            'remove_whitespace': False,  # 不移除空白
            'remove_accents': False,     # 不移除重音
            'lowercase': False,          # 不转换小写
        }
    }
    
    temp_dir = tempfile.mkdtemp()
    template_file = os.path.join(temp_dir, 'debug.yml')
    
    with open(template_file, 'w', encoding='utf-8') as f:
        yaml.dump(template, f, allow_unicode=True)
    
    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    
    print("=== 原始PDF文本 ===")
    original_text = extract_text(pdf_path)
    print("长度:", len(original_text))
    print("前1000字符:")
    print(repr(original_text[:1000]))
    print()
    print("包含销售方的行:")
    for i, line in enumerate(original_text.split('\n')):
        if '销售方' in line or '售方' in line or '娄底' in line:
            print(f"行{i}: {repr(line)}")
    print()
    print("包含购买方的行:")
    for i, line in enumerate(original_text.split('\n')):
        if '购买方' in line or '买方' in line or '杭州' in line:
            print(f"行{i}: {repr(line)}")
    
    print("\n" + "="*60)
    print("=== invoice2data处理后的文本 ===")
    
    try:
        templates = read_templates(temp_dir)
        result = extract_data(pdf_path, templates=templates)
        
        if result and 'raw_text' in result:
            processed_text = result['raw_text']
            print("类型:", type(processed_text))
            print("长度:", len(processed_text))
            
            if isinstance(processed_text, list):
                print("处理后文本（列表格式）:")
                for i, line in enumerate(processed_text):
                    print(f"行{i}: {repr(line)}")
                print()
                print("包含销售方的行:")
                for i, line in enumerate(processed_text):
                    if '销售方' in line or '售方' in line or '娄底' in line:
                        print(f"行{i}: {repr(line)}")
                print()
                print("包含购买方的行:")
                for i, line in enumerate(processed_text):
                    if '购买方' in line or '买方' in line or '杭州' in line:
                        print(f"行{i}: {repr(line)}")
                
                # 将列表转换为字符串进行正则测试
                processed_text_str = '\n'.join(processed_text)
            else:
                print("前1000字符:")
                print(repr(processed_text[:1000]))
                processed_text_str = processed_text
            
            print("\n" + "="*60)
            print("=== 文本差异分析 ===")
            
            # 比较字符差异
            if len(original_text) != len(processed_text_str):
                print(f"长度变化: {len(original_text)} -> {len(processed_text_str)}")
                print("原始文本是连续的，处理后文本被重新排列了")
            
            print("\n" + "="*60)
            print("=== 基于处理后文本测试正则 ===")
            
            import re
            patterns = {
                'seller_simple': r'娄底[^\n]*',
                'buyer_simple': r'杭州[^\n]*', 
                'seller_with_context': r'名称.*?娄底[^\n]*',
                'buyer_with_context': r'名称.*?杭州[^\n]*',
                'seller_colon': r'名称：([^\n]*娄底[^\n]*)',
                'buyer_colon': r'名称：([^\n]*杭州[^\n]*)',
                'seller_direct': r'娄底市娄星区萝卜餐饮店',
                'buyer_direct': r'杭州趣链科技有限公司',
            }
            
            for name, pattern in patterns.items():
                match = re.search(pattern, processed_text_str, re.DOTALL)
                if match:
                    if match.groups():
                        print(f"{name}: ✅ '{match.group(1).strip()}'")
                    else:
                        print(f"{name}: ✅ '{match.group(0).strip()}'")
                else:
                    print(f"{name}: ❌ 无匹配")
        else:
            print("❌ 无法获取处理后的文本")
            
    except Exception as e:
        print(f"❌ 处理出错: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 清理
        try:
            os.unlink(template_file)
            os.rmdir(temp_dir)
        except:
            pass

if __name__ == "__main__":
    analyze_invoice2data_processing()