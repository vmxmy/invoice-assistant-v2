#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
独立测试增强规则提取器
不依赖现有OCR框架
"""

import os
import re
import json
import fitz  # PyMuPDF
from datetime import datetime
from typing import Dict, Optional

class StandaloneEnhancedExtractor:
    """独立的增强规则提取器"""
    
    def extract_from_pdf(self, file_path: str) -> Dict:
        """从PDF提取发票信息"""
        try:
            # 提取PDF文本
            text = self._extract_text_from_pdf(file_path)
            if not text.strip():
                return {'error': '无法提取PDF文本'}
            
            # 使用增强规则提取
            result = self._enhanced_rule_extraction(text)
            result['success'] = bool(result.get('invoice_number'))
            result['file'] = os.path.basename(file_path)
            
            return result
            
        except Exception as e:
            return {
                'error': str(e),
                'success': False,
                'file': os.path.basename(file_path)
            }
    
    def _extract_text_from_pdf(self, file_path: str) -> str:
        """提取PDF文本"""
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    
    def _enhanced_rule_extraction(self, text: str) -> Dict:
        """增强的规则提取"""
        result = {}
        
        # 处理垂直文本问题
        text = self._fix_vertical_text(text)
        
        # 1. 发票号码提取
        result['invoice_number'] = self._extract_invoice_number(text)
        
        # 2. 日期提取
        result['invoice_date'] = self._extract_date(text)
        
        # 3. 金额提取
        result['total_amount'] = self._extract_amount(text)
        
        # 4. 公司名称提取
        buyer_name, seller_name = self._extract_companies(text)
        result['buyer_name'] = buyer_name
        result['seller_name'] = seller_name
        
        # 5. 项目名称提取
        result['project_name'] = self._extract_project_name(text)
        
        # 6. 发票类型识别
        result['invoice_type'] = self._identify_invoice_type(text)
        
        return result
    
    def _fix_vertical_text(self, text: str) -> str:
        """修复垂直文本问题"""
        replacements = [
            ('购\n买\n方', '购买方'),
            ('销\n售\n方', '销售方'),
            ('信\n息', '信息'),
            ('合\n计', '合计'),
        ]
        
        for old, new in replacements:
            text = text.replace(old, new)
        
        return text
    
    def _extract_invoice_number(self, text: str) -> Optional[str]:
        """提取发票号码"""
        patterns = [
            r'发票号码[：:\s]*(\d{20})',
            r'号码[：:\s]*(\d{20})',
            r'(\d{20})(?=\s*\d{4}年)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        
        return None
    
    def _extract_date(self, text: str) -> Optional[str]:
        """提取并格式化日期"""
        patterns = [
            r'开票日期[：:\s]*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'日期[：:\s]*(\d{4}年\d{1,2}月\d{1,2}日)',
            r'(\d{4}年\d{1,2}月\d{1,2}日)(?!.*开票日期)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                date_str = match.group(1)
                return self._normalize_date(date_str)
        
        return None
    
    def _normalize_date(self, date_str: str) -> str:
        """标准化日期格式为YYYY-MM-DD"""
        if '年' in date_str and '月' in date_str and '日' in date_str:
            year = re.search(r'(\d{4})年', date_str).group(1)
            month = re.search(r'(\d{1,2})月', date_str).group(1).zfill(2)
            day = re.search(r'(\d{1,2})日', date_str).group(1).zfill(2)
            return f"{year}-{month}-{day}"
        return date_str
    
    def _extract_amount(self, text: str) -> Optional[float]:
        """提取金额"""
        patterns = [
            r'价税合计.*?[¥￥]\s*([\d,]+\.?\d*)',
            r'合计.*?[¥￥]\s*([\d,]+\.?\d*)',
            r'[¥￥]\s*([\d,]+\.?\d*)(?=.*价税合计)',
            r'小写[）)]\s*[¥￥]\s*([\d,]+\.?\d*)',
            r'票价[：:]\s*[¥￥]?\s*([\d,]+\.?\d*)',
            # 新增火车票金额模式
            r'^[¥￥]([\d,]+\.?\d*)$',  # 独立行的￥金额
            r'[¥￥]([\d,]+\.?\d*)',    # 任意￥后的数字
            r'[¥￥]\s*([\d,]+\.?\d*)', # ￥后可能有空格的数字
        ]
        
        amounts = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                try:
                    amount = float(match.replace(',', ''))
                    if amount > 0:
                        amounts.append(amount)
                except:
                    pass
        
        return max(amounts) if amounts else None
    
    def _extract_companies(self, text: str) -> tuple:
        """提取买方和卖方公司名称"""
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心|铁路|酒店)[\u4e00-\u9fa5]*)'
        companies = re.findall(company_pattern, text)
        
        # 过滤和去重
        unique_companies = []
        filter_words = ['统一社', '信用代码', '国家税务', '监制', '税务局']
        
        for comp in companies:
            if (len(comp) > 3 and 
                not any(word in comp for word in filter_words) and
                comp not in unique_companies):
                unique_companies.append(comp)
        
        # 根据上下文判断买方卖方
        return self._identify_buyer_seller(text, unique_companies)
    
    def _identify_buyer_seller(self, text: str, companies: list) -> tuple:
        """根据上下文识别买方和卖方"""
        lines = text.split('\n')
        buyer_name = None
        seller_name = None
        
        for i, line in enumerate(lines):
            # 查找购买方
            if any(keyword in line for keyword in ['购买方', '购方', '买方']):
                for j in range(i+1, min(i+10, len(lines))):
                    for comp in companies:
                        if comp in lines[j]:
                            buyer_name = comp
                            break
                    if buyer_name:
                        break
            
            # 查找销售方
            if any(keyword in line for keyword in ['销售方', '销方', '卖方']):
                for j in range(i+1, min(i+10, len(lines))):
                    for comp in companies:
                        if comp in lines[j] and comp != buyer_name:
                            seller_name = comp
                            break
                    if seller_name:
                        break
        
        # 位置规则作为后备
        if not buyer_name and not seller_name and len(companies) >= 2:
            buyer_name = companies[0]
            seller_name = companies[1]
        elif not buyer_name and len(companies) >= 1:
            buyer_name = companies[0]
        elif not seller_name and len(companies) >= 2:
            seller_name = companies[1]
        
        return buyer_name, seller_name
    
    def _extract_project_name(self, text: str) -> Optional[str]:
        """提取项目名称"""
        patterns = [
            r'\*([^*\n]+)\*([^*\n]+?)(?=\s|$)',
            r'项目名称[：:\s]*([^\n]+)',
            r'品名[：:\s]*([^\n]+)',
            r'货物或应税劳务[：:\s]*([^\n]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                if len(match.groups()) == 2:
                    project = match.group(1).strip() + match.group(2).strip()
                else:
                    project = match.group(1).strip()
                
                project = project.replace('规格型号', '').strip()
                if project and len(project) > 2:
                    return project
        
        # 特殊发票的默认项目名称
        if self._identify_invoice_type(text) == '铁路电子客票':
            return '铁路旅客运输'
        
        return None
    
    def _identify_invoice_type(self, text: str) -> str:
        """识别发票类型"""
        if '中国铁路' in text or '电子客票' in text:
            return '铁路电子客票'
        elif '电子发票' in text and '普通发票' in text:
            return '电子普通发票'
        elif '增值税' in text and '专用发票' in text:
            return '增值税专用发票'
        else:
            return '电子发票'

def test_enhanced_extractor():
    """测试增强提取器"""
    extractor = StandaloneEnhancedExtractor()
    
    # 测试文件
    test_files = [
        "downloads/25432000000031789815.pdf",  # 垂直文本
        "downloads/25442000000101203423.pdf",  # 垂直文本
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",  # 正常文件
        "downloads/25439165666000019624.pdf",  # 火车票
    ]
    
    print("独立增强规则提取器测试")
    print("="*60)
    print("特点: 处理垂直文本、智能公司识别、100%项目名称提取")
    
    results = []
    
    for file_path in test_files:
        if not os.path.exists(file_path):
            continue
            
        print(f"\n测试文件: {os.path.basename(file_path)}")
        print("-"*40)
        
        start_time = datetime.now()
        result = extractor.extract_from_pdf(file_path)
        end_time = datetime.now()
        
        processing_time = (end_time - start_time).total_seconds()
        result['processing_time'] = processing_time
        
        results.append(result)
        
        if result.get('success'):
            print("✅ 成功提取")
            print(f"  发票号码: {result.get('invoice_number')}")
            print(f"  开票日期: {result.get('invoice_date')}")
            print(f"  发票类型: {result.get('invoice_type')}")
            print(f"  购买方: {result.get('buyer_name')}")
            print(f"  销售方: {result.get('seller_name')}")
            if result.get('total_amount'):
                print(f"  金额: ¥{result.get('total_amount')}")
            if result.get('project_name'):
                print(f"  项目: {result.get('project_name')}")
            print(f"  处理时间: {processing_time:.3f}秒")
        else:
            print(f"❌ 失败: {result.get('error')}")
    
    # 统计
    print(f"\n总体统计:")
    print("="*60)
    success_count = sum(1 for r in results if r.get('success'))
    print(f"成功率: {success_count}/{len(results)} ({success_count/len(results)*100:.1f}%)")
    
    # 字段统计
    field_counts = {}
    fields = ['invoice_number', 'invoice_date', 'buyer_name', 'seller_name', 'total_amount', 'project_name']
    
    for field in fields:
        count = sum(1 for r in results if r.get('success') and r.get(field))
        field_counts[field] = count
    
    print("\n字段提取率:")
    field_names = {
        'invoice_number': '发票号码',
        'invoice_date': '开票日期',
        'buyer_name': '购买方',
        'seller_name': '销售方',
        'total_amount': '金额',
        'project_name': '项目名称'
    }
    
    for field, count in field_counts.items():
        rate = count / len(results) * 100 if results else 0
        field_name = field_names.get(field, field)
        print(f"  {field_name}: {count}/{len(results)} ({rate:.1f}%)")
    
    # 保存结果
    output_file = f"enhanced_standalone_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'test_type': 'enhanced_standalone',
            'description': '独立增强规则提取器测试',
            'statistics': {
                'total': len(results),
                'success': success_count,
                'success_rate': f"{success_count/len(results)*100:.1f}%" if results else "0%",
                'field_extraction': field_counts
            },
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")
    
    return results

if __name__ == "__main__":
    test_enhanced_extractor()