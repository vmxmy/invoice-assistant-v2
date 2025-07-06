#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
使用Camelot测试所有PDF发票的表格提取
"""

import os
import json
import camelot
import pandas as pd
from pathlib import Path
from datetime import datetime
import re

class CamelotInvoiceExtractor:
    """使用Camelot提取发票表格信息"""
    
    def __init__(self):
        self.results = {}
        self.stats = {
            'total_files': 0,
            'success_files': 0,
            'tables_found': 0,
            'invoice_data_extracted': 0
        }
    
    def extract_invoice_from_table(self, df):
        """从表格DataFrame中提取发票信息"""
        invoice_data = {}
        
        # 将DataFrame转换为文本进行搜索
        all_text = ' '.join(df.astype(str).values.flatten())
        
        # 提取发票号码
        invoice_pattern = r'(\d{20})'
        matches = re.findall(invoice_pattern, all_text)
        if matches:
            invoice_data['invoice_number'] = matches[0]
        
        # 提取日期
        date_pattern = r'(\d{4}年\d{1,2}月\d{1,2}日)'
        dates = re.findall(date_pattern, all_text)
        if dates:
            invoice_data['invoice_date'] = dates[0]
        
        # 提取金额
        amount_pattern = r'[¥￥]\s*([0-9,]+\.?\d*)'
        amounts = re.findall(amount_pattern, all_text)
        if amounts:
            invoice_data['amounts'] = amounts
        
        # 提取税率
        tax_pattern = r'(\d+)%'
        tax_rates = re.findall(tax_pattern, all_text)
        if tax_rates:
            invoice_data['tax_rates'] = tax_rates
        
        # 提取公司名称
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心))'
        companies = re.findall(company_pattern, all_text)
        if companies:
            invoice_data['companies'] = list(set(companies))  # 去重
        
        # 提取项目信息
        for i, row in df.iterrows():
            row_text = ' '.join(str(cell) for cell in row if cell)
            if any(keyword in row_text for keyword in ['餐饮', '服务', '费', '项目']):
                if 'project_info' not in invoice_data:
                    invoice_data['project_info'] = []
                invoice_data['project_info'].append(row_text)
        
        return invoice_data
    
    def process_pdf(self, pdf_path):
        """处理单个PDF文件"""
        filename = os.path.basename(pdf_path)
        result = {
            'filename': filename,
            'tables': [],
            'invoice_data': {},
            'success': False
        }
        
        try:
            # 优先使用stream方法（对发票更有效）
            tables = camelot.read_pdf(pdf_path, flavor='stream', pages='1')
            
            if tables.n == 0:
                # 如果stream没找到，尝试lattice
                tables = camelot.read_pdf(pdf_path, flavor='lattice', pages='1')
            
            result['table_count'] = tables.n
            result['success'] = tables.n > 0
            
            if tables.n > 0:
                self.stats['tables_found'] += tables.n
                
                # 处理每个表格
                for i, table in enumerate(tables):
                    df = table.df
                    
                    table_info = {
                        'index': i,
                        'shape': df.shape,
                        'accuracy': table.accuracy
                    }
                    
                    # 提取发票信息
                    invoice_data = self.extract_invoice_from_table(df)
                    if invoice_data:
                        table_info['extracted_data'] = invoice_data
                        # 合并到总的发票数据
                        for key, value in invoice_data.items():
                            if key not in result['invoice_data']:
                                result['invoice_data'][key] = value
                    
                    result['tables'].append(table_info)
                
                if result['invoice_data']:
                    self.stats['invoice_data_extracted'] += 1
                    
        except Exception as e:
            result['error'] = str(e)
            result['success'] = False
        
        return result
    
    def test_all_pdfs(self):
        """测试所有PDF文件"""
        # 获取所有PDF文件
        pdf_files = []
        for root, dirs, files in os.walk("downloads"):
            for file in files:
                if file.endswith('.pdf') and not file.endswith('_annotated.pdf'):
                    pdf_files.append(os.path.join(root, file))
        
        self.stats['total_files'] = len(pdf_files)
        print(f"找到 {len(pdf_files)} 个PDF文件")
        print("="*80)
        
        # 处理每个文件
        for i, pdf_path in enumerate(pdf_files):
            relative_path = os.path.relpath(pdf_path, 'downloads')
            print(f"\n[{i+1}/{len(pdf_files)}] 处理: {relative_path}")
            
            result = self.process_pdf(pdf_path)
            
            if result['success']:
                self.stats['success_files'] += 1
                print(f"  ✓ 找到 {result['table_count']} 个表格")
                
                if result['invoice_data']:
                    print(f"  → 提取到发票信息:")
                    for key, value in result['invoice_data'].items():
                        if isinstance(value, list) and len(value) > 3:
                            print(f"    {key}: {value[:3]}... (共{len(value)}项)")
                        else:
                            print(f"    {key}: {value}")
            else:
                print(f"  ✗ 未找到表格")
                if 'error' in result:
                    print(f"    错误: {result['error']}")
            
            self.results[os.path.basename(pdf_path)] = result
        
        # 显示统计
        self.print_statistics()
        
        # 保存结果
        self.save_results()
    
    def print_statistics(self):
        """打印统计信息"""
        print("\n" + "="*80)
        print("Camelot表格提取统计:")
        print("-"*80)
        
        success_rate = self.stats['success_files'] / self.stats['total_files'] * 100
        print(f"成功率: {self.stats['success_files']}/{self.stats['total_files']} ({success_rate:.1f}%)")
        print(f"总共找到表格: {self.stats['tables_found']} 个")
        print(f"成功提取发票数据: {self.stats['invoice_data_extracted']} 个文件")
        
        # 分析提取的字段
        field_stats = {}
        for filename, result in self.results.items():
            if result['invoice_data']:
                for field in result['invoice_data']:
                    field_stats[field] = field_stats.get(field, 0) + 1
        
        print("\n字段提取统计:")
        for field, count in sorted(field_stats.items(), key=lambda x: x[1], reverse=True):
            percentage = count / self.stats['total_files'] * 100
            print(f"  {field:<20}: {count:>3} 个文件 ({percentage:>5.1f}%)")
    
    def save_results(self):
        """保存结果到JSON文件"""
        output_file = f"camelot_invoice_extraction_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'statistics': self.stats,
                'results': self.results
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_file}")

if __name__ == "__main__":
    extractor = CamelotInvoiceExtractor()
    extractor.test_all_pdfs()