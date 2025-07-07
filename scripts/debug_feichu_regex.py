#!/usr/bin/env python3
"""
调试飞猪航空发票正则表达式
"""

import re
import fitz  # PyMuPDF
from pathlib import Path

def debug_regex():
    """调试正则表达式"""
    
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326164322/2025-03-26-阿斯兰航空服务（上海）有限公司-192.00-25317000000510550926.pdf"
    
    if not Path(pdf_path).exists():
        print(f"❌ 文件不存在: {pdf_path}")
        return
    
    print("🔧 调试飞猪航空发票正则表达式")
    print("=" * 80)
    
    # 打开PDF
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    print("📄 PDF文本内容:")
    print("-" * 40)
    print(text[:1000])  # 显示前1000个字符
    print("...")
    print("-" * 40)
    
    # 测试不同的正则表达式
    patterns = [
        # 购买方名称
        ('购买方名称1', r'购\s*买\s*方[\s\S]*?名称[：:]\s*([^\n]+)'),
        ('购买方名称2', r'名称[：:]\s*([^\n]+).*?统一社会信用代码'),
        ('购买方名称3', r'购买方信息\s*名称[：:]\s*([^\n]+)'),
        ('购买方名称4', r'购\s*买\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)'),
        ('购买方名称5', r'息\s*名称[：:]\s*([^\n]+)\s*统一社会'),
        
        # 购买方税号
        ('购买方税号1', r'购\s*买\s*方[\s\S]*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]{15,20})'),
        ('购买方税号2', r'统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]{15,20}).*?销'),
        ('购买方税号3', r'纳税人识别号[：:]\s*([A-Z0-9]{15,20})'),
        
        # 销售方名称
        ('销售方名称1', r'销\s*售\s*方[\s\S]*?名称[：:]\s*([^\n]+)'),
        ('销售方名称2', r'销\s*售\s*方\s*信\s*息\s*名称[：:]\s*([^\n]+)'),
        ('销售方名称3', r'销.*?名称[：:]\s*([^\n]+)\s*统一社会'),
        
        # 销售方税号
        ('销售方税号1', r'销\s*售\s*方[\s\S]*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]{15,20})'),
        ('销售方税号2', r'销售方.*?纳税人识别号[：:]\s*([A-Z0-9]{15,20})'),
    ]
    
    print("\n🔍 正则表达式测试:")
    print("-" * 40)
    
    for name, pattern in patterns:
        matches = re.findall(pattern, text, re.DOTALL | re.MULTILINE)
        if matches:
            print(f"✅ {name}: {matches}")
        else:
            print(f"❌ {name}: 无匹配")
    
    # 提取特定部分进行分析
    print("\n📋 文本片段分析:")
    print("-" * 40)
    
    # 查找购买方部分
    buyer_match = re.search(r'购\s*买\s*方.*?销\s*售\s*方', text, re.DOTALL)
    if buyer_match:
        print("购买方部分:")
        print(repr(buyer_match.group(0)))
        print()
    
    # 查找销售方部分
    seller_match = re.search(r'销\s*售\s*方.*?项目名称', text, re.DOTALL)
    if seller_match:
        print("销售方部分:")
        print(repr(seller_match.group(0)))

if __name__ == "__main__":
    debug_regex()