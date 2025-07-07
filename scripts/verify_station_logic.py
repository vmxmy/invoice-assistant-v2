#!/usr/bin/env python3
"""
验证站点提取逻辑的正确性
"""

import sys
from pathlib import Path
import fitz  # PyMuPDF
import re

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

def verify_station_extraction_logic():
    """验证站点提取逻辑"""
    
    print("🔍 验证站点提取逻辑")
    print("=" * 60)
    
    # 测试文件2 - 问题文件
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf"
    
    if not Path(pdf_path).exists():
        print("PDF文件不存在")
        return
    
    # 读取PDF文本
    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    doc.close()
    
    print("📄 PDF文本分析:")
    lines = full_text.split('\n')
    
    # 找到发车时间的位置
    departure_time_line = None
    for i, line in enumerate(lines):
        if re.search(r'\d{1,2}:\d{2}开', line):
            departure_time_line = i
            print(f"🕐 发车时间在第{i+1}行: {line.strip()}")
            break
    
    # 找到所有站点
    stations = []
    for i, line in enumerate(lines):
        if '站' in line and len(line.strip()) <= 10:  # 可能是站点名
            stations.append((i, line.strip()))
            distance = abs(i - departure_time_line) if departure_time_line else 999
            print(f"🚉 站点在第{i+1}行: {line.strip()}, 距离发车时间{distance}行")
    
    print(f"\n💡 逻辑分析:")
    print(f"按照火车票常识:")
    print(f"- 发车时间 '{lines[departure_time_line].strip()}' 是从出发站开始的")
    print(f"- 距离发车时间最近的站点应该是出发站")
    print(f"- 距离发车时间较远的站点应该是到达站")
    
    # 找到最近的站点
    if departure_time_line and stations:
        closest_station = min(stations, key=lambda x: abs(x[0] - departure_time_line))
        farthest_station = max(stations, key=lambda x: abs(x[0] - departure_time_line))
        
        print(f"\n🎯 正确的站点分配应该是:")
        print(f"- 出发站: {closest_station[1]} (第{closest_station[0]+1}行，距离{abs(closest_station[0] - departure_time_line)}行)")
        print(f"- 到达站: {farthest_station[1]} (第{farthest_station[0]+1}行，距离{abs(farthest_station[0] - departure_time_line)}行)")
    
    print(f"\n❌ 当前代码的错误:")
    print(f"- 代码把 second_station 赋给了 departure_station")
    print(f"- 代码把 first_station 赋给了 arrival_station") 
    print(f"- 这与实际逻辑完全相反")
    
    print(f"\n✅ 正确的修复方案:")
    print(f"- departure_station = first_station  (更近的站点)")
    print(f"- arrival_station = second_station   (更远的站点)")

if __name__ == "__main__":
    verify_station_extraction_logic()