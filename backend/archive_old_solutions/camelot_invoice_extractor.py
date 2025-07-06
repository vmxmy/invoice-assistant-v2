#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
优化的Camelot发票信息提取器
专门提取：开票日期、发票号码、含税金额、销售方、采购方、项目信息
"""

import os
import json
import camelot
import pandas as pd
from pathlib import Path
from datetime import datetime
import re
from typing import Dict, List, Optional

class CamelotInvoiceExtractor:
    """使用Camelot提取发票关键信息"""
    
    def __init__(self):
        # 定义要提取的关键字段
        self.target_fields = {
            'invoice_date': '开票日期',
            'invoice_number': '发票号码', 
            'total_amount': '含税金额',
            'seller_name': '销售方',
            'buyer_name': '采购方',
            'items': '项目信息'
        }
        
    def extract_from_pdf(self, pdf_path: str) -> Dict:
        """从PDF中提取发票信息"""
        result = {
            'file': os.path.basename(pdf_path),
            'success': False,
            'data': {},
            'debug_info': []
        }
        
        try:
            # 首先尝试stream方法（对发票更有效）
            tables = camelot.read_pdf(pdf_path, flavor='stream', pages='1')
            
            if tables.n == 0:
                # 如果stream没找到，尝试lattice
                tables = camelot.read_pdf(pdf_path, flavor='lattice', pages='1')
            
            if tables.n > 0:
                result['success'] = True
                result['table_count'] = tables.n
                
                # 处理每个表格
                for i, table in enumerate(tables):
                    df = table.df
                    result['debug_info'].append({
                        'table_index': i,
                        'shape': df.shape,
                        'accuracy': table.accuracy
                    })
                    
                    # 提取信息
                    extracted = self.extract_invoice_fields(df)
                    
                    # 合并提取的数据
                    for key, value in extracted.items():
                        if value:
                            if key == 'items' and key in result['data']:
                                # 合并项目信息
                                result['data'][key].extend(value)
                            else:
                                result['data'][key] = value
                
        except Exception as e:
            result['error'] = str(e)
            
        return result
    
    def extract_invoice_fields(self, df: pd.DataFrame) -> Dict:
        """从DataFrame中提取发票字段"""
        extracted = {}
        
        # 将整个表格转为文本便于搜索
        all_text = ' '.join(df.astype(str).values.flatten())
        
        # 1. 提取发票号码
        invoice_pattern = r'发票号码[：:]*\s*(\d{20})'
        match = re.search(invoice_pattern, all_text)
        if match:
            extracted['invoice_number'] = match.group(1)
        else:
            # 尝试单独的20位数字
            numbers = re.findall(r'\b(\d{20})\b', all_text)
            if numbers:
                extracted['invoice_number'] = numbers[0]
        
        # 2. 提取开票日期
        date_pattern = r'开票日期[：:]*\s*(\d{4}年\d{1,2}月\d{1,2}日)'
        match = re.search(date_pattern, all_text)
        if match:
            extracted['invoice_date'] = match.group(1)
        else:
            # 尝试查找任何日期格式
            dates = re.findall(r'(\d{4}年\d{1,2}月\d{1,2}日)', all_text)
            if dates:
                extracted['invoice_date'] = dates[0]
        
        # 3. 提取含税金额（价税合计）
        extracted['total_amount'] = self.extract_total_amount(df, all_text)
        
        # 4. 提取销售方和采购方
        buyer_seller = self.extract_buyer_seller(df)
        extracted.update(buyer_seller)
        
        # 5. 提取项目信息
        items = self.extract_items(df)
        if items:
            extracted['items'] = items
            
        return extracted
    
    def extract_total_amount(self, df: pd.DataFrame, all_text: str) -> Optional[str]:
        """提取含税总金额"""
        # 查找价税合计
        patterns = [
            r'价税合计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'合计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'[¥￥]\s*([0-9,]+\.?\d*).*?价税合计'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, all_text, re.DOTALL)
            if match:
                return match.group(1)
        
        # 查找包含价税合计的行
        for i, row in df.iterrows():
            row_text = ' '.join(str(cell) for cell in row if cell)
            if '价税合计' in row_text or '合计' in row_text:
                # 在同一行或下一行查找金额
                amounts = re.findall(r'[¥￥]\s*([0-9,]+\.?\d*)', row_text)
                if amounts:
                    # 返回最大的金额（通常是总额）
                    return max(amounts, key=lambda x: float(x.replace(',', '')))
                    
                # 检查下一行
                if i < len(df) - 1:
                    next_row = ' '.join(str(cell) for cell in df.iloc[i+1] if cell)
                    amounts = re.findall(r'[¥￥]\s*([0-9,]+\.?\d*)', next_row)
                    if amounts:
                        return max(amounts, key=lambda x: float(x.replace(',', '')))
        
        return None
    
    def extract_buyer_seller(self, df: pd.DataFrame) -> Dict:
        """提取购买方和销售方信息"""
        result = {}
        
        # 遍历每个单元格
        for i, row in df.iterrows():
            for j, cell in enumerate(row):
                cell_str = str(cell).strip()
                
                # 检查是否包含购买方/销售方标识
                if '购买方' in cell_str or '买方' in cell_str or '购方' in cell_str:
                    # 查找相关的公司名称
                    buyer_name = self.find_company_name_nearby(df, i, j, 'buyer')
                    if buyer_name:
                        result['buyer_name'] = buyer_name
                        
                elif '销售方' in cell_str or '卖方' in cell_str or '销方' in cell_str:
                    # 查找相关的公司名称
                    seller_name = self.find_company_name_nearby(df, i, j, 'seller')
                    if seller_name:
                        result['seller_name'] = seller_name
        
        # 如果没找到，尝试从整个表格中提取
        if 'buyer_name' not in result or 'seller_name' not in result:
            all_companies = self.extract_all_companies(df)
            
            # 基于位置判断买方卖方
            if len(all_companies) >= 2:
                # 通常买方在左，卖方在右
                if 'buyer_name' not in result:
                    result['buyer_name'] = all_companies[0]
                if 'seller_name' not in result:
                    result['seller_name'] = all_companies[1]
                    
        return result
    
    def find_company_name_nearby(self, df: pd.DataFrame, row: int, col: int, party_type: str) -> Optional[str]:
        """在指定位置附近查找公司名称"""
        # 搜索范围
        search_range = 3
        
        # 公司名称模式
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心)[\u4e00-\u9fa5]*)'
        
        # 搜索周围的单元格
        for dr in range(-search_range, search_range + 1):
            for dc in range(-search_range, search_range + 1):
                r, c = row + dr, col + dc
                if 0 <= r < len(df) and 0 <= c < len(df.columns):
                    cell_text = str(df.iloc[r, c])
                    
                    # 查找公司名称
                    matches = re.findall(company_pattern, cell_text)
                    for match in matches:
                        # 过滤掉"统一社"这样的误匹配
                        if len(match) > 3 and '统一社' not in match:
                            return match
        
        return None
    
    def extract_all_companies(self, df: pd.DataFrame) -> List[str]:
        """提取所有公司名称"""
        companies = []
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心)[\u4e00-\u9fa5]*)'
        
        for i, row in df.iterrows():
            for j, cell in enumerate(row):
                cell_text = str(cell)
                matches = re.findall(company_pattern, cell_text)
                for match in matches:
                    if len(match) > 3 and '统一社' not in match and match not in companies:
                        companies.append(match)
        
        return companies
    
    def extract_items(self, df: pd.DataFrame) -> List[Dict]:
        """提取项目信息"""
        items = []
        
        # 查找项目行的标识
        item_keywords = ['项目', '名称', '品名', '货物', '服务', '餐饮', '住宿', '交通']
        
        for i, row in df.iterrows():
            row_text = ' '.join(str(cell) for cell in row if cell)
            
            # 检查是否是项目行
            if any(keyword in row_text for keyword in item_keywords):
                # 尝试提取项目信息
                item_info = self.parse_item_row(row)
                if item_info:
                    items.append(item_info)
        
        return items
    
    def parse_item_row(self, row: pd.Series) -> Optional[Dict]:
        """解析项目行"""
        item = {}
        
        # 将行转换为列表
        cells = [str(cell).strip() for cell in row if str(cell).strip()]
        
        for cell in cells:
            # 项目名称
            if any(keyword in cell for keyword in ['餐饮', '服务', '费', '住宿', '交通']):
                if 'name' not in item:
                    item['name'] = cell.replace('*', '')
            
            # 金额
            if re.match(r'^[0-9,]+\.?\d*$', cell):
                try:
                    amount = float(cell.replace(',', ''))
                    if amount > 0:
                        if 'amount' not in item or amount > item['amount']:
                            item['amount'] = cell
                except:
                    pass
            
            # 税率
            if '%' in cell:
                tax_match = re.search(r'(\d+)%', cell)
                if tax_match:
                    item['tax_rate'] = tax_match.group(0)
        
        return item if item else None
    
    def test_single_file(self, pdf_path: str):
        """测试单个文件"""
        print(f"\n测试文件: {os.path.basename(pdf_path)}")
        print("="*60)
        
        result = self.extract_from_pdf(pdf_path)
        
        if result['success']:
            print(f"✓ 成功提取，找到 {result.get('table_count', 0)} 个表格")
            print("\n提取的数据:")
            for field, value in result['data'].items():
                if field == 'items':
                    print(f"  {self.target_fields.get(field, field)}:")
                    for item in value:
                        print(f"    - {item}")
                else:
                    print(f"  {self.target_fields.get(field, field)}: {value}")
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
        
        print(f"找到 {len(pdf_files)} 个PDF文件")
        
        results = []
        stats = {
            'total': len(pdf_files),
            'success': 0,
            'field_counts': {field: 0 for field in self.target_fields}
        }
        
        # 处理每个文件
        for pdf_path in pdf_files:
            result = self.extract_from_pdf(pdf_path)
            results.append(result)
            
            if result['success']:
                stats['success'] += 1
                
                # 统计字段提取情况
                for field in self.target_fields:
                    if field in result['data'] and result['data'][field]:
                        stats['field_counts'][field] += 1
        
        # 打印统计
        self.print_statistics(stats)
        
        # 保存结果
        output_file = f"camelot_key_fields_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'statistics': stats,
                'results': results
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_file}")
        
        return results, stats
    
    def print_statistics(self, stats: Dict):
        """打印统计信息"""
        print("\n" + "="*60)
        print("Camelot关键字段提取统计:")
        print("-"*60)
        
        success_rate = stats['success'] / stats['total'] * 100
        print(f"成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        
        print("\n字段提取成功率:")
        for field, count in stats['field_counts'].items():
            percentage = count / stats['total'] * 100
            field_name = self.target_fields.get(field, field)
            print(f"  {field_name:<10}: {count:>3}/{stats['total']} ({percentage:>5.1f}%)")

if __name__ == "__main__":
    extractor = CamelotInvoiceExtractor()
    
    # 测试单个文件
    test_files = [
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
        "downloads/25439165666000019624.pdf"
    ]
    
    for pdf_path in test_files:
        if Path(pdf_path).exists():
            extractor.test_single_file(pdf_path)
    
    # 测试所有文件
    print("\n" + "="*80)
    print("开始测试所有PDF文件...")
    print("="*80)
    
    extractor.test_all_pdfs()