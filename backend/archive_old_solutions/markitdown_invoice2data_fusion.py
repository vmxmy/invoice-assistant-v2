#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
MarkItDown + invoice2data 融合方案
利用MarkItDown的文档转换能力和invoice2data的模板匹配能力
"""

import os
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from markitdown import MarkItDown
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

class MarkItDownInvoice2DataFusion:
    """融合MarkItDown转换和invoice2data模板匹配"""
    
    def __init__(self, template_dir: str = "app/services/ocr/templates"):
        # 初始化MarkItDown
        self.md = MarkItDown()
        
        # 加载invoice2data模板
        self.templates = read_templates(template_dir)
        print(f"加载了 {len(self.templates)} 个invoice2data模板")
        
    def extract_from_pdf(self, pdf_path: str) -> Dict:
        """从PDF中提取发票信息"""
        result = {
            'file': os.path.basename(pdf_path),
            'method': 'markitdown_invoice2data_fusion',
            'success': False,
            'data': {},
            'debug_info': {
                'markdown_length': 0,
                'invoice2data_matched': False,
                'markdown_preview': '',
                'structured_text': ''
            }
        }
        
        try:
            # Step 1: 使用MarkItDown转换PDF到Markdown
            conversion_result = self.md.convert(pdf_path)
            markdown_text = conversion_result.text_content
            
            result['debug_info']['markdown_length'] = len(markdown_text)
            result['debug_info']['markdown_preview'] = markdown_text[:500] + "..." if len(markdown_text) > 500 else markdown_text
            
            if not markdown_text:
                result['error'] = "MarkItDown未能提取到文本"
                return result
            
            # Step 2: 将Markdown转换为结构化文本
            structured_text = self._convert_markdown_to_structured_text(markdown_text)
            result['debug_info']['structured_text'] = structured_text[:500] + "..." if len(structured_text) > 500 else structured_text
            
            # Step 3: 创建临时文本文件供invoice2data处理
            temp_file = self._create_temp_text_file(structured_text, pdf_path)
            
            try:
                # Step 4: 使用invoice2data处理结构化文本
                invoice2data_result = extract_data(temp_file, templates=self.templates)
                
                if invoice2data_result:
                    result['success'] = True
                    # 映射invoice2data字段到标准字段
                    result['data'] = self._map_invoice2data_fields(invoice2data_result)
                    result['debug_info']['invoice2data_matched'] = True
                    result['debug_info']['matched_template'] = invoice2data_result.get('template_name', 'unknown')
                else:
                    # 如果invoice2data失败，使用备用提取方法
                    result['data'] = self._fallback_extraction(markdown_text)
                    result['success'] = bool(result['data'])
                    
            finally:
                # 清理临时文件
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    
        except Exception as e:
            result['error'] = str(e)
            
        return result
    
    def _convert_markdown_to_structured_text(self, markdown: str) -> str:
        """将Markdown转换为结构化文本，优化invoice2data匹配"""
        lines = markdown.split('\n')
        structured_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # 跳过空行
            if not line:
                i += 1
                continue
            
            # 检查是否是字段标签行
            if any(keyword in line for keyword in ['名称', '号码', '日期', '税号', '信息', '方']):
                # 查找下一个非空行作为值
                j = i + 1
                while j < len(lines) and not lines[j].strip():
                    j += 1
                
                if j < len(lines):
                    # 合并标签和值
                    label = line.rstrip('：:')
                    value = lines[j].strip()
                    structured_lines.append(f"{label}：{value}")
                    i = j + 1
                else:
                    structured_lines.append(line)
                    i += 1
            else:
                structured_lines.append(line)
                i += 1
        
        # 额外处理：将分散的买方卖方信息合并
        result_text = '\n'.join(structured_lines)
        
        # 处理垂直排列的文字
        result_text = result_text.replace('购\n买\n方', '购买方')
        result_text = result_text.replace('销\n售\n方', '销售方')
        result_text = result_text.replace('信\n息', '信息')
        
        return result_text
    
    def _create_temp_text_file(self, text: str, original_path: str) -> str:
        """创建临时文本文件"""
        base_name = os.path.splitext(os.path.basename(original_path))[0]
        temp_file = f"temp_{base_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.txt"
        
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(text)
        
        return temp_file
    
    def _map_invoice2data_fields(self, invoice2data_result: Dict) -> Dict:
        """映射invoice2data字段到标准字段名"""
        field_mapping = {
            'date': 'invoice_date',
            'amount': 'total_amount',
            'issuer': 'seller_name',
            'project_name': 'project_name',
            'buyer_name': 'buyer_name',
            'seller_name': 'seller_name',
            'invoice_number': 'invoice_number'
        }
        
        mapped_result = {}
        
        # 直接映射字段
        for i2d_field, standard_field in field_mapping.items():
            if i2d_field in invoice2data_result:
                value = invoice2data_result[i2d_field]
                # 处理datetime对象
                if hasattr(value, 'strftime'):
                    value = value.strftime('%Y年%m月%d日')
                # 处理列表，取第一个元素
                elif isinstance(value, list) and value:
                    value = value[0]
                mapped_result[standard_field] = value
        
        # 特殊处理：如果issuer存在但seller_name不存在，使用issuer
        if 'issuer' in invoice2data_result and 'seller_name' not in mapped_result:
            mapped_result['seller_name'] = invoice2data_result['issuer']
        
        return mapped_result
    
    def _fallback_extraction(self, text: str) -> Dict:
        """备用提取方法"""
        import re
        extracted = {}
        
        # 发票号码
        invoice_patterns = [
            r'发票号码[：:]*\s*(\d{20})',
            r'号码[：:]*\s*(\d{20})',
            r'\b(\d{20})\b'
        ]
        for pattern in invoice_patterns:
            match = re.search(pattern, text)
            if match:
                extracted['invoice_number'] = match.group(1)
                break
        
        # 开票日期
        date_patterns = [
            r'开票日期[：:]*\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'日期[：:]*\s*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'(\d{4}年\d{1,2}月\d{1,2}日)'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text)
            if match:
                extracted['invoice_date'] = match.group(1)
                break
        
        # 金额
        amount_patterns = [
            r'价税合计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'合计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'[¥￥]\s*([0-9,]+\.?\d*).*?价税合计'
        ]
        for pattern in amount_patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                extracted['total_amount'] = match.group(1)
                break
        
        # 公司名称
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心)[\u4e00-\u9fa5]*)'
        companies = re.findall(company_pattern, text)
        if companies:
            unique_companies = []
            for comp in companies:
                if len(comp) > 3 and '统一社' not in comp and comp not in unique_companies:
                    unique_companies.append(comp)
            
            if unique_companies:
                if len(unique_companies) >= 1:
                    extracted['buyer_name'] = unique_companies[0]
                if len(unique_companies) >= 2:
                    extracted['seller_name'] = unique_companies[1]
        
        return extracted
    
    def test_single_file(self, pdf_path: str):
        """测试单个文件"""
        print(f"\n{'='*60}")
        print(f"测试文件: {os.path.basename(pdf_path)}")
        print('='*60)
        
        result = self.extract_from_pdf(pdf_path)
        
        if result['success']:
            print(f"✓ 成功提取")
            print(f"  Markdown长度: {result['debug_info']['markdown_length']}")
            print(f"  invoice2data匹配: {result['debug_info']['invoice2data_matched']}")
            
            if result['debug_info']['invoice2data_matched']:
                print(f"  匹配模板: {result['debug_info'].get('matched_template', 'unknown')}")
            
            print("\n提取的数据:")
            for field, value in result['data'].items():
                print(f"  {field}: {value}")
                
            print("\n结构化文本预览:")
            print("-"*40)
            print(result['debug_info']['structured_text'][:300] + "...")
        else:
            print(f"✗ 提取失败")
            if 'error' in result:
                print(f"  错误: {result['error']}")
        
        return result
    
    def test_all_pdfs(self):
        """测试所有PDF文件"""
        # 获取所有PDF文件
        pdf_files = []
        for root, dirs, files in os.walk("downloads"):
            for file in files:
                if file.endswith('.pdf') and not file.endswith('_annotated.pdf'):
                    pdf_files.append(os.path.join(root, file))
        
        print(f"\n找到 {len(pdf_files)} 个PDF文件")
        
        results = []
        stats = {
            'total': len(pdf_files),
            'success': 0,
            'markdown_converted': 0,
            'invoice2data_matched': 0,
            'field_counts': {}
        }
        
        # 定义要统计的字段
        target_fields = ['invoice_number', 'invoice_date', 'total_amount', 
                        'buyer_name', 'seller_name', 'project_name']
        for field in target_fields:
            stats['field_counts'][field] = 0
        
        # 处理每个文件
        for i, pdf_path in enumerate(pdf_files):
            print(f"\n[{i+1}/{len(pdf_files)}] 处理: {os.path.relpath(pdf_path, 'downloads')}")
            
            result = self.extract_from_pdf(pdf_path)
            results.append(result)
            
            if result['success']:
                stats['success'] += 1
                
                if result['debug_info']['markdown_length'] > 0:
                    stats['markdown_converted'] += 1
                
                if result['debug_info']['invoice2data_matched']:
                    stats['invoice2data_matched'] += 1
                
                # 统计字段提取情况
                for field in target_fields:
                    if field in result['data'] and result['data'][field]:
                        stats['field_counts'][field] += 1
        
        # 打印统计
        self.print_statistics(stats)
        
        # 保存结果
        output_file = f"markitdown_invoice2data_fusion_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # 转换datetime对象为字符串
        serializable_results = []
        for result in results:
            new_result = result.copy()
            if 'data' in new_result and isinstance(new_result['data'], dict):
                new_data = {}
                for key, value in new_result['data'].items():
                    if hasattr(value, 'strftime'):
                        new_data[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        new_data[key] = value
                new_result['data'] = new_data
            serializable_results.append(new_result)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'statistics': stats,
                'results': serializable_results
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_file}")
        
        return results, stats
    
    def print_statistics(self, stats):
        """打印统计信息"""
        print("\n" + "="*60)
        print("MarkItDown + invoice2data 融合方案统计:")
        print("-"*60)
        
        success_rate = stats['success'] / stats['total'] * 100
        markdown_rate = stats['markdown_converted'] / stats['total'] * 100
        invoice2data_rate = stats['invoice2data_matched'] / stats['total'] * 100
        
        print(f"总体成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        print(f"MarkItDown转换率: {stats['markdown_converted']}/{stats['total']} ({markdown_rate:.1f}%)")
        print(f"invoice2data模板匹配率: {stats['invoice2data_matched']}/{stats['total']} ({invoice2data_rate:.1f}%)")
        
        print("\n字段提取成功率:")
        field_names = {
            'invoice_number': '发票号码',
            'invoice_date': '开票日期',
            'total_amount': '含税金额',
            'buyer_name': '采购方',
            'seller_name': '销售方',
            'project_name': '项目名称'
        }
        
        for field, count in stats['field_counts'].items():
            percentage = count / stats['total'] * 100
            field_name = field_names.get(field, field)
            print(f"  {field_name:<10}: {count:>3}/{stats['total']} ({percentage:>5.1f}%)")

if __name__ == "__main__":
    # 使用正确的模板路径
    fusion = MarkItDownInvoice2DataFusion(template_dir="app/services/ocr/templates")
    
    # 测试单个文件
    test_files = [
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
        "downloads/25439165666000019624.pdf"
    ]
    
    for pdf_path in test_files:
        if Path(pdf_path).exists():
            fusion.test_single_file(pdf_path)
    
    # 测试所有文件
    print("\n" + "="*80)
    print("开始测试所有PDF文件...")
    print("="*80)
    
    fusion.test_all_pdfs()