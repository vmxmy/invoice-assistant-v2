#!/usr/bin/env python3
"""
测试火车票关键词匹配
"""

import sys
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
import pdfplumber

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def test_keywords_matching():
    """测试关键词匹配"""
    # 测试多个PDF文件
    test_files = [
        ("/Users/xumingyang/app/invoice_assist/downloads/25439165660000008536.pdf", "火车票"),
        ("/Users/xumingyang/app/invoice_assist/downloads/25442000000101203423.pdf", "普通发票"),
    ]
    
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    templates = read_templates(str(templates_dir))
    
    print("🔍 测试关键词匹配")
    print("=" * 80)
    
    for pdf_path, expected_type in test_files:
        if not Path(pdf_path).exists():
            print(f"\n⚠️  文件不存在: {pdf_path}")
            continue
            
        print(f"\n测试文件: {Path(pdf_path).name}")
        print(f"预期类型: {expected_type}")
        print("-" * 60)
        
        # 提取文本
        with pdfplumber.open(pdf_path) as pdf:
            text = pdf.pages[0].extract_text()
            
        # 测试每个模板的关键词匹配
        print("关键词匹配测试:")
        for template in templates:
            issuer = template.get('issuer', 'Unknown')
            keywords = template.get('keywords', [])
            
            # 检查每个关键词
            matched_keywords = []
            for keyword in keywords:
                if keyword in text:
                    matched_keywords.append(keyword)
            
            if matched_keywords:
                print(f"  ✅ {issuer}: 匹配 {len(matched_keywords)}/{len(keywords)} 个关键词")
                print(f"     匹配的关键词: {matched_keywords}")
            else:
                print(f"  ❌ {issuer}: 无匹配")
        
        # 使用invoice2data提取
        result = extract_data(pdf_path, templates=templates)
        if result:
            print(f"\n最终识别结果: {result.get('issuer', 'Unknown')}")
            print(f"提取的发票号码: {result.get('invoice_number', 'N/A')}")
        else:
            print(f"\n❌ 无法识别")

if __name__ == "__main__":
    test_keywords_matching()