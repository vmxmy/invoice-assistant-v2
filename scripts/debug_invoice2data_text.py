#!/usr/bin/env python3
"""
调试invoice2data处理后的文本
"""

import sys
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def debug_invoice2data():
    """调试invoice2data处理的文本"""
    
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326164322/2025-03-26-阿斯兰航空服务（上海）有限公司-192.00-25317000000510550926.pdf"
    
    if not Path(pdf_path).exists():
        print(f"❌ 文件不存在: {pdf_path}")
        return
    
    print("🔍 调试invoice2data处理")
    print("=" * 80)
    
    # 加载模板
    templates_dir = Path(__file__).parent / "app/services/ocr/templates"
    templates = read_templates(str(templates_dir))
    
    # 提取数据（带调试）
    from invoice2data.input import pdftotext
    
    # 获取文本
    text = pdftotext.to_text(pdf_path)
    
    print("📄 Invoice2data提取的文本:")
    print("-" * 40)
    print(text)
    print("-" * 40)
    
    # 显示文本的repr格式
    print("\n📝 文本repr格式（显示所有字符）:")
    print("-" * 40)
    print(repr(text[:500]))
    print("...")
    
    # 查找关键部分
    import re
    
    print("\n🔍 查找关键部分:")
    print("-" * 40)
    
    # 购买方
    buyer_pattern = r'购\s*买\s*方'
    buyer_matches = list(re.finditer(buyer_pattern, text))
    if buyer_matches:
        print(f"找到购买方 {len(buyer_matches)} 次:")
        for match in buyer_matches:
            start = max(0, match.start() - 20)
            end = min(len(text), match.end() + 100)
            print(f"  位置 {match.start()}: ...{repr(text[start:end])}...")
    
    # 销售方
    seller_pattern = r'销\s*售\s*方'
    seller_matches = list(re.finditer(seller_pattern, text))
    if seller_matches:
        print(f"\n找到销售方 {len(seller_matches)} 次:")
        for match in seller_matches:
            start = max(0, match.start() - 20)
            end = min(len(text), match.end() + 100)
            print(f"  位置 {match.start()}: ...{repr(text[start:end])}...")

if __name__ == "__main__":
    debug_invoice2data()