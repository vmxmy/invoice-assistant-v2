#!/usr/bin/env python3
"""
调试"购买方名称:"周围的上下文
"""

import fitz  # PyMuPDF
import re
from pathlib import Path

def analyze_buyer_context():
    """分析"购买方名称:"周围的上下文"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    if not Path(pdf_path).exists():
        print(f"文件不存在: {pdf_path}")
        return
    
    print("🔍 分析'购买方名称:'周围的上下文")
    print("=" * 50)
    
    # 使用PyMuPDF提取文本
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    # 查找"购买方名称:"的位置
    buyer_label_pos = text.find("购买方名称:")
    print(f"'购买方名称:'位置: {buyer_label_pos}")
    
    if buyer_label_pos != -1:
        # 显示前后100个字符的上下文
        start = max(0, buyer_label_pos - 100)
        end = min(len(text), buyer_label_pos + 100)
        context = text[start:end]
        print(f"\n上下文 (前后100字符):")
        print(repr(context))
        
        # 分析"购买方名称:"后面的内容
        after_label = text[buyer_label_pos + len("购买方名称:"):]
        print(f"\n'购买方名称:'后面的内容 (前50字符):")
        print(repr(after_label[:50]))
    
    # 测试不同的匹配模式
    print(f"\n🧪 测试'购买方名称:'后面的模式")
    print("-" * 30)
    
    patterns = [
        r"购买方名称:\s*([\\u4e00-\\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团|有限公司|股份有限公司|合伙企业|事务所|中心|厂|店))",
        r"购买方名称:\n\s*([\\u4e00-\\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团|有限公司|股份有限公司|合伙企业|事务所|中心|厂|店))",
        r"购买方名称:([^\\n]*)",
        r"购买方名称:\s*([^\\n]*)",
        r"购买方名称:\n([^\\n]*)"
    ]
    
    for i, pattern in enumerate(patterns, 1):
        matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
        print(f"模式{i}: {pattern}")
        print(f"匹配结果: {matches}")
        print()
    
    # 检查是否购买方信息在其他位置
    print(f"\n🔍 查找所有可能的购买方信息位置")
    print("-" * 30)
    
    lines = text.split('\n')
    company_line_index = -1
    
    for i, line in enumerate(lines):
        if '杭州趣链科技有限公司' in line:
            company_line_index = i
            print(f"公司名称在第{i}行: {repr(line)}")
            break
    
    buyer_label_index = -1
    for i, line in enumerate(lines):
        if '购买方名称:' in line:
            buyer_label_index = i
            print(f"'购买方名称:'在第{i}行: {repr(line)}")
            break
    
    print(f"\n📊 位置分析:")
    print(f"公司名称行号: {company_line_index}")
    print(f"'购买方名称:'行号: {buyer_label_index}")
    
    if company_line_index != -1 and buyer_label_index != -1:
        if company_line_index < buyer_label_index:
            print("✅ 公司名称在'购买方名称:'标签之前")
            # 尝试反向匹配：找到"购买方名称:"之前最近的公司名称
            before_label_text = '\n'.join(lines[:buyer_label_index])
            pattern = r"([\\u4e00-\\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团|有限公司|股份有限公司|合伙企业|事务所|中心|厂|店))"
            companies = re.findall(pattern, before_label_text)
            print(f"标签前的公司名称: {companies}")
            if companies:
                print(f"建议使用最后一个: {companies[-1]}")
        else:
            print("ℹ️  公司名称在'购买方名称:'标签之后")

if __name__ == "__main__":
    analyze_buyer_context()