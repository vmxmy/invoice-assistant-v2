#!/usr/bin/env python3
"""
分析基于坐标的发票信息提取

利用PyMuPDF的get_text("dict")功能，分析发票的空间布局并设计坐标提取策略
"""

import sys
import fitz  # PyMuPDF
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import re

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def extract_text_with_coordinates(pdf_path: str) -> Dict[str, Any]:
    """
    提取带坐标信息的文本
    
    Args:
        pdf_path: PDF文件路径
        
    Returns:
        Dict: 包含文本和坐标信息的字典
    """
    doc = fitz.open(pdf_path)
    result = {
        'pages': [],
        'total_pages': doc.page_count
    }
    
    for page_num in range(doc.page_count):
        page = doc[page_num]
        
        # 获取带坐标的文本字典
        text_dict = page.get_text("dict")
        
        page_info = {
            'page_num': page_num,
            'page_size': {
                'width': page.rect.width,
                'height': page.rect.height
            },
            'text_blocks': []
        }
        
        for block in text_dict["blocks"]:
            if block['type'] == 0:  # 文本块
                block_info = {
                    'bbox': block['bbox'],  # (x0, y0, x1, y1)
                    'lines': []
                }
                
                for line in block["lines"]:
                    line_info = {
                        'bbox': line['bbox'],
                        'spans': []
                    }
                    
                    for span in line["spans"]:
                        span_info = {
                            'text': span['text'],
                            'bbox': span['bbox'],  # (x0, y0, x1, y1)
                            'font': span.get('font', ''),
                            'size': span.get('size', 0),
                            'flags': span.get('flags', 0)
                        }
                        line_info['spans'].append(span_info)
                    
                    block_info['lines'].append(line_info)
                
                page_info['text_blocks'].append(block_info)
        
        result['pages'].append(page_info)
    
    doc.close()
    return result

