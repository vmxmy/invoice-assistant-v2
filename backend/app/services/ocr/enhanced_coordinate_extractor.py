#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
增强的基于坐标的发票信息提取器
处理垂直布局、多列布局等复杂情况
"""

import pymupdf
import re
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path
import math

@dataclass
class TextBlock:
    """文本块数据结构"""
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    
    @property
    def center_x(self):
        return (self.x0 + self.x1) / 2
    
    @property
    def center_y(self):
        return (self.y0 + self.y1) / 2
    
    @property
    def width(self):
        return self.x1 - self.x0
    
    @property
    def height(self):
        return self.y1 - self.y0

class EnhancedCoordinateExtractor:
    """增强的基于坐标的提取器"""
    
    def __init__(self):
        # 垂直文本模式（需要合并的）
        self.vertical_patterns = {
            'buyer_label': ['购', '买', '方'],
            'seller_label': ['销', '售', '方'],
            'info_label': ['信', '息'],
            'total_label': ['合', '计']
        }
        
        # 字段匹配规则
        self.field_rules = {
            'invoice_number': {
                'labels': ['发票号码'],
                'value_pattern': r'^\d{10,}$',
                'search_direction': 'right_or_below',
                'max_distance': 200
            },
            'invoice_date': {
                'labels': ['开票日期'],
                'value_pattern': r'\d{4}年\d{1,2}月\d{1,2}日',
                'search_direction': 'right_or_below',
                'max_distance': 200
            },
            'buyer_name': {
                'labels': ['购买方', '买方', '购方'],
                'value_pattern': r'^(?!.*统一社会信用代码)(?!.*纳税人识别号).*(公司|企业|集团|有限|商店|店|厂|社|部|中心).*$',
                'search_direction': 'anywhere',
                'max_distance': 300,
                'context': 'buyer'
            },
            'seller_name': {
                'labels': ['销售方', '卖方', '销方'],
                'value_pattern': r'^(?!.*统一社会信用代码)(?!.*纳税人识别号).*(公司|企业|集团|有限|商店|店|厂|社|部|中心).*$',
                'search_direction': 'anywhere',
                'max_distance': 300,
                'context': 'seller'
            },
            'buyer_tax_id': {
                'labels': ['统一社会信用代码', '纳税人识别号'],
                'value_pattern': r'^[A-Z0-9]{18}$',
                'search_direction': 'anywhere',
                'max_distance': 300,
                'context': 'buyer'
            },
            'seller_tax_id': {
                'labels': ['统一社会信用代码', '纳税人识别号'],
                'value_pattern': r'^[A-Z0-9]{18}$',
                'search_direction': 'anywhere',
                'max_distance': 300,
                'context': 'seller'
            },
            'amount': {
                'labels': ['价税合计', '合计', '总计'],
                'value_pattern': r'[¥￥]?\s*([0-9,]+\.?\d*)',
                'search_direction': 'right_or_below',
                'max_distance': 200
            }
        }
    
    def extract_from_pdf(self, pdf_path: str) -> Dict:
        """从PDF提取发票信息"""
        try:
            doc = pymupdf.open(pdf_path)
            page = doc[0]
            
            # 提取文本块
            text_blocks = self.extract_text_blocks(page)
            
            # 合并垂直文本
            text_blocks = self.merge_vertical_text(text_blocks)
            
            # 识别布局区域
            regions = self.identify_regions(text_blocks)
            
            # 提取字段
            result = self.extract_fields_with_context(text_blocks, regions)
            
            doc.close()
            
            return result
            
        except Exception as e:
            print(f"提取失败: {e}")
            import traceback
            traceback.print_exc()
            return {'error': str(e)}
    
    def extract_text_blocks(self, page) -> List[TextBlock]:
        """提取页面中的所有文本块"""
        text_blocks = []
        
        text_dict = page.get_text("dict")
        
        for block in text_dict["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    line_text = ""
                    line_bbox = line["bbox"]
                    
                    for span in line["spans"]:
                        line_text += span["text"]
                    
                    if line_text.strip():
                        text_blocks.append(TextBlock(
                            text=line_text.strip(),
                            x0=line_bbox[0],
                            y0=line_bbox[1],
                            x1=line_bbox[2],
                            y1=line_bbox[3]
                        ))
        
        return text_blocks
    
    def merge_vertical_text(self, text_blocks: List[TextBlock]) -> List[TextBlock]:
        """合并垂直排列的文本"""
        merged_blocks = []
        used_indices = set()
        
        # 遍历每个文本块
        for i, block in enumerate(text_blocks):
            if i in used_indices:
                continue
            
            # 检查是否是垂直文本的开始
            merged = False
            for pattern_name, chars in self.vertical_patterns.items():
                if block.text == chars[0]:
                    # 尝试找到完整的垂直文本
                    vertical_blocks = [block]
                    used_indices.add(i)
                    
                    # 查找后续字符
                    for j in range(1, len(chars)):
                        found = False
                        for k in range(i + 1, min(i + 10, len(text_blocks))):
                            if k not in used_indices:
                                next_block = text_blocks[k]
                                # 检查是否在同一垂直线上
                                if (abs(next_block.x0 - block.x0) < 5 and 
                                    next_block.text == chars[j]):
                                    vertical_blocks.append(next_block)
                                    used_indices.add(k)
                                    found = True
                                    break
                        
                        if not found:
                            break
                    
                    # 如果找到完整的垂直文本，合并它们
                    if len(vertical_blocks) == len(chars):
                        merged_text = ''.join(chars)
                        merged_block = TextBlock(
                            text=merged_text,
                            x0=vertical_blocks[0].x0,
                            y0=vertical_blocks[0].y0,
                            x1=vertical_blocks[-1].x1,
                            y1=vertical_blocks[-1].y1
                        )
                        merged_blocks.append(merged_block)
                        merged = True
                        break
            
            if not merged and i not in used_indices:
                merged_blocks.append(block)
        
        return merged_blocks
    
    def identify_regions(self, text_blocks: List[TextBlock]) -> Dict:
        """识别页面上的不同区域（购买方、销售方等）"""
        regions = {
            'buyer': {'blocks': [], 'bounds': None, 'anchor': None},
            'seller': {'blocks': [], 'bounds': None, 'anchor': None},
            'items': {'blocks': [], 'bounds': None, 'anchor': None},
            'summary': {'blocks': [], 'bounds': None, 'anchor': None}
        }
        
        # 查找区域标识
        for block in text_blocks:
            if '购买方' in block.text or '买方' in block.text:
                # 购买方区域通常在左侧
                regions['buyer']['anchor'] = block
                regions['buyer']['x_range'] = (0, 300)  # 左侧区域
                regions['buyer']['y_range'] = (block.y0 - 10, block.y1 + 60)  # 垂直范围
                
            elif '销售方' in block.text or '卖方' in block.text:
                # 销售方区域通常在右侧
                regions['seller']['anchor'] = block
                regions['seller']['x_range'] = (300, 600)  # 右侧区域
                regions['seller']['y_range'] = (block.y0 - 10, block.y1 + 60)  # 垂直范围
                
            elif '项目' in block.text and '名称' in block.text:
                # 项目明细区域
                regions['items']['anchor'] = block
                
            elif '合计' in block.text or '价税合计' in block.text:
                # 汇总区域
                regions['summary']['anchor'] = block
        
        # 将文本块分配到各个区域
        for block in text_blocks:
            # 根据位置分配到购买方或销售方区域
            if 'x_range' in regions['buyer'] and 'y_range' in regions['buyer']:
                if (regions['buyer']['x_range'][0] <= block.x0 <= regions['buyer']['x_range'][1] and
                    regions['buyer']['y_range'][0] <= block.y0 <= regions['buyer']['y_range'][1]):
                    regions['buyer']['blocks'].append(block)
            
            if 'x_range' in regions['seller'] and 'y_range' in regions['seller']:
                if (regions['seller']['x_range'][0] <= block.x0 <= regions['seller']['x_range'][1] and
                    regions['seller']['y_range'][0] <= block.y0 <= regions['seller']['y_range'][1]):
                    regions['seller']['blocks'].append(block)
        
        return regions
    
    def extract_fields_with_context(self, text_blocks: List[TextBlock], regions: Dict) -> Dict:
        """基于上下文提取字段"""
        result = {}
        
        for field_name, rule in self.field_rules.items():
            # 获取字段的上下文区域
            context = rule.get('context', 'global')
            
            if context == 'buyer':
                search_blocks = regions['buyer']['blocks'] if regions['buyer']['blocks'] else text_blocks
            elif context == 'seller':
                search_blocks = regions['seller']['blocks'] if regions['seller']['blocks'] else text_blocks
            else:
                search_blocks = text_blocks
            
            # 查找字段值
            value = self.find_field_value_enhanced(search_blocks, rule, field_name)
            
            if value:
                result[field_name] = value
        
        return result
    
    def find_field_value_enhanced(self, text_blocks: List[TextBlock], rule: Dict, field_name: str) -> Optional[str]:
        """增强的字段值查找"""
        # 查找标签
        label_blocks = []
        for block in text_blocks:
            for label in rule['labels']:
                if label in block.text:
                    label_blocks.append(block)
        
        if not label_blocks:
            return None
        
        # 对每个标签块查找值
        candidates = []
        
        for label_block in label_blocks:
            # 首先检查标签块内是否包含值
            if 'value_pattern' in rule:
                match = re.search(rule['value_pattern'], label_block.text)
                if match:
                    if field_name == 'amount':
                        return match.group(1) if match.lastindex else match.group()
                    else:
                        return match.group()
            
            # 根据搜索方向查找值
            search_direction = rule.get('search_direction', 'right_or_below')
            max_distance = rule.get('max_distance', 200)
            
            for block in text_blocks:
                if block == label_block:
                    continue
                
                # 计算距离
                distance = self.calculate_distance(label_block, block)
                if distance > max_distance:
                    continue
                
                # 检查方向
                if search_direction == 'right_or_below':
                    if not (self.is_on_right(label_block, block) or self.is_below(label_block, block)):
                        continue
                elif search_direction == 'right':
                    if not self.is_on_right(label_block, block):
                        continue
                elif search_direction == 'below':
                    if not self.is_below(label_block, block):
                        continue
                # 'anywhere' 不需要方向检查
                
                # 检查值模式
                if 'value_pattern' in rule:
                    match = re.search(rule['value_pattern'], block.text)
                    if match:
                        # 对于公司名称，使用完整匹配
                        if field_name in ['buyer_name', 'seller_name']:
                            candidates.append((block.text, distance, block))
                        else:
                            value = match.group(1) if match.lastindex else match.group()
                            candidates.append((value, distance, block))
                else:
                    candidates.append((block.text, distance, block))
        
        # 选择最佳候选
        if candidates:
            # 按距离排序
            candidates.sort(key=lambda x: x[1])
            
            # 特殊处理：对于公司名称，优先选择包含完整公司关键词的
            if field_name in ['buyer_name', 'seller_name']:
                # 首先尝试找到包含完整公司关键词的
                for candidate in candidates:
                    if any(keyword in candidate[0] for keyword in ['有限公司', '股份有限公司', '集团公司', '有限责任公司']):
                        return candidate[0]
                # 如果没有找到，返回最近的包含公司相关字符的
                for candidate in candidates:
                    if '公司' in candidate[0] and len(candidate[0]) > 2:
                        return candidate[0]
            
            return candidates[0][0]
        
        return None
    
    def is_on_right(self, block1: TextBlock, block2: TextBlock) -> bool:
        """判断block2是否在block1右侧"""
        return block2.x0 > block1.x0 and abs(block2.center_y - block1.center_y) < 20
    
    def is_below(self, block1: TextBlock, block2: TextBlock) -> bool:
        """判断block2是否在block1下方"""
        return block2.y0 > block1.y0 and abs(block2.center_x - block1.center_x) < 100
    
    def calculate_distance(self, block1: TextBlock, block2: TextBlock) -> float:
        """计算两个文本块的距离"""
        dx = block1.center_x - block2.center_x
        dy = block1.center_y - block2.center_y
        return math.sqrt(dx * dx + dy * dy)

def test_enhanced_extraction():
    """测试增强的坐标提取"""
    
    extractor = EnhancedCoordinateExtractor()
    
    test_files = [
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
        "downloads/25439165666000019624.pdf", 
        "downloads/dzfp_25432000000032177192_杭州趣链科技有限公司_20250313093318.pdf"
    ]
    
    results = {}
    
    for pdf_path in test_files:
        if Path(pdf_path).exists():
            filename = Path(pdf_path).name
            print(f"\n=== 测试文件: {filename} ===")
            
            result = extractor.extract_from_pdf(pdf_path)
            results[filename] = result
            
            print("提取结果:")
            for field, value in result.items():
                if field != 'error':
                    print(f"  {field}: {value}")
            
            # 统计成功率
            expected_fields = ['invoice_number', 'invoice_date', 'buyer_name', 'seller_name', 
                             'buyer_tax_id', 'seller_tax_id', 'amount']
            
            extracted_count = sum(1 for f in expected_fields if f in result and result[f])
            print(f"成功提取: {extracted_count}/{len(expected_fields)} 个字段")
    
    # 保存结果
    with open("enhanced_coordinate_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: enhanced_coordinate_results.json")
    
    # 对比改进效果
    print("\n=== 效果对比 ===")
    total_fields = 0
    for filename, result in results.items():
        if 'error' not in result:
            field_count = len([v for v in result.values() if v])
            total_fields += field_count
            print(f"{filename}: {field_count}个字段")
    
    print(f"总共提取: {total_fields}个字段")

if __name__ == "__main__":
    test_enhanced_extraction()