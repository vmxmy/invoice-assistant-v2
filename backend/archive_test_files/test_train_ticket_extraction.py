#!/usr/bin/env python3
"""
测试火车票模板提取
"""

import sys
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
import pdfplumber

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def test_train_ticket_extraction():
    """测试火车票模板提取"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25439165660000008536.pdf"
    templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
    
    print("🚄 测试火车票模板提取")
    print("=" * 80)
    
    # 1. 首先打印PDF文本内容
    print("\n1. PDF文本内容:")
    print("-" * 60)
    with pdfplumber.open(pdf_path) as pdf:
        text = pdf.pages[0].extract_text()
        print(text)
    
    # 2. 加载模板
    print("\n\n2. 加载模板:")
    print("-" * 60)
    templates = read_templates(str(templates_dir))
    print(f"✅ 加载了 {len(templates)} 个模板")
    
    for template in templates:
        issuer = template.get('issuer', 'Unknown')
        priority = template.get('priority', 0)
        print(f"   - {issuer} (优先级: {priority})")
    
    # 3. 测试提取
    print("\n\n3. 测试提取:")
    print("-" * 60)
    
    result = extract_data(pdf_path, templates=templates)
    
    if result:
        print("✅ 提取成功!")
        print(f"\n提取结果:")
        for key, value in result.items():
            print(f"   {key}: {value}")
        
        # 检查关键字段
        print("\n\n4. 关键字段检查:")
        print("-" * 60)
        required_fields = ['invoice_number', 'date', 'amount', 'buyer_name', 'buyer_tax_id']
        for field in required_fields:
            if field in result:
                print(f"✅ {field}: {result[field]}")
            else:
                print(f"❌ {field}: 未提取到")
    else:
        print("❌ 提取失败!")
        
        # 手动测试正则表达式
        print("\n\n5. 手动测试正则表达式:")
        print("-" * 60)
        
        import re
        patterns = {
            "invoice_number": r"发票号码:([0-9]{20})",
            "date": r"开票日期:(\d{4}年\d{1,2}月\d{1,2}日)",
            "amount": r"￥([0-9]+\.[0-9]{2})",
            "buyer_name": r"购买方名称:([^\s]+)",
            "buyer_tax_id": r"统一社会信用代码:([A-Z0-9]{18})"
        }
        
        for name, pattern in patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                print(f"✅ {name}: {matches[0]}")
            else:
                print(f"❌ {name}: 未匹配")

if __name__ == "__main__":
    test_train_ticket_extraction()