def analyze_spatial_patterns(coordinate_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    分析空间布局模式
    
    Args:
        coordinate_data: 坐标数据
        
    Returns:
        Dict: 空间分析结果
    """
    analysis = {
        'key_labels': [],
        'spatial_relationships': [],
        'table_structures': [],
        'layout_zones': {}
    }
    
    # 分析第一页（发票通常在第一页）
    if coordinate_data['pages']:
        page = coordinate_data['pages'][0]
        page_width = page['page_size']['width']
        page_height = page['page_size']['height']
        
        # 收集所有文本span
        all_spans = []
        for block in page['text_blocks']:
            for line in block['lines']:
                for span in line['spans']:
                    if span['text'].strip():
                        all_spans.append(span)
        
        # 识别关键标签
        key_patterns = [
            '发票号码', '开票日期', '购买方', '销售方', 
            '价税合计', '合计金额', '统一社会信用代码',
            '纳税人识别号', '开票人'
        ]
        
        for span in all_spans:
            text = span['text'].strip()
            for pattern in key_patterns:
                if pattern in text:
                    analysis['key_labels'].append({
                        'label': pattern,
                        'text': text,
                        'bbox': span['bbox'],
                        'position': {
                            'x_center': (span['bbox'][0] + span['bbox'][2]) / 2,
                            'y_center': (span['bbox'][1] + span['bbox'][3]) / 2
                        }
                    })
        
        # 分析空间关系：寻找标签右侧或下方的数值
        for label_info in analysis['key_labels']:
            label_bbox = label_info['bbox']
            label_text = label_info['label']
            
            # 定义搜索区域（标签右侧或下方）
            search_areas = {
                'right': (label_bbox[2], label_bbox[1] - 5, label_bbox[2] + 200, label_bbox[3] + 5),
                'below': (label_bbox[0] - 10, label_bbox[3], label_bbox[0] + 300, label_bbox[3] + 30)
            }
            
            for direction, search_bbox in search_areas.items():
                candidates = []
                
                for span in all_spans:
                    span_bbox = span['bbox']
                    span_center_x = (span_bbox[0] + span_bbox[2]) / 2
                    span_center_y = (span_bbox[1] + span_bbox[3]) / 2
                    
                    # 检查是否在搜索区域内
                    if (search_bbox[0] <= span_center_x <= search_bbox[2] and 
                        search_bbox[1] <= span_center_y <= search_bbox[3]):
                        
                        text = span['text'].strip()
                        if text and text != label_info['text']:
                            candidates.append({
                                'text': text,
                                'bbox': span_bbox,
                                'distance': ((span_center_x - label_info['position']['x_center'])**2 + 
                                           (span_center_y - label_info['position']['y_center'])**2)**0.5
                            })
                
                # 按距离排序，取最近的
                if candidates:
                    candidates.sort(key=lambda x: x['distance'])
                    analysis['spatial_relationships'].append({
                        'label': label_text,
                        'label_bbox': label_bbox,
                        'direction': direction,
                        'candidates': candidates[:3]  # 取前3个候选
                    })
        
        # 分析布局分区
        analysis['layout_zones'] = {
            'header': {'y_range': (0, page_height * 0.15), 'spans': []},
            'buyer_seller': {'y_range': (page_height * 0.15, page_height * 0.4), 'spans': []},
            'items': {'y_range': (page_height * 0.4, page_height * 0.8), 'spans': []},
            'footer': {'y_range': (page_height * 0.8, page_height), 'spans': []},
        }
        
        for span in all_spans:
            y_center = (span['bbox'][1] + span['bbox'][3]) / 2
            for zone_name, zone_info in analysis['layout_zones'].items():
                if zone_info['y_range'][0] <= y_center <= zone_info['y_range'][1]:
                    zone_info['spans'].append(span)
                    break
    
    return analysis

def design_coordinate_extraction_rules(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    基于分析结果设计坐标提取规则
    
    Args:
        analysis: 空间分析结果
        
    Returns:
        Dict: 提取规则
    """
    rules = {
        'field_extraction_strategies': {},
        'spatial_patterns': {},
        'validation_rules': {}
    }
    
    # 为每个关键字段设计提取策略
    field_mappings = {
        '发票号码': 'invoice_number',
        '开票日期': 'date', 
        '价税合计': 'amount',
        '购买方': 'buyer_info',
        '销售方': 'seller_info'
    }
    
    for relationship in analysis['spatial_relationships']:
        label = relationship['label']
        field_name = field_mappings.get(label)
        
        if field_name and relationship['candidates']:
            best_candidate = relationship['candidates'][0]
            
            rules['field_extraction_strategies'][field_name] = {
                'label_pattern': label,
                'search_direction': relationship['direction'],
                'search_offset': {
                    'x': best_candidate['bbox'][0] - relationship['label_bbox'][2] if relationship['direction'] == 'right' else 0,
                    'y': best_candidate['bbox'][1] - relationship['label_bbox'][3] if relationship['direction'] == 'below' else 0
                },
                'search_area_size': {
                    'width': 200 if relationship['direction'] == 'right' else 300,
                    'height': 10 if relationship['direction'] == 'right' else 30
                },
                'expected_pattern': _get_pattern_for_field(field_name),
                'confidence': _calculate_confidence(best_candidate['text'], field_name)
            }
    
    # 设计空间模式
    rules['spatial_patterns'] = {
        'label_value_proximity': {
            'max_distance': 200,
            'preferred_directions': ['right', 'below'],
            'tolerance': 10
        },
        'table_detection': {
            'min_columns': 2,
            'row_height_tolerance': 5,
            'column_alignment_tolerance': 10
        }
    }
    
    return rules

def _get_pattern_for_field(field_name: str) -> str:
    """获取字段的预期模式"""
    patterns = {
        'invoice_number': r'\d{10,25}',
        'date': r'\d{4}年\d{1,2}月\d{1,2}日',
        'amount': r'[0-9,]+\.?\d*',
        'buyer_info': r'[^,，\n]+',
        'seller_info': r'[^,，\n]+'
    }
    return patterns.get(field_name, r'.+')

def _calculate_confidence(text: str, field_name: str) -> float:
    """计算提取置信度"""
    pattern = _get_pattern_for_field(field_name)
    if re.search(pattern, text):
        return 0.9
    elif any(char.isdigit() for char in text) and field_name in ['invoice_number', 'amount']:
        return 0.7
    elif len(text) > 2:
        return 0.5
    return 0.1

def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    
    # 测试文件
    test_files = [
        "25442000000101203423.pdf",  # 餐饮发票
        "25432000000031789815.pdf",  # 餐饮发票  
        "25359134169000052039.pdf"   # 火车票
    ]
    
    print("🎯 基于坐标的发票信息提取分析")
    print("=" * 60)
    
    for file_name in test_files:
        pdf_path = downloads_dir / file_name
        
        if not pdf_path.exists():
            print(f"⚠️ 跳过不存在的文件: {file_name}")
            continue
        
        print(f"\n📄 分析文件: {file_name}")
        print("-" * 40)
        
        try:
            # 提取坐标数据
            coordinate_data = extract_text_with_coordinates(str(pdf_path))
            print(f"✅ 成功提取坐标数据")
            print(f"   页数: {coordinate_data['total_pages']}")
            
            if coordinate_data['pages']:
                page = coordinate_data['pages'][0]
                total_spans = sum(len(line['spans']) for block in page['text_blocks'] for line in block['lines'])
                print(f"   文本段数: {total_spans}")
                print(f"   页面尺寸: {page['page_size']['width']:.1f} x {page['page_size']['height']:.1f}")
            
            # 空间模式分析
            analysis = analyze_spatial_patterns(coordinate_data)
            print(f"\n🔍 空间模式分析:")
            print(f"   关键标签数: {len(analysis['key_labels'])}")
            print(f"   空间关系数: {len(analysis['spatial_relationships'])}")
            
            # 显示关键标签
            if analysis['key_labels']:
                print(f"\n   识别的关键标签:")
                for label in analysis['key_labels']:
                    x, y = label['position']['x_center'], label['position']['y_center']
                    print(f"     - {label['label']}: ({x:.1f}, {y:.1f})")
            
            # 显示空间关系
            if analysis['spatial_relationships']:
                print(f"\n   空间关系示例:")
                for rel in analysis['spatial_relationships'][:3]:  # 只显示前3个
                    if rel['candidates']:
                        candidate = rel['candidates'][0]
                        print(f"     - {rel['label']} -> {rel['direction']}: '{candidate['text'][:20]}'")
            
            # 设计提取规则
            rules = design_coordinate_extraction_rules(analysis)
            print(f"\n⚙️ 提取规则设计:")
            for field, strategy in rules['field_extraction_strategies'].items():
                print(f"   - {field}: {strategy['search_direction']}方向, 置信度: {strategy['confidence']:.2f}")
                
        except Exception as e:
            print(f"❌ 分析失败: {e}")
    
    print(f"\n" + "=" * 60)
    print("📋 设计总结:")
    print("1. 坐标提取可以提供空间关系信息")
    print("2. 标签-数值关系检测是核心策略")
    print("3. 不同方向的搜索区域需要动态调整")
    print("4. 可以与现有模板匹配结合使用")

if __name__ == "__main__":
    main()