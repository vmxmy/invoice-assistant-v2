#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试和比较Camelot和Tabula-py的PDF表格提取效果
"""

import os
import json
import warnings
from pathlib import Path
from datetime import datetime
import camelot
import tabula
import pandas as pd
import pymupdf

# 忽略警告
warnings.filterwarnings('ignore')

class TableExtractionTester:
    """表格提取工具测试器"""
    
    def __init__(self):
        self.test_files = [
            "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
            "downloads/25439165666000019624.pdf",
            "downloads/dzfp_25432000000032177192_杭州趣链科技有限公司_20250313093318.pdf"
        ]
        
    def test_camelot(self, pdf_path: str):
        """测试Camelot表格提取"""
        try:
            # 尝试不同的提取方法
            results = {
                'lattice': None,  # 基于网格线的表格
                'stream': None    # 基于文本流的表格
            }
            
            # Lattice方法 - 适用于有边框的表格
            try:
                tables_lattice = camelot.read_pdf(pdf_path, flavor='lattice', pages='1')
                if tables_lattice.n > 0:
                    results['lattice'] = {
                        'table_count': tables_lattice.n,
                        'tables': []
                    }
                    for i, table in enumerate(tables_lattice):
                        df = table.df
                        results['lattice']['tables'].append({
                            'index': i,
                            'shape': df.shape,
                            'accuracy': table.accuracy,
                            'sample_data': df.head(3).to_dict('records') if not df.empty else []
                        })
            except Exception as e:
                results['lattice'] = {'error': str(e)}
            
            # Stream方法 - 适用于无边框的表格
            try:
                tables_stream = camelot.read_pdf(pdf_path, flavor='stream', pages='1')
                if tables_stream.n > 0:
                    results['stream'] = {
                        'table_count': tables_stream.n,
                        'tables': []
                    }
                    for i, table in enumerate(tables_stream):
                        df = table.df
                        results['stream']['tables'].append({
                            'index': i,
                            'shape': df.shape,
                            'accuracy': table.accuracy,
                            'sample_data': df.head(3).to_dict('records') if not df.empty else []
                        })
            except Exception as e:
                results['stream'] = {'error': str(e)}
                
            return results
            
        except Exception as e:
            return {'error': str(e)}
    
    def test_tabula(self, pdf_path: str):
        """测试Tabula-py表格提取"""
        try:
            results = {
                'lattice': None,
                'stream': None
            }
            
            # Lattice方法
            try:
                tables_lattice = tabula.read_pdf(
                    pdf_path, 
                    pages=1, 
                    lattice=True,
                    pandas_options={'header': None}
                )
                if tables_lattice:
                    results['lattice'] = {
                        'table_count': len(tables_lattice),
                        'tables': []
                    }
                    for i, df in enumerate(tables_lattice):
                        results['lattice']['tables'].append({
                            'index': i,
                            'shape': df.shape,
                            'sample_data': df.head(3).to_dict('records') if not df.empty else []
                        })
            except Exception as e:
                results['lattice'] = {'error': str(e)}
            
            # Stream方法
            try:
                tables_stream = tabula.read_pdf(
                    pdf_path, 
                    pages=1, 
                    stream=True,
                    pandas_options={'header': None}
                )
                if tables_stream:
                    results['stream'] = {
                        'table_count': len(tables_stream),
                        'tables': []
                    }
                    for i, df in enumerate(tables_stream):
                        results['stream']['tables'].append({
                            'index': i,
                            'shape': df.shape,
                            'sample_data': df.head(3).to_dict('records') if not df.empty else []
                        })
            except Exception as e:
                results['stream'] = {'error': str(e)}
                
            return results
            
        except Exception as e:
            return {'error': str(e)}
    
    def test_pymupdf_tables(self, pdf_path: str):
        """测试PyMuPDF的表格提取（作为对比）"""
        try:
            doc = pymupdf.open(pdf_path)
            page = doc[0]
            
            # 查找表格
            tables = page.find_tables()
            
            results = {
                'table_count': tables.tables.__len__() if hasattr(tables, 'tables') else 0,
                'tables': []
            }
            
            # 遍历找到的表格
            for i, table in enumerate(tables.tables):
                try:
                    # 提取表格数据
                    data = table.extract()
                    
                    # 转换为DataFrame格式
                    if data:
                        df = pd.DataFrame(data[1:] if len(data) > 1 else data, 
                                        columns=data[0] if data and len(data) > 1 else None)
                        results['tables'].append({
                            'index': i,
                            'shape': df.shape,
                            'bbox': list(table.bbox) if hasattr(table, 'bbox') else None,
                            'sample_data': df.head(3).to_dict('records') if not df.empty else []
                        })
                except Exception as e:
                    results['tables'].append({
                        'index': i,
                        'error': str(e)
                    })
            
            doc.close()
            return results
            
        except Exception as e:
            return {'error': str(e)}
    
    def extract_invoice_data_from_table(self, df):
        """从表格中提取发票数据"""
        invoice_data = {}
        
        # 尝试识别发票表格中的关键信息
        try:
            # 转换为字符串以便搜索
            text_data = df.astype(str)
            
            # 查找项目明细
            for i, row in text_data.iterrows():
                row_text = ' '.join(row.values)
                
                # 查找金额
                if '¥' in row_text or '￥' in row_text:
                    import re
                    amounts = re.findall(r'[¥￥]\s*([0-9,]+\.?\d*)', row_text)
                    if amounts:
                        invoice_data['amounts'] = amounts
                
                # 查找税率
                if '%' in row_text:
                    tax_rates = re.findall(r'(\d+)%', row_text)
                    if tax_rates:
                        invoice_data['tax_rates'] = tax_rates
                
                # 查找项目名称
                if any(keyword in row_text for keyword in ['餐饮', '服务', '费', '项目']):
                    invoice_data['project_info'] = row_text
                    
        except Exception as e:
            invoice_data['extract_error'] = str(e)
            
        return invoice_data
    
    def run_comparison(self):
        """运行完整的比较测试"""
        results = {}
        
        for pdf_path in self.test_files:
            if not Path(pdf_path).exists():
                continue
                
            filename = os.path.basename(pdf_path)
            print(f"\n测试文件: {filename}")
            print("="*60)
            
            file_results = {}
            
            # 测试Camelot
            print("1. 测试Camelot...")
            camelot_result = self.test_camelot(pdf_path)
            file_results['camelot'] = camelot_result
            self._print_tool_result("Camelot", camelot_result)
            
            # 测试Tabula
            print("\n2. 测试Tabula-py...")
            tabula_result = self.test_tabula(pdf_path)
            file_results['tabula'] = tabula_result
            self._print_tool_result("Tabula", tabula_result)
            
            # 测试PyMuPDF
            print("\n3. 测试PyMuPDF...")
            pymupdf_result = self.test_pymupdf_tables(pdf_path)
            file_results['pymupdf'] = pymupdf_result
            self._print_tool_result("PyMuPDF", pymupdf_result)
            
            results[filename] = file_results
        
        # 保存结果
        output_file = f"table_extraction_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)
        
        print(f"\n\n结果已保存到: {output_file}")
        
        # 总结比较
        self._print_summary(results)
        
    def _print_tool_result(self, tool_name, result):
        """打印工具结果"""
        if 'error' in result:
            print(f"  {tool_name} 错误: {result['error']}")
        else:
            if tool_name in ['Camelot', 'Tabula']:
                # 对于有多种方法的工具
                for method, data in result.items():
                    if data and 'error' not in data:
                        print(f"  {method}方法: 找到 {data.get('table_count', 0)} 个表格")
                        for table in data.get('tables', [])[:1]:  # 只显示第一个表格
                            print(f"    - 表格{table['index']}: {table['shape']} (行, 列)")
                            if tool_name == 'Camelot' and 'accuracy' in table:
                                print(f"      准确度: {table['accuracy']:.2f}")
            else:
                # PyMuPDF
                print(f"  找到 {result.get('table_count', 0)} 个表格")
                for table in result.get('tables', [])[:1]:
                    print(f"    - 表格{table['index']}: {table['shape']} (行, 列)")
                    if 'bbox' in table:
                        print(f"      位置: {table['bbox']}")
    
    def _print_summary(self, results):
        """打印总结"""
        print("\n" + "="*60)
        print("表格提取工具比较总结:")
        print("="*60)
        
        tool_stats = {
            'camelot': {'success': 0, 'tables': 0},
            'tabula': {'success': 0, 'tables': 0},
            'pymupdf': {'success': 0, 'tables': 0}
        }
        
        for filename, file_result in results.items():
            for tool, data in file_result.items():
                if 'error' not in data:
                    if tool in ['camelot', 'tabula']:
                        # 统计成功的方法
                        for method, method_data in data.items():
                            if method_data and 'error' not in method_data:
                                tool_stats[tool]['success'] += 1
                                tool_stats[tool]['tables'] += method_data.get('table_count', 0)
                    else:
                        tool_stats[tool]['success'] += 1
                        tool_stats[tool]['tables'] += data.get('table_count', 0)
        
        print("\n成功率和表格数量:")
        for tool, stats in tool_stats.items():
            print(f"  {tool.capitalize()}: 成功 {stats['success']} 次, 总共找到 {stats['tables']} 个表格")
        
        print("\n建议:")
        print("- Camelot: 适合有明确边框的表格，提供准确度评分")
        print("- Tabula: Java实现，对各种表格类型支持较好")
        print("- PyMuPDF: 原生Python实现，速度快，适合简单表格")

if __name__ == "__main__":
    tester = TableExtractionTester()
    tester.run_comparison()