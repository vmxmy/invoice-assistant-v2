#!/usr/bin/env python3
"""
分析火车票通用站点提取模式
"""

import fitz
import re
from pathlib import Path

def analyze_current_ticket():
    """分析当前票的站点位置模式"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    print("🎫 分析当前火车票的站点模式")
    print("=" * 50)
    
    # 提取PDF文本
    doc = fitz.open(pdf_path)
    text = doc[0].get_text()
    doc.close()
    
    lines = text.split('\n')
    
    # 找到关键信息的位置
    key_positions = {}
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # 查找关键标识
        if re.search(r'[GDC]\d{4}', line):  # 车次
            key_positions['train_number'] = (i, line)
        if '开' in line and re.search(r'\d{1,2}:\d{2}', line):  # 出发时间
            key_positions['departure_time'] = (i, line)
        if re.search(r'[\u4e00-\u9fa5]+站', line):  # 中文站名
            if 'stations' not in key_positions:
                key_positions['stations'] = []
            key_positions['stations'].append((i, line))
        if re.search(r'[A-Z][a-z]+', line) and len(line) < 20:  # 可能的英文站名
            if 'english_names' not in key_positions:
                key_positions['english_names'] = []
            key_positions['english_names'].append((i, line))
    
    print("📍 关键信息位置:")
    for key, value in key_positions.items():
        print(f"  {key}: {value}")
    
    # 分析位置关系
    print("\n🔍 位置关系分析:")
    
    if 'train_number' in key_positions and 'stations' in key_positions:
        train_pos = key_positions['train_number'][0]
        print(f"  车次位置: 第{train_pos + 1}行")
        
        for pos, station in key_positions['stations']:
            relation = "之后" if pos > train_pos else "之前"
            distance = abs(pos - train_pos)
            print(f"  {station} (第{pos + 1}行): 车次{relation} {distance}行")
    
    return key_positions, lines

def design_universal_patterns(key_positions, lines):
    """设计通用的站点提取模式"""
    print("\n🎯 设计通用提取模式")
    print("=" * 40)
    
    # 方案1: 基于车次附近的站点
    print("方案1: 基于车次上下文的站点提取")
    patterns_v1 = {
        "departure_station": r"(?=.*[GDC]\d{4}).*?([\u4e00-\u9fa5]+站)",
        "arrival_station": r"(?=.*[GDC]\d{4})(?:(?!.*departure_station).)*?([\u4e00-\u9fa5]+站)"
    }
    
    # 方案2: 基于时间标识的站点
    print("方案2: 基于出发时间附近的站点")
    patterns_v2 = {
        "departure_station": r"(?=.*\d{1,2}:\d{2}开).*?([\u4e00-\u9fa5]+站)",
        "arrival_station": r"(?<!.*\d{1,2}:\d{2}开.*)([\u4e00-\u9fa5]+站)"
    }
    
    # 方案3: 基于文档结构的顺序
    print("方案3: 基于文档位置顺序")
    patterns_v3 = {
        "departure_station": r"([\u4e00-\u9fa5]+站)(?=.*开票日期)",  # 开票日期之前的站点
        "arrival_station": r"(?=.*开票日期).*([\u4e00-\u9fa5]+站)"   # 开票日期之后的站点
    }
    
    # 方案4: 混合策略 - 最稳定
    print("方案4: 混合策略（推荐）")
    patterns_v4 = {
        "departure_station": r"(?=.*[GDC]\d{4})(?=.*\d{1,2}:\d{2}开).*([\u4e00-\u9fa5]+站)(?=.*[\u4e00-\u9fa5]+站)",
        "arrival_station": r"(?=.*开票日期).*([\u4e00-\u9fa5]+站)(?!.*[\u4e00-\u9fa5]+站)"
    }
    
    all_patterns = {
        "方案1 (车次上下文)": patterns_v1,
        "方案2 (时间上下文)": patterns_v2, 
        "方案3 (文档结构)": patterns_v3,
        "方案4 (混合策略)": patterns_v4
    }
    
    return all_patterns

def test_patterns_on_current_ticket(patterns, text):
    """在当前票面测试所有模式"""
    print("\n🧪 测试提取效果")
    print("=" * 30)
    
    # 实际的站点（作为参考）
    expected = {
        "departure_station": "普宁站",
        "arrival_station": "广州南站"
    }
    
    for pattern_name, pattern_dict in patterns.items():
        print(f"\n{pattern_name}:")
        
        for field, regex in pattern_dict.items():
            try:
                matches = re.findall(regex, text, re.DOTALL)
                if matches:
                    extracted = matches[0] if isinstance(matches[0], str) else matches[0]
                    expected_value = expected.get(field, "")
                    status = "✅" if extracted == expected_value else "❌"
                    print(f"  {field}: {extracted} {status}")
                else:
                    print(f"  {field}: 未匹配 ❌")
            except Exception as e:
                print(f"  {field}: 正则错误 - {e}")

def generate_optimized_patterns():
    """生成优化后的通用模式"""
    print("\n⚡ 最终优化模式")
    print("=" * 30)
    
    # 基于分析结果的最佳实践
    optimized = {
        "departure_station_v1": r"([\u4e00-\u9fa5]+站)(?=.*[GDC]\d{4})",  # 车次前的站点
        "departure_station_v2": r"([\u4e00-\u9fa5]+站)(?=.*\d{1,2}:\d{2}开)",  # 出发时间前的站点
        
        "arrival_station_v1": r"(?=.*开票日期).*([\u4e00-\u9fa5]+站)$",  # 文档末尾的站点
        "arrival_station_v2": r"Guangzhounan[^站]*?([\u4e00-\u9fa5]+站)",  # 英文名后的中文站名
        
        # 简化但通用的版本
        "departure_station_simple": r"(?=.*[GDC]\d{4})([\u4e00-\u9fa5]+站)",
        "arrival_station_simple": r"(?<=开票日期.*)([\u4e00-\u9fa5]+站)",
    }
    
    print("🎯 推荐的通用正则表达式:")
    for name, pattern in optimized.items():
        print(f"  {name}: {pattern}")
    
    # 最终推荐
    print("\n⭐ 最终推荐使用:")
    final_recommendation = {
        "departure_station": "([\u4e00-\u9fa5]+站)(?=.*[GDC]\d{4}.*\d{1,2}:\d{2}开)",
        "arrival_station": "(?=.*开票日期).*([\u4e00-\u9fa5]+站)(?!.*[\u4e00-\u9fa5]+站.*[\u4e00-\u9fa5]+站)"
    }
    
    for field, pattern in final_recommendation.items():
        print(f"  {field}: {pattern}")
    
    print("\n📝 设计说明:")
    print("  - departure_station: 车次和出发时间之前最近的站点")
    print("  - arrival_station: 开票日期之后的最后一个站点")
    print("  - 使用前瞻和后顾断言确保正确的上下文")
    
    return final_recommendation

def main():
    print("🚄 火车票通用站点提取模式分析")
    print("=" * 60)
    
    # 分析当前票面
    key_positions, lines = analyze_current_ticket()
    text = '\n'.join(lines)
    
    # 设计通用模式
    all_patterns = design_universal_patterns(key_positions, lines)
    
    # 测试模式效果
    test_patterns_on_current_ticket(all_patterns, text)
    
    # 生成最终优化模式
    final_patterns = generate_optimized_patterns()
    
    print(f"\n✅ 分析完成！")
    print(f"生成了通用的火车票站点提取模式")

if __name__ == "__main__":
    main()