#!/usr/bin/env python3
"""
设计智能的火车票站点提取策略
"""

import fitz
import re
from pathlib import Path

def analyze_station_layout():
    """深度分析站点在PDF中的布局规律"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    print("🔍 深度分析火车票站点布局")
    print("=" * 50)
    
    doc = fitz.open(pdf_path)
    text = doc[0].get_text()
    doc.close()
    
    lines = text.split('\n')
    
    # 找到所有关键信息
    analysis = {
        'train_line': None,
        'time_line': None,
        'english_stations': [],
        'chinese_stations': [],
        'invoice_date_line': None
    }
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # 车次信息
        if re.search(r'^[GDC]\d{4}$', line):
            analysis['train_line'] = (i, line)
        
        # 出发时间
        if re.search(r'\d{1,2}:\d{2}开', line):
            analysis['time_line'] = (i, line)
        
        # 英文站名
        if re.match(r'^[A-Z][a-z]+$', line) and len(line) > 3:
            analysis['english_stations'].append((i, line))
        
        # 中文站名
        if re.search(r'^[\u4e00-\u9fa5]+站$', line):
            analysis['chinese_stations'].append((i, line))
        
        # 开票日期
        if '开票日期' in line:
            analysis['invoice_date_line'] = (i, line)
    
    print("📊 关键信息分布:")
    for key, value in analysis.items():
        print(f"  {key}: {value}")
    
    return analysis

def design_context_based_extraction(analysis):
    """基于上下文设计提取策略"""
    print("\n🎯 基于上下文的提取策略")
    print("=" * 40)
    
    if not analysis['train_line'] or not analysis['chinese_stations']:
        print("❌ 缺少关键信息，无法设计策略")
        return None
    
    train_pos = analysis['train_line'][0]
    time_pos = analysis['time_line'][0] if analysis['time_line'] else None
    invoice_pos = analysis['invoice_date_line'][0] if analysis['invoice_date_line'] else None
    
    print(f"参考点位置:")
    print(f"  车次: 第{train_pos + 1}行")
    print(f"  出发时间: 第{time_pos + 1}行" if time_pos else "  出发时间: 未找到")
    print(f"  开票日期: 第{invoice_pos + 1}行" if invoice_pos else "  开票日期: 未找到")
    
    print(f"\n站点分布:")
    for pos, station in analysis['chinese_stations']:
        print(f"  第{pos + 1}行: {station}")
    
    # 策略1: 基于相对位置
    print(f"\n💡 提取策略:")
    
    if len(analysis['chinese_stations']) >= 2:
        # 通常火车票的站点顺序规律
        print("  策略A: 双站点模式")
        print("    - 如果有两个站点，通常第一个是目的地，第二个是出发地")
        print("    - 或者根据与车次的相对位置判断")
        
        station1_pos, station1 = analysis['chinese_stations'][0]
        station2_pos, station2 = analysis['chinese_stations'][1]
        
        print(f"    - {station1} (第{station1_pos + 1}行)")
        print(f"    - {station2} (第{station2_pos + 1}行)")
        
        # 根据位置关系判断
        if train_pos < station1_pos < station2_pos:
            print(f"    推断: {station2} = 出发站, {station1} = 到达站")
        elif train_pos < station2_pos < station1_pos:
            print(f"    推断: {station1} = 出发站, {station2} = 到达站")
    
    return analysis

def create_universal_patterns():
    """创建通用的站点提取模式"""
    print("\n🔧 创建通用提取模式")
    print("=" * 35)
    
    # 方法1: 多候选模式
    patterns_multi = {
        "departure_station": [
            r"([\u4e00-\u9fa5]+站)(?=.*[GDC]\d{4})",  # 车次前的站点
            r"(?=.*\d{1,2}:\d{2}开).*([\u4e00-\u9fa5]+站)(?!.*[\u4e00-\u9fa5]+站)",  # 最后一个站点（如果出发时间在前）
            r"([\u4e00-\u9fa5]+站)(?!.*[\u4e00-\u9fa5]+站.*开票日期)",  # 开票日期前的最后一个站点
        ],
        "arrival_station": [
            r"(?=.*开票日期).*([\u4e00-\u9fa5]+站)(?!.*[\u4e00-\u9fa5]+站)",  # 开票日期后的最后一个站点
            r"(?=.*[GDC]\d{4}).*([\u4e00-\u9fa5]+站)(?=.*[\u4e00-\u9fa5]+站)",  # 车次后的第一个站点
        ]
    }
    
    # 方法2: 简单有序模式
    patterns_simple = {
        "station_1": r"([\u4e00-\u9fa5]+站)",  # 第一个站点
        "station_2": r"(?<=[\u4e00-\u9fa5]+站.*)([\u4e00-\u9fa5]+站)",  # 第二个站点
    }
    
    # 方法3: 位置感知模式（推荐）
    patterns_position = {
        "all_stations": r"([\u4e00-\u9fa5]+站)",  # 提取所有站点，后处理决定角色
    }
    
    print("方案1 - 多候选模式:")
    for field, patterns in patterns_multi.items():
        print(f"  {field}:")
        for i, pattern in enumerate(patterns, 1):
            print(f"    候选{i}: {pattern}")
    
    print("\n方案2 - 简单有序模式:")
    for field, pattern in patterns_simple.items():
        print(f"  {field}: {pattern}")
    
    print("\n方案3 - 位置感知模式 (推荐):")
    for field, pattern in patterns_position.items():
        print(f"  {field}: {pattern}")
    
    return patterns_position

def test_universal_approach():
    """测试通用方法"""
    print("\n🧪 测试通用提取方法")
    print("=" * 30)
    
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    doc = fitz.open(pdf_path)
    text = doc[0].get_text()
    doc.close()
    
    # 提取所有站点
    all_stations = re.findall(r'([\u4e00-\u9fa5]+站)', text)
    print(f"所有提取的站点: {all_stations}")
    
    # 获取站点在文本中的位置
    station_positions = []
    for station in set(all_stations):  # 去重
        for match in re.finditer(re.escape(station), text):
            station_positions.append((match.start(), station))
    
    station_positions.sort()  # 按位置排序
    print(f"按位置排序的站点: {[station for _, station in station_positions]}")
    
    # 找到车次和时间的位置
    train_match = re.search(r'[GDC]\d{4}', text)
    time_match = re.search(r'\d{1,2}:\d{2}开', text)
    
    print(f"车次位置: {train_match.start() if train_match else '未找到'}")
    print(f"时间位置: {time_match.start() if time_match else '未找到'}")
    
    # 智能判断逻辑
    if len(station_positions) >= 2:
        # 基于位置和上下文的智能判断
        stations_by_pos = [station for _, station in station_positions]
        
        print(f"\n🧠 智能判断逻辑:")
        print(f"  站点顺序: {stations_by_pos}")
        
        # 规则：通常靠近车次和时间的是出发站相关信息
        if train_match and time_match:
            ref_pos = min(train_match.start(), time_match.start())
            
            # 计算每个站点与参考位置的距离
            distances = []
            for pos, station in station_positions:
                distance = abs(pos - ref_pos)
                distances.append((distance, station, pos))
            
            distances.sort()  # 按距离排序
            
            print(f"  与车次/时间的距离:")
            for distance, station, pos in distances:
                print(f"    {station}: 距离 {distance}")
        
        # 最终建议
        print(f"\n💡 建议的提取结果:")
        if len(set(all_stations)) >= 2:
            unique_stations = list(dict.fromkeys(all_stations))  # 保持顺序去重
            print(f"  出发站: {unique_stations[-1]} (通常是最后出现的)")
            print(f"  到达站: {unique_stations[0]} (通常是最先出现的)")

def main():
    print("🚄 智能火车票站点提取策略设计")
    print("=" * 60)
    
    # 深度分析当前票面
    analysis = analyze_station_layout()
    
    # 基于上下文设计策略
    context_analysis = design_context_based_extraction(analysis)
    
    # 创建通用模式
    universal_patterns = create_universal_patterns()
    
    # 测试通用方法
    test_universal_approach()
    
    print("\n" + "=" * 60)
    print("📝 最终建议:")
    print("1. 使用 ([\u4e00-\u9fa5]+站) 提取所有站点")
    print("2. 在后处理中根据位置和上下文智能判断出发/到达")
    print("3. 备选方案：提取前两个站点，让用户或业务逻辑决定")

if __name__ == "__main__":
    main()