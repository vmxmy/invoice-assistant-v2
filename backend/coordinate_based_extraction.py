#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
基于坐标的发票信息提取
解决PyMuPDF文本提取顺序错乱问题
"""

import pymupdf
import re
import json
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class TextBlock:
    """文本块数据结构"""
    text: str
    x0: float  # 左边界
    y0: float  # 上边界
    x1: float  # 右边界
    y1: float  # 下边界
    
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

class CoordinateBasedExtractor:
    """基于坐标的发票信息提取器"""
    
    def __init__(self):
        # 定义关键字段标签
        self.field_labels = {
            'invoice_number': ['发票号码', 'Invoice No'],
            'invoice_date': ['开票日期', 'Date'],
            'buyer_name': ['购买方名称', '买方名称', '购方名称'],
            'seller_name': ['销售方名称', '卖方名称', '销方名称'],
            'buyer_tax_id': ['购买方.*?统一社会信用代码', '购买方.*?纳税人识别号'],
            'seller_tax_id': ['销售方.*?统一社会信用代码', '销售方.*?纳税人识别号'],
            'amount': ['价税合计', '合计金额', '总金额']
        }
        
        # 距离阈值（像素）
        self.distance_threshold = {
            'horizontal': 300,  # 水平方向最大距离
            'vertical': 50,     # 垂直方向最大距离
            'same_line': 10     # 同行判定阈值
        }
    
    def extract_from_pdf(self, pdf_path: str) -> Dict:
        """从PDF提取发票信息"""
        try:
            doc = pymupdf.open(pdf_path)
            page = doc[0]  # 只处理第一页
            
            # 获取所有文本块及其坐标
            text_blocks = self.extract_text_blocks(page)
            
            # 按照Y坐标排序（从上到下）
            text_blocks.sort(key=lambda b: (b.y0, b.x0))
            
            # 提取字段
            result = self.extract_fields(text_blocks)
            
            doc.close()
            
            return result
            
        except Exception as e:
            print(f"提取失败: {e}")
            return {'error': str(e)}
    
    def extract_text_blocks(self, page) -> List[TextBlock]:
        """提取页面中的所有文本块及其坐标"""
        text_blocks = []
        
        # 使用get_text("dict")获取详细的文本信息
        text_dict = page.get_text("dict")
        
        # 遍历所有文本块
        for block in text_dict["blocks"]:
            if "lines" in block:  # 文本块
                for line in block["lines"]:
                    line_text = ""
                    line_bbox = line["bbox"]
                    
                    # 合并行中的所有span
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
    
    def extract_fields(self, text_blocks: List[TextBlock]) -> Dict:
        """从文本块中提取字段"""
        result = {}
        
        # 为每个字段查找标签和值
        for field, labels in self.field_labels.items():
            value = self.find_field_value(text_blocks, labels, field)
            if value:
                result[field] = value
        
        return result
    
    def find_field_value(self, text_blocks: List[TextBlock], labels: List[str], field_type: str) -> Optional[str]:
        """查找字段值"""
        # 首先找到标签块
        label_block = None
        for block in text_blocks:
            for label in labels:
                if re.search(label, block.text):
                    label_block = block
                    break
            if label_block:
                break
        
        if not label_block:
            return None
        
        # 根据字段类型采用不同的查找策略
        if field_type in ['invoice_number', 'invoice_date', 'amount']:
            # 这些字段通常值在标签右侧或同一文本块内
            return self.find_value_on_right_or_inline(text_blocks, label_block, field_type)
        
        elif field_type in ['buyer_name', 'seller_name', 'buyer_tax_id', 'seller_tax_id']:
            # 这些字段值可能在下方或右侧
            return self.find_value_nearby(text_blocks, label_block, field_type)
        
        return None
    
    def find_value_on_right_or_inline(self, text_blocks: List[TextBlock], label_block: TextBlock, field_type: str) -> Optional[str]:
        """查找标签右侧或同一块内的值"""
        # 先检查标签块内是否包含值
        if field_type == 'invoice_number':
            match = re.search(r'[：:]\s*(\d+)', label_block.text)
            if match:
                return match.group(1)
        
        elif field_type == 'invoice_date':
            match = re.search(r'[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)', label_block.text)
            if match:
                return match.group(1)
        
        elif field_type == 'amount':
            match = re.search(r'[¥￥]\s*([0-9,]+\.?\d*)', label_block.text)
            if match:
                return match.group(1)
        
        # 查找右侧的文本块
        for block in text_blocks:
            if self.is_on_right(label_block, block) and self.is_same_line(label_block, block):
                # 提取数值
                if field_type == 'invoice_number' and re.match(r'^\d+$', block.text):
                    return block.text
                elif field_type == 'invoice_date' and re.search(r'\d{4}年\d{1,2}月\d{1,2}日', block.text):
                    return re.search(r'\d{4}年\d{1,2}月\d{1,2}日', block.text).group()
                elif field_type == 'amount' and re.search(r'[0-9,]+\.?\d*', block.text):
                    return re.search(r'[0-9,]+\.?\d*', block.text).group()
        
        return None
    
    def find_value_nearby(self, text_blocks: List[TextBlock], label_block: TextBlock, field_type: str) -> Optional[str]:
        """查找标签附近的值（下方或右侧）"""
        candidates = []
        
        for block in text_blocks:
            # 跳过标签块本身
            if block == label_block:
                continue
            
            # 计算与标签的相对位置
            is_below = self.is_below(label_block, block)
            is_right = self.is_on_right(label_block, block)
            is_near = self.is_nearby(label_block, block)
            
            if is_near and (is_below or is_right):
                # 根据字段类型过滤候选值
                if field_type in ['buyer_name', 'seller_name']:
                    # 公司名称通常包含"公司"、"有限"等关键词
                    if any(keyword in block.text for keyword in ['公司', '有限', '集团', '企业', '店', '厂']):
                        candidates.append((block, self.calculate_distance(label_block, block)))
                
                elif field_type in ['buyer_tax_id', 'seller_tax_id']:
                    # 税号是18位的字母数字
                    if re.match(r'^[A-Z0-9]{18}$', block.text):
                        candidates.append((block, self.calculate_distance(label_block, block)))
        
        # 选择最近的候选值
        if candidates:
            candidates.sort(key=lambda x: x[1])  # 按距离排序
            return candidates[0][0].text
        
        return None
    
    def is_same_line(self, block1: TextBlock, block2: TextBlock) -> bool:
        """判断两个文本块是否在同一行"""
        return abs(block1.center_y - block2.center_y) < self.distance_threshold['same_line']
    
    def is_on_right(self, block1: TextBlock, block2: TextBlock) -> bool:
        """判断block2是否在block1右侧"""
        return block2.x0 > block1.x1 - 10  # 允许少量重叠
    
    def is_below(self, block1: TextBlock, block2: TextBlock) -> bool:
        """判断block2是否在block1下方"""
        return block2.y0 > block1.y1 - 10  # 允许少量重叠
    
    def is_nearby(self, block1: TextBlock, block2: TextBlock) -> bool:
        """判断两个文本块是否相邻"""
        horizontal_distance = abs(block1.center_x - block2.center_x)
        vertical_distance = abs(block1.center_y - block2.center_y)
        
        return (horizontal_distance < self.distance_threshold['horizontal'] and 
                vertical_distance < self.distance_threshold['vertical'])
    
    def calculate_distance(self, block1: TextBlock, block2: TextBlock) -> float:
        """计算两个文本块的距离"""
        dx = block1.center_x - block2.center_x
        dy = block1.center_y - block2.center_y
        return (dx * dx + dy * dy) ** 0.5
    
    def visualize_text_blocks(self, pdf_path: str, output_path: str = None):
        """可视化文本块布局（用于调试）"""
        doc = pymupdf.open(pdf_path)
        page = doc[0]
        
        # 获取文本块
        text_blocks = self.extract_text_blocks(page)
        
        # 在页面上绘制矩形框
        for i, block in enumerate(text_blocks):
            # 绘制边框
            rect = pymupdf.Rect(block.x0, block.y0, block.x1, block.y1)
            page.draw_rect(rect, color=(1, 0, 0), width=0.5)
            
            # 添加编号
            page.insert_text(
                pymupdf.Point(block.x0, block.y0 - 2),
                str(i),
                fontsize=8,
                color=(1, 0, 0)
            )
        
        # 保存结果
        if output_path:
            doc.save(output_path)
        else:
            output_path = pdf_path.replace('.pdf', '_annotated.pdf')
            doc.save(output_path)
        
        doc.close()
        
        # 同时保存文本块信息
        blocks_info = []
        for i, block in enumerate(text_blocks):
            blocks_info.append({
                'index': i,
                'text': block.text,
                'x0': block.x0,
                'y0': block.y0,
                'x1': block.x1,
                'y1': block.y1
            })
        
        json_path = output_path.replace('.pdf', '_blocks.json')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(blocks_info, f, ensure_ascii=False, indent=2)
        
        print(f"可视化结果保存到: {output_path}")
        print(f"文本块信息保存到: {json_path}")
        
        return output_path, json_path

def test_coordinate_extraction():
    """测试基于坐标的提取"""
    extractor = CoordinateBasedExtractor()
    
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
            
            # 提取信息
            result = extractor.extract_from_pdf(pdf_path)
            results[filename] = result
            
            print("提取结果:")
            for field, value in result.items():
                print(f"  {field}: {value}")
            
            # 可视化（可选）
            # extractor.visualize_text_blocks(pdf_path)
    
    # 保存结果
    with open("coordinate_extraction_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: coordinate_extraction_results.json")

if __name__ == "__main__":
    test_coordinate_extraction()