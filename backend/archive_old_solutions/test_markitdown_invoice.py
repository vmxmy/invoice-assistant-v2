#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试MarkItDown在发票提取中的效果
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
from markitdown import MarkItDown
from typing import Dict, Optional

class MarkItDownInvoiceExtractor:
    """使用MarkItDown提取发票信息"""
    
    def __init__(self):
        # 初始化MarkItDown
        self.md = MarkItDown()
        
    def extract_from_pdf(self, pdf_path: str) -> Dict:
        """从PDF中提取发票信息"""
        result = {
            'file': os.path.basename(pdf_path),
            'success': False,
            'markdown': '',
            'data': {},
            'error': None
        }
        
        try:
            # 转换PDF到Markdown
            conversion_result = self.md.convert(pdf_path)
            markdown_text = conversion_result.text_content
            
            result['success'] = True
            result['markdown'] = markdown_text
            
            # 从Markdown中提取发票信息
            result['data'] = self.extract_invoice_fields(markdown_text)
            
        except Exception as e:
            result['error'] = str(e)
            
        return result
    
    def extract_invoice_fields(self, text: str) -> Dict:
        """从Markdown文本中提取发票字段"""
        extracted = {}
        
        # 1. 提取发票号码（20位数字）
        invoice_patterns = [
            r'发票号码[：:]*\s*(\d{20})',
            r'票据号码[：:]*\s*(\d{20})',
            r'号码[：:]*\s*(\d{20})',
            r'\b(\d{20})\b'  # 独立的20位数字
        ]
        
        for pattern in invoice_patterns:
            match = re.search(pattern, text)
            if match:
                extracted['invoice_number'] = match.group(1)
                break
        
        # 2. 提取开票日期
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
        
        # 3. 提取金额
        amount_patterns = [
            r'价税合计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'合计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'总计.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'金额.*?[¥￥]\s*([0-9,]+\.?\d*)',
            r'[¥￥]\s*([0-9,]+\.?\d*).*?价税合计'
        ]
        
        for pattern in amount_patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                extracted['total_amount'] = match.group(1)
                break
        
        # 4. 提取公司名称
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心)[\u4e00-\u9fa5]*)'
        companies = re.findall(company_pattern, text)
        
        if companies:
            # 过滤并去重
            unique_companies = []
            for comp in companies:
                if len(comp) > 3 and '统一社' not in comp and comp not in unique_companies:
                    unique_companies.append(comp)
            
            if unique_companies:
                extracted['companies'] = unique_companies
                
                # 尝试识别买方和卖方
                buyer_keywords = ['购买方', '买方', '购方', '采购方']
                seller_keywords = ['销售方', '卖方', '销方', '供应商']
                
                # 查找买方
                for keyword in buyer_keywords:
                    if keyword in text:
                        idx = text.find(keyword)
                        # 在关键词附近查找公司名称
                        nearby_text = text[idx:idx+200]
                        for comp in unique_companies:
                            if comp in nearby_text:
                                extracted['buyer_name'] = comp
                                break
                        if 'buyer_name' in extracted:
                            break
                
                # 查找卖方
                for keyword in seller_keywords:
                    if keyword in text:
                        idx = text.find(keyword)
                        # 在关键词附近查找公司名称
                        nearby_text = text[idx:idx+200]
                        for comp in unique_companies:
                            if comp in nearby_text and comp != extracted.get('buyer_name'):
                                extracted['seller_name'] = comp
                                break
                        if 'seller_name' in extracted:
                            break
                
                # 如果没有通过关键词找到，使用顺序规则
                if 'buyer_name' not in extracted and len(unique_companies) >= 1:
                    extracted['buyer_name'] = unique_companies[0]
                if 'seller_name' not in extracted and len(unique_companies) >= 2:
                    extracted['seller_name'] = unique_companies[1]
        
        # 5. 提取项目信息
        item_patterns = [
            r'\*([^*\n]+)\*',  # *内容*格式
            r'项目[：:]\s*([^\n]+)',
            r'品名[：:]\s*([^\n]+)',
            r'服务[：:]\s*([^\n]+)'
        ]
        
        items = []
        for pattern in item_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if len(match) > 2 and match not in items:
                    items.append(match)
        
        if items:
            extracted['items'] = items[:3]  # 只取前3个项目
        
        return extracted
    
    def test_single_file(self, pdf_path: str):
        """测试单个文件"""
        print(f"\n{'='*60}")
        print(f"测试文件: {os.path.basename(pdf_path)}")
        print('='*60)
        
        result = self.extract_from_pdf(pdf_path)
        
        if result['success']:
            print("✓ 成功转换为Markdown")
            
            # 显示Markdown前500字符
            print("\nMarkdown内容预览:")
            print("-"*40)
            preview = result['markdown'][:500] + "..." if len(result['markdown']) > 500 else result['markdown']
            print(preview)
            
            # 显示提取的字段
            if result['data']:
                print("\n提取的发票信息:")
                for field, value in result['data'].items():
                    if field == 'companies':
                        print(f"  公司列表: {', '.join(value)}")
                    elif field == 'items':
                        print(f"  项目信息: {', '.join(value)}")
                    else:
                        print(f"  {field}: {value}")
            else:
                print("\n未能提取到任何发票信息")
        else:
            print(f"✗ 处理失败: {result['error']}")
        
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
            'field_counts': {}
        }
        
        # 定义要统计的字段
        target_fields = ['invoice_number', 'invoice_date', 'total_amount', 
                        'buyer_name', 'seller_name', 'companies', 'items']
        for field in target_fields:
            stats['field_counts'][field] = 0
        
        # 处理每个文件
        for i, pdf_path in enumerate(pdf_files):
            print(f"\n[{i+1}/{len(pdf_files)}] 处理: {os.path.relpath(pdf_path, 'downloads')}")
            
            result = self.extract_from_pdf(pdf_path)
            results.append(result)
            
            if result['success']:
                stats['success'] += 1
                
                # 统计字段提取情况
                for field in target_fields:
                    if field in result['data'] and result['data'][field]:
                        stats['field_counts'][field] += 1
        
        # 打印统计
        self.print_statistics(stats)
        
        # 保存结果
        output_file = f"markitdown_invoice_extraction_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'statistics': stats,
                'results': results
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n结果已保存到: {output_file}")
        
        return results, stats
    
    def print_statistics(self, stats):
        """打印统计信息"""
        print("\n" + "="*60)
        print("MarkItDown发票提取统计:")
        print("-"*60)
        
        success_rate = stats['success'] / stats['total'] * 100
        print(f"处理成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        
        print("\n字段提取成功率:")
        field_names = {
            'invoice_number': '发票号码',
            'invoice_date': '开票日期', 
            'total_amount': '含税金额',
            'buyer_name': '采购方',
            'seller_name': '销售方',
            'companies': '公司列表',
            'items': '项目信息'
        }
        
        for field, count in stats['field_counts'].items():
            percentage = count / stats['total'] * 100
            field_name = field_names.get(field, field)
            print(f"  {field_name:<10}: {count:>3}/{stats['total']} ({percentage:>5.1f}%)")

if __name__ == "__main__":
    extractor = MarkItDownInvoiceExtractor()
    
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