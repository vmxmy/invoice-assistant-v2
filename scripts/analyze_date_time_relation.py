#!/usr/bin/env python3
"""
分析火车票中发车日期和发车时间的位置关系
"""

import sys
from pathlib import Path
import fitz  # PyMuPDF
import re

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def analyze_date_time_relation():
    """分析发车日期和时间的位置关系"""
    
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-35.50-25359134169000052039.pdf"
    ]
    
    for i, pdf_path in enumerate(test_files, 1):
        if not Path(pdf_path).exists():
            print(f"❌ 文件{i}: 文件不存在")
            continue
            
        print(f"\n🔍 分析文件{i}: {Path(pdf_path).name}")
        print("=" * 80)
        
        # 读取PDF文本
        doc = fitz.open(pdf_path)
        full_text = ""
        for page in doc:
            full_text += page.get_text()
        doc.close()
        
        # 将文本按行分割
        lines = full_text.split('\n')
        
        print("📄 完整文本内容:")
        for j, line in enumerate(lines):
            print(f"{j+1:2d}: {line}")
        
        print("\n🔍 关键信息定位:")
        print("-" * 40)
        
        # 查找发车时间
        departure_times = []
        for j, line in enumerate(lines):
            time_match = re.search(r'(\d{1,2}:\d{2})开', line)
            if time_match:
                departure_times.append((j, line.strip(), time_match.group(1)))
                print(f"🕐 发车时间在第{j+1}行: {time_match.group(1)} (完整行: {line.strip()})")
        
        # 查找所有日期
        dates = []
        for j, line in enumerate(lines):
            date_matches = re.findall(r'\d{4}年\d{1,2}月\d{1,2}日', line)
            for date in date_matches:
                dates.append((j, line.strip(), date))
                print(f"📅 日期在第{j+1}行: {date} (完整行: {line.strip()})")
        
        # 查找开票日期
        invoice_dates = []
        for j, line in enumerate(lines):
            invoice_match = re.search(r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)', line)
            if invoice_match:
                invoice_dates.append((j, line.strip(), invoice_match.group(1)))
                print(f"🧾 开票日期在第{j+1}行: {invoice_match.group(1)} (完整行: {line.strip()})")
        
        # 分析位置关系
        print("\n📊 位置关系分析:")
        print("-" * 40)
        
        if departure_times and dates:
            # 找到最接近发车时间的日期
            departure_time_line = departure_times[0][0]  # 第一个发车时间的行号
            
            print(f"发车时间在第{departure_time_line+1}行")
            
            # 计算每个日期与发车时间的距离
            for date_line, date_content, date_value in dates:
                distance = abs(date_line - departure_time_line)
                print(f"日期 '{date_value}' 在第{date_line+1}行，距离发车时间 {distance} 行")
                
                # 判断是否为开票日期
                is_invoice_date = any(date_value == inv_date for _, _, inv_date in invoice_dates)
                if is_invoice_date:
                    print(f"  └─ 这是开票日期 ❌")
                else:
                    print(f"  └─ 可能是发车日期 ✅")
        
        # 查找车次信息位置
        print("\n🚄 车次信息:")
        for j, line in enumerate(lines):
            train_match = re.search(r'([GDC]\d{4})', line)
            if train_match:
                print(f"🚄 车次在第{j+1}行: {train_match.group(1)} (完整行: {line.strip()})")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    analyze_date_time_relation()