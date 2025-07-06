#!/usr/bin/env python3
"""
调试铁路票金额匹配正则表达式
"""

import re
from pdfminer.high_level import extract_text

def test_regex_patterns():
    """测试不同的正则表达式模式"""
    
    # 从实际PDF提取的文本
    sample_texts = [
        "票价:￥96.50一等座3207051981****2012徐明扬",
        "票价:\n\n￥339.00\n\n3207051981****20",
        "票价:\n\n￥12.00\n\n3207051981****201",
        "票价: ￥96.50 一等座",
        "票价：￥339.00"
    ]
    
    # 测试不同的正则表达式
    patterns = [
        ('原始模式', r'票价[：:]?\s*[¥￥]?([\d,]+\.?\d*)'),
        ('简化模式', r'票价.*?[¥￥]([\d,]+\.?\d*)'),
        ('宽松模式', r'票价.*?([¥￥][\d,]+\.?\d*)'),
        ('完整匹配', r'票价[：:\s]*[¥￥]?([\d,]+\.\d{2})'),
        ('多行匹配', r'票价[：:\s]*\s*[¥￥]?([\d,]+\.?\d*)'),
        ('换行处理', r'票价[：:]\s*\n*\s*[¥￥]?([\d,]+\.?\d*)'),
        ('通用模式', r'[¥￥]([\d,]+\.\d{2})'),
    ]
    
    print("🔍 测试铁路票金额正则表达式")
    print("=" * 60)
    
    for text in sample_texts:
        print(f"\n📝 测试文本: {repr(text)}")
        print("-" * 40)
        
        for name, pattern in patterns:
            try:
                matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
                if matches:
                    print(f"✅ {name:12}: {matches}")
                else:
                    print(f"❌ {name:12}: 无匹配")
            except Exception as e:
                print(f"❌ {name:12}: 错误 - {e}")

def extract_actual_pdf_text():
    """提取实际PDF文本进行分析"""
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/25439165666000019624.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/25439122799000011090.pdf"
    ]
    
    print("\n🔍 提取实际PDF文本")
    print("=" * 60)
    
    for pdf_file in test_files:
        try:
            text = extract_text(pdf_file)
            print(f"\n📄 文件: {pdf_file.split('/')[-1]}")
            print(f"文本内容:\n{text}")
            print("-" * 40)
            
            # 查找票价相关部分
            ticket_price_match = re.search(r'票价.*?[¥￥][\d,]+\.?\d*.*?(?=\d{13})', text, re.DOTALL)
            if ticket_price_match:
                print(f"票价部分: {repr(ticket_price_match.group())}")
            
            # 测试各种模式
            patterns = [
                r'票价[：:]?\s*[¥￥]?([\d,]+\.?\d*)',
                r'票价.*?[¥￥]([\d,]+\.?\d*)',
                r'[¥￥]([\d,]+\.\d{2})',
            ]
            
            for i, pattern in enumerate(patterns, 1):
                matches = re.findall(pattern, text)
                print(f"模式{i}: {matches}")
            
        except Exception as e:
            print(f"处理失败: {e}")

def main():
    test_regex_patterns()
    extract_actual_pdf_text()

if __name__ == "__main__":
    main()