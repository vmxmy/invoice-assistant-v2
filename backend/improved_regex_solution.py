#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
改进的正则表达式解决方案 - 处理PDF垂直布局文本提取问题
"""

import re
import pymupdf
import json
from pathlib import Path

class ImprovedTextExtractor:
    """改进的文本提取器，处理垂直布局问题"""
    
    def __init__(self):
        self.patterns = {
            # 改进的正则模式，支持跨行匹配
            'buyer_name_multiline': [
                # 模式1: 火车票格式，字段名和值在相邻行
                r'购买方名称[:：]\s*\n*\s*([^\n]+)',
                # 模式2: 标准发票格式，考虑垂直字符分离
                r'名称[:：]\s*\n*\s*([^\n]+?)(?=\s*\n|\s*$)',
                # 模式3: 原始单行模式作为后备
                r'购.*?名\s*称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销|$)'
            ],
            'seller_name_multiline': [
                r'销售方名称[:：]\s*\n*\s*([^\n]+)',
                r'销.*?名\s*称[：:]\s*\n*\s*([^\n]+?)(?=\n|$)',
                r'销.*?名\s*称[：:]\s*([^\n]+?)(?=\n|$)'
            ],
            'buyer_tax_id_multiline': [
                # 火车票格式：税号直接在字段名后
                r'统一社会信用代码[:：]\s*([A-Z0-9]{18})',
                # 标准发票格式：考虑跨行
                r'购.*?统一社会信用代码/纳税人识别号[：:]\s*\n*\s*([A-Z0-9]{18})',
                # 原始模式作为后备
                r'购.*?统一社会信用代码/纳税人识别号[：:]\s*([A-Z0-9]{18})'
            ]
        }
    
    def extract_with_coordinate_based_approach(self, pdf_path):
        """基于坐标的提取方法"""
        try:
            doc = pymupdf.open(pdf_path)
            page = doc[0]
            
            # 提取带坐标的文本块
            text_blocks = page.get_text("dict")
            
            # 构建文本行结构
            text_lines = []
            for block in text_blocks["blocks"]:
                if "lines" in block:
                    for line in block["lines"]:
                        line_text = ""
                        line_bbox = line["bbox"]
                        for span in line["spans"]:
                            line_text += span["text"]
                        if line_text.strip():
                            text_lines.append({
                                "text": line_text.strip(),
                                "bbox": line_bbox,
                                "y": line_bbox[1],
                                "x": line_bbox[0]
                            })
            
            # 按y坐标排序
            text_lines.sort(key=lambda x: x["y"])
            
            doc.close()
            
            # 基于坐标的字段提取
            result = self.extract_fields_by_coordinates(text_lines)
            
            return result
            
        except Exception as e:
            print(f"坐标提取失败 {pdf_path}: {e}")
            return None
    
    def extract_fields_by_coordinates(self, text_lines):
        """基于坐标位置提取字段"""
        result = {}
        
        # 找到购买方信息区域
        buyer_start_idx = None
        seller_start_idx = None
        
        for i, line in enumerate(text_lines):
            text = line["text"]
            # 查找购买方区域标识
            if "购买方" in text or ("购" in text and i < len(text_lines) - 1 and "买" in text_lines[i+1]["text"]):
                buyer_start_idx = i
            elif "销售方" in text or ("销" in text and i < len(text_lines) - 1 and "售" in text_lines[i+1]["text"]):
                seller_start_idx = i
        
        # 在购买方区域查找名称和税号
        if buyer_start_idx is not None:
            buyer_fields = self.extract_buyer_fields_in_region(text_lines, buyer_start_idx, seller_start_idx)
            result.update(buyer_fields)
        
        # 在销售方区域查找名称和税号
        if seller_start_idx is not None:
            seller_fields = self.extract_seller_fields_in_region(text_lines, seller_start_idx)
            result.update(seller_fields)
        
        return result
    
    def extract_buyer_fields_in_region(self, text_lines, start_idx, end_idx):
        """在购买方区域提取字段"""
        result = {}
        
        # 确定搜索范围
        end_idx = end_idx if end_idx else len(text_lines)
        region_lines = text_lines[start_idx:end_idx]
        
        for i, line in enumerate(region_lines):
            text = line["text"]
            
            # 查找名称字段
            if "名称" in text and ("：" in text or ":" in text):
                # 在当前行查找值
                name_match = re.search(r'名称[:：]\s*([^\s\n]+.*?)(?=\s*$)', text)
                if name_match:
                    result["buyer_name"] = name_match.group(1).strip()
                else:
                    # 在下一行查找值
                    if i + 1 < len(region_lines):
                        next_line = region_lines[i + 1]["text"]
                        # 确保下一行不是另一个字段标签
                        if not re.search(r'[:：]', next_line) and next_line.strip():
                            result["buyer_name"] = next_line.strip()
            
            # 查找税号字段 
            if ("统一社会信用代码" in text or "纳税人识别号" in text) and ("：" in text or ":" in text):
                # 在当前行查找18位税号
                tax_match = re.search(r'([A-Z0-9]{18})', text)
                if tax_match:
                    result["buyer_tax_id"] = tax_match.group(1)
                else:
                    # 在下一行查找
                    if i + 1 < len(region_lines):
                        next_line = region_lines[i + 1]["text"]
                        tax_match = re.search(r'([A-Z0-9]{18})', next_line)
                        if tax_match:
                            result["buyer_tax_id"] = tax_match.group(1)
        
        return result
    
    def extract_seller_fields_in_region(self, text_lines, start_idx):
        """在销售方区域提取字段"""
        result = {}
        
        # 确定搜索范围（到文档结尾）
        region_lines = text_lines[start_idx:]
        
        for i, line in enumerate(region_lines):
            text = line["text"]
            
            # 查找名称字段
            if "名称" in text and ("：" in text or ":" in text):
                # 在当前行查找值
                name_match = re.search(r'名称[:：]\s*([^\s\n]+.*?)(?=\s*$)', text)
                if name_match:
                    result["seller_name"] = name_match.group(1).strip()
                else:
                    # 在下一行查找值
                    if i + 1 < len(region_lines):
                        next_line = region_lines[i + 1]["text"]
                        if not re.search(r'[:：]', next_line) and next_line.strip():
                            result["seller_name"] = next_line.strip()
            
            # 查找税号字段
            if ("统一社会信用代码" in text or "纳税人识别号" in text) and ("：" in text or ":" in text):
                tax_match = re.search(r'([A-Z0-9]{18})', text)
                if tax_match:
                    result["seller_tax_id"] = tax_match.group(1)
                else:
                    if i + 1 < len(region_lines):
                        next_line = region_lines[i + 1]["text"]
                        tax_match = re.search(r'([A-Z0-9]{18})', next_line)
                        if tax_match:
                            result["seller_tax_id"] = tax_match.group(1)
        
        return result
    
    def extract_with_multiline_regex(self, pdf_path):
        """使用改进的多行正则表达式提取"""
        try:
            doc = pymupdf.open(pdf_path)
            page = doc[0]
            
            # 提取文本，保持换行符
            text = page.get_text()
            
            doc.close()
            
            result = {}
            
            # 使用改进的正则模式
            for field, patterns in self.patterns.items():
                for pattern in patterns:
                    match = re.search(pattern, text, re.DOTALL | re.MULTILINE)
                    if match:
                        result[field.replace('_multiline', '')] = match.group(1).strip()
                        break
            
            return result
            
        except Exception as e:
            print(f"多行正则提取失败 {pdf_path}: {e}")
            return None

def test_improved_extraction():
    """测试改进的提取方法"""
    extractor = ImprovedTextExtractor()
    
    # 测试文件
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
            
            # 方法1: 基于坐标的提取
            coord_result = extractor.extract_with_coordinate_based_approach(pdf_path)
            print("坐标提取结果:", coord_result)
            
            # 方法2: 多行正则表达式
            regex_result = extractor.extract_with_multiline_regex(pdf_path)
            print("多行正则结果:", regex_result)
            
            results[filename] = {
                "coordinate_based": coord_result,
                "multiline_regex": regex_result
            }
    
    # 保存结果
    with open("improved_extraction_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: improved_extraction_results.json")

if __name__ == "__main__":
    test_improved_extraction()