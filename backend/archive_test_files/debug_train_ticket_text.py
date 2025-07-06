#!/usr/bin/env python3
"""
调试火车票文本提取 - 深入分析文本结构
"""

import sys
from pathlib import Path
import pdfplumber
from pdfminer.high_level import extract_text
import re

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def debug_train_ticket_text():
    """调试火车票文本提取"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25439165660000008536.pdf"
    
    print("🚄 调试火车票文本提取")
    print("=" * 80)
    
    # 使用pdfplumber提取文本
    print("\n1. 使用pdfplumber提取文本:")
    print("-" * 60)
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                print(f"\n第{page_num+1}页:")
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    for i, line in enumerate(lines):
                        if line.strip():
                            print(f"行{i+1:03d}: {repr(line)}")
                
                # 提取表格
                tables = page.extract_tables()
                if tables:
                    print(f"\n发现{len(tables)}个表格:")
                    for j, table in enumerate(tables):
                        print(f"\n表格{j+1}:")
                        for row in table:
                            print(f"  {row}")
    except Exception as e:
        print(f"❌ pdfplumber提取失败: {e}")
        # 如果pdfplumber失败，使用pdfminer
        try:
            text = extract_text(pdf_path)
            lines = text.split('\n')
            for i, line in enumerate(lines):
                if line.strip():
                    print(f"行{i+1:03d}: {repr(line)}")
        except Exception as e2:
            print(f"❌ pdfminer也失败: {e2}")
    
    # 查找关键字段
    print("\n\n3. 查找关键字段:")
    print("-" * 60)
    text = extract_text(pdf_path)
    
    patterns = {
        "发票号码": r"发票号码[：:]\s*(\d+)",
        "开票日期": r"开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)",
        "票价": r"票价[：:]\s*￥\s*([\d.]+)",
        "购买方名称": r"购买方名称[：:]\s*([^\n]+)",
        "购买方": r"购[买]?\s*方?[名]?\s*称?[：:]\s*([^\n]+)",
        "公司名称": r"([\u4e00-\u9fa5]+(?:科技|技术|公司|有限公司|集团|股份)[\u4e00-\u9fa5]*)"
    }
    
    import re
    for name, pattern in patterns.items():
        matches = re.findall(pattern, text)
        if matches:
            print(f"✅ {name}: {matches}")
        else:
            print(f"❌ {name}: 未找到")
    
    # 分析文本结构
    print("\n\n4. 分析文本结构特征:")
    print("-" * 60)
    if "购买方名称" in text:
        # 找到购买方名称的位置
        idx = text.find("购买方名称")
        context = text[max(0, idx-50):idx+150]
        print(f"购买方名称上下文:\n{repr(context)}")
    
    # 查找所有包含"公司"的行
    print("\n\n5. 查找所有包含'公司'的文本:")
    print("-" * 60)
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if '公司' in line:
            print(f"行{i+1}: {repr(line)}")

if __name__ == "__main__":
    debug_train_ticket_text()