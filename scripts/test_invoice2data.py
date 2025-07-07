#!/usr/bin/env python3
"""
测试invoice2data库的PDF发票解析能力
"""

import os
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from pprint import pprint

def test_invoice2data_basic():
    """基础测试invoice2data解析能力"""
    
    # 测试文件列表
    test_files = [
        '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf',
        '/Users/xumingyang/app/invoice_assist/downloads/25432000000031789815.pdf',
        '/Users/xumingyang/app/invoice_assist/downloads/25432000000029033553-杭州趣链物联科技有限公司.pdf'
    ]
    
    print("🔍 测试invoice2data库解析PDF发票")
    print("=" * 60)
    
    # 加载默认模板
    try:
        templates = read_templates()
        print(f"📋 加载了 {len(templates)} 个默认模板")
    except Exception as e:
        print(f"⚠️ 模板加载失败: {e}")
        templates = []
    
    for i, pdf_path in enumerate(test_files, 1):
        if not os.path.exists(pdf_path):
            print(f"❌ 文件 {i}: {os.path.basename(pdf_path)} - 文件不存在")
            continue
            
        print(f"\n📄 测试文件 {i}: {os.path.basename(pdf_path)}")
        print(f"📁 文件大小: {os.path.getsize(pdf_path):,} 字节")
        
        try:
            # 使用不同的文本提取方法测试
            methods = ['pdftotext', 'pdfminer', 'tesseract']
            
            for method in methods:
                print(f"\n🔧 使用方法: {method}")
                try:
                    # 提取数据
                    result = extract_data(pdf_path, templates=templates)
                    
                    if result:
                        print(f"   ✅ 解析成功")
                        print(f"   📊 提取的字段数: {len(result)}")
                        
                        # 显示提取的关键信息
                        key_fields = ['date', 'amount', 'currency', 'issuer', 'invoice_number']
                        for field in key_fields:
                            if field in result:
                                print(f"   {field}: {result[field]}")
                        
                        # 显示所有提取的字段
                        print(f"   📋 完整结果:")
                        pprint(result, indent=6)
                        
                    else:
                        print(f"   ❌ 未能提取数据")
                        
                except Exception as e:
                    print(f"   ❌ 方法 {method} 失败: {e}")
                    continue
                    
                # 只测试第一个成功的方法
                if result:
                    break
                    
        except Exception as e:
            print(f"❌ 处理失败: {e}")

def test_raw_text_extraction():
    """测试原始文本提取"""
    print("\n" + "=" * 60)
    print("🔍 测试原始文本提取")
    
    pdf_path = '/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf'
    
    if os.path.exists(pdf_path):
        print(f"📄 测试文件: {os.path.basename(pdf_path)}")
        
        try:
            # 直接使用pdfminer提取文本
            from pdfminer.high_level import extract_text
            text = extract_text(pdf_path)
            
            print(f"📄 提取的原始文本 (前500字符):")
            print("-" * 40)
            print(text[:500])
            print("-" * 40)
            
            # 查找发票相关信息
            import re
            
            # 发票号码
            invoice_num = re.search(r'发票号码[：:]\s*(\d+)', text)
            if invoice_num:
                print(f"🔍 发票号码: {invoice_num.group(1)}")
            
            # 金额
            amount = re.search(r'¥([\d,]+\.?\d*)', text)
            if amount:
                print(f"💰 金额: ¥{amount.group(1)}")
            
            # 日期
            date_match = re.search(r'(\d{4}年\d{1,2}月\d{1,2}日)', text)
            if date_match:
                print(f"📅 日期: {date_match.group(1)}")
                
        except Exception as e:
            print(f"❌ 文本提取失败: {e}")

if __name__ == "__main__":
    test_invoice2data_basic()
    test_raw_text_extraction()