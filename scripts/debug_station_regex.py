#!/usr/bin/env python3
"""
调试火车票站点正则表达式
"""

import fitz  # PyMuPDF
import re
from pathlib import Path

def extract_and_test_regex():
    """提取PDF文本并测试正则表达式"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    if not Path(pdf_path).exists():
        print(f"文件不存在: {pdf_path}")
        return
    
    print("🔍 提取PDF文本内容")
    print("=" * 50)
    
    # 使用PyMuPDF提取文本
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    print("原始文本内容：")
    print("-" * 30)
    print(repr(text[:1000]))  # 显示前1000个字符的raw格式
    print("-" * 30)
    
    # 查找所有站点
    print("\n🚉 查找所有站点")
    print("-" * 30)
    
    station_pattern = r'([一-龥]+站)'
    stations = re.findall(station_pattern, text)
    print(f"找到的站点: {stations}")
    
    # 测试现有的正则表达式
    print("\n🧪 测试现有正则表达式")
    print("-" * 30)
    
    # 当前模板中的正则
    departure_pattern = r'([一-龥]+站)(?=\n[一-龥]+站)'
    arrival_pattern = r'[一-龥]+站\n([一-龥]+站)'
    
    departure_matches = re.findall(departure_pattern, text)
    arrival_matches = re.findall(arrival_pattern, text)
    
    print(f"出发站匹配 '{departure_pattern}': {departure_matches}")
    print(f"到达站匹配 '{arrival_pattern}': {arrival_matches}")
    
    # 测试多行模式
    print("\n🔄 测试多行模式")
    print("-" * 30)
    
    departure_multiline = re.findall(departure_pattern, text, re.MULTILINE | re.DOTALL)
    arrival_multiline = re.findall(arrival_pattern, text, re.MULTILINE | re.DOTALL)
    
    print(f"出发站多行匹配: {departure_multiline}")
    print(f"到达站多行匹配: {arrival_multiline}")
    
    # 查找站点周围的上下文
    print("\n📍 查找站点上下文")
    print("-" * 30)
    
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if '站' in line:
            print(f"行{i}: {repr(line)}")
            if i > 0:
                print(f"  上一行: {repr(lines[i-1])}")
            if i < len(lines) - 1:
                print(f"  下一行: {repr(lines[i+1])}")
            print()
    
    # 尝试不同的正则模式
    print("\n🛠️  尝试不同的正则模式")
    print("-" * 30)
    
    # 简单匹配第一个和最后一个站点
    if stations:
        print(f"第一个站点: {stations[0]}")
        print(f"最后一个站点: {stations[-1]}")
        if len(stations) >= 2:
            print(f"推荐设置: departure_station = {stations[-1]}, arrival_station = {stations[0]}")
    
    # 测试基于位置的匹配
    print("\n📊 基于位置的匹配测试")
    print("-" * 30)
    
    # 查找站点在文本中的位置
    station_positions = []
    for station in stations:
        pos = text.find(station)
        if pos != -1:
            station_positions.append((station, pos))
    
    station_positions.sort(key=lambda x: x[1])  # 按位置排序
    print("站点按出现位置排序:")
    for station, pos in station_positions:
        print(f"  {station}: 位置 {pos}")

if __name__ == "__main__":
    extract_and_test_regex()