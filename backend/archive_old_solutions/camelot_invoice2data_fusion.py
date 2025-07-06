#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Camelot + invoice2data 融合方案
利用Camelot的表格提取能力和invoice2data的模板匹配能力
"""

import os
import json
import camelot
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

class CamelotInvoice2DataFusion:
    """融合Camelot表格提取和invoice2data模板匹配"""
    
    def __init__(self, template_dir: str = "app/services/ocr/templates"):
        # 加载invoice2data模板
        self.templates = read_templates(template_dir)
        print(f"加载了 {len(self.templates)} 个invoice2data模板")
        
    def extract_from_pdf(self, pdf_path: str) -> Dict:
        """从PDF中提取发票信息"""
        result = {
            'file': os.path.basename(pdf_path),
            'method': 'camelot_invoice2data_fusion',
            'success': False,
            'data': {},
            'debug_info': {
                'camelot_tables': 0,
                'invoice2data_matched': False,
                'fusion_text': '',
                'table_texts': []
            }
        }
        
        try:
            # Step 1: 使用Camelot提取表格
            tables = self._extract_tables_with_camelot(pdf_path)
            result['debug_info']['camelot_tables'] = len(tables)
            
            if not tables:
                result['error'] = "Camelot未能提取到表格"
                return result
            
            # Step 2: 将表格转换为结构化文本
            structured_text = self._convert_tables_to_structured_text(tables)
            result['debug_info']['fusion_text'] = structured_text[:1000] + "..." if len(structured_text) > 1000 else structured_text
            
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
                    result['data'] = self._fallback_extraction(tables, structured_text)
                    result['success'] = bool(result['data'])
                    
            finally:
                # 清理临时文件
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    
        except Exception as e:
            result['error'] = str(e)
            
        return result
    
    def _extract_tables_with_camelot(self, pdf_path: str) -> List[pd.DataFrame]:
        """使用Camelot提取表格"""
        dfs = []
        
        # 优先使用stream模式
        try:
            tables = camelot.read_pdf(pdf_path, flavor='stream', pages='1')
            if tables.n > 0:
                for table in tables:
                    dfs.append(table.df)
        except:
            pass
        
        # 如果stream失败，尝试lattice
        if not dfs:
            try:
                tables = camelot.read_pdf(pdf_path, flavor='lattice', pages='1')
                if tables.n > 0:
                    for table in tables:
                        dfs.append(table.df)
            except:
                pass
        
        return dfs
    
    def _convert_tables_to_structured_text(self, tables: List[pd.DataFrame]) -> str:
        """将表格转换为结构化文本，保持字段关系"""
        lines = []
        
        for i, df in enumerate(tables):
            if i > 0:
                lines.append("\n---表格分隔---\n")
            
            # 方式1：保持表格的行列关系
            for idx, row in df.iterrows():
                row_text = []
                for col_idx, cell in enumerate(row):
                    cell_str = str(cell).strip()
                    if cell_str and cell_str not in ['nan', 'None', '']:
                        # 保持字段和值的关系
                        if col_idx == 0 or ':' in cell_str or '：' in cell_str:
                            row_text.append(cell_str)
                        else:
                            # 如果前一个是标签，用冒号连接
                            if row_text and not row_text[-1].endswith((':', '：')):
                                row_text[-1] += '：' + cell_str
                            else:
                                row_text.append(cell_str)
                
                if row_text:
                    lines.append(' '.join(row_text))
            
            # 方式2：将整个表格展平为文本（作为补充）
            lines.append("\n---展平文本---")
            all_text = ' '.join(df.astype(str).values.flatten())
            lines.append(all_text)
        
        return '\n'.join(lines)
    
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
        
        # 特殊处理buyer_name（可能需要从buyer_tax_id推断）
        if 'buyer_name' not in mapped_result and 'buyer_tax_id' in invoice2data_result:
            # 从其他字段或表格文本中提取
            pass
        
        # 保留其他有用字段
        for key, value in invoice2data_result.items():
            if key not in ['template_name', 'template_path', 'desc', 'currency']:
                if key not in [k for k, v in field_mapping.items()]:
                    mapped_result[key] = value
        
        return mapped_result
    
    def _fallback_extraction(self, tables: List[pd.DataFrame], text: str) -> Dict:
        """备用提取方法"""
        import re
        extracted = {}
        
        # 从文本中提取基础字段
        # 发票号码
        invoice_pattern = r'(\d{20})'
        match = re.search(invoice_pattern, text)
        if match:
            extracted['invoice_number'] = match.group(1)
        
        # 开票日期
        date_pattern = r'(\d{4}年\d{1,2}月\d{1,2}日)'
        match = re.search(date_pattern, text)
        if match:
            extracted['invoice_date'] = match.group(1)
        
        # 金额
        amount_patterns = [
            r'价税合计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'[¥￥]\s*([0-9,]+\.?\d*).*?价税合计',
            r'合计.*?[¥￥]\s*([0-9,]+\.?\d*)'
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
            print(f"  Camelot表格数: {result['debug_info']['camelot_tables']}")
            print(f"  invoice2data匹配: {result['debug_info']['invoice2data_matched']}")
            
            if result['debug_info']['invoice2data_matched']:
                print(f"  匹配模板: {result['debug_info'].get('matched_template', 'unknown')}")
            
            print("\n提取的数据:")
            for field, value in result['data'].items():
                if field not in ['template_name', 'template_path']:
                    print(f"  {field}: {value}")
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
            'camelot_extracted': 0,
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
                
                if result['debug_info']['camelot_tables'] > 0:
                    stats['camelot_extracted'] += 1
                
                if result['debug_info']['invoice2data_matched']:
                    stats['invoice2data_matched'] += 1
                
                # 统计字段提取情况
                for field in target_fields:
                    if field in result['data'] and result['data'][field]:
                        stats['field_counts'][field] += 1
        
        # 打印统计
        self.print_statistics(stats)
        
        # 保存结果（处理datetime序列化问题）
        output_file = f"camelot_invoice2data_fusion_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # 转换datetime对象为字符串
        serializable_results = []
        for result in results:
            new_result = result.copy()
            if 'data' in new_result and isinstance(new_result['data'], dict):
                for key, value in new_result['data'].items():
                    if hasattr(value, 'strftime'):
                        new_result['data'][key] = value.strftime('%Y-%m-%d %H:%M:%S')
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
        print("Camelot + invoice2data 融合方案统计:")
        print("-"*60)
        
        success_rate = stats['success'] / stats['total'] * 100
        camelot_rate = stats['camelot_extracted'] / stats['total'] * 100
        invoice2data_rate = stats['invoice2data_matched'] / stats['total'] * 100
        
        print(f"总体成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        print(f"Camelot表格提取率: {stats['camelot_extracted']}/{stats['total']} ({camelot_rate:.1f}%)")
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
    fusion = CamelotInvoice2DataFusion(template_dir="app/services/ocr/templates")
    
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