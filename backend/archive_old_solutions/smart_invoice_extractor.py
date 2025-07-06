#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
智能发票提取器 - Camelot + 坐标提取 + invoice2data 融合方案
通过智能的字段级融合策略，发挥各工具的优势
"""

import os
import json
import camelot
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
import re

class CamelotDataFrameParser:
    """专门处理Camelot DataFrame输出的解析器"""
    
    def __init__(self):
        # 定义字段标签模式
        self.field_patterns = {
            'buyer_name': ['购买方', '买方', '购方', '名称'],
            'seller_name': ['销售方', '卖方', '销方', '名称'],
            'invoice_number': ['发票号码', '号码'],
            'invoice_date': ['开票日期', '日期'],
            'total_amount': ['价税合计', '合计', '总计'],
            'tax_id': ['统一社会信用代码', '纳税人识别号', '税号']
        }
    
    def parse_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """解析Camelot提取的DataFrame"""
        result = {}
        
        # 查找每个字段
        for field, patterns in self.field_patterns.items():
            value = self._find_field_value(df, patterns)
            if value:
                result[field] = value
        
        # 特殊处理：区分买方和卖方
        self._separate_buyer_seller(df, result)
        
        return result
    
    def _find_field_value(self, df: pd.DataFrame, patterns: List[str]) -> Optional[str]:
        """在DataFrame中查找字段值"""
        for i, row in df.iterrows():
            for j, cell in enumerate(row):
                cell_str = str(cell).strip()
                
                # 检查是否包含任何模式
                for pattern in patterns:
                    if pattern in cell_str:
                        # 查找相邻单元格的值
                        # 1. 同行右侧
                        if j < len(row) - 1:
                            value = str(row[j + 1]).strip()
                            if value and value not in ['nan', 'None', '']:
                                return value
                        
                        # 2. 下一行同列
                        if i < len(df) - 1:
                            value = str(df.iloc[i + 1, j]).strip()
                            if value and value not in ['nan', 'None', '']:
                                return value
                        
                        # 3. 如果标签和值在同一单元格（用冒号分隔）
                        if '：' in cell_str or ':' in cell_str:
                            parts = re.split('[：:]', cell_str, maxsplit=1)
                            if len(parts) == 2:
                                return parts[1].strip()
        
        return None
    
    def _separate_buyer_seller(self, df: pd.DataFrame, result: Dict):
        """区分买方和卖方信息"""
        # 收集所有公司名称及其位置
        companies = []
        company_pattern = r'([\u4e00-\u9fa5]+(?:公司|企业|集团|有限|商店|店|厂|社|部|中心)[\u4e00-\u9fa5]*)'
        
        for i, row in df.iterrows():
            for j, cell in enumerate(row):
                cell_str = str(cell).strip()
                matches = re.findall(company_pattern, cell_str)
                for match in matches:
                    if len(match) > 3 and '统一社' not in match:
                        companies.append({
                            'name': match,
                            'row': i,
                            'col': j,
                            'context': self._get_cell_context(df, i, j)
                        })
        
        # 根据上下文判断买方卖方
        for comp in companies:
            context = comp['context']
            if any(keyword in context for keyword in ['购买方', '买方', '购方']):
                if 'buyer_name' not in result:
                    result['buyer_name'] = comp['name']
            elif any(keyword in context for keyword in ['销售方', '卖方', '销方']):
                if 'seller_name' not in result:
                    result['seller_name'] = comp['name']
        
        # 如果无法通过上下文判断，使用位置规则
        if companies and 'buyer_name' not in result and 'seller_name' not in result:
            # 通常买方在上/左，卖方在下/右
            companies.sort(key=lambda x: (x['row'], x['col']))
            if len(companies) >= 2:
                result['buyer_name'] = companies[0]['name']
                result['seller_name'] = companies[1]['name']
    
    def _get_cell_context(self, df: pd.DataFrame, row: int, col: int) -> str:
        """获取单元格周围的上下文文本"""
        context = []
        
        # 获取周围3x3区域的文本
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                r, c = row + dr, col + dc
                if 0 <= r < len(df) and 0 <= c < len(df.columns):
                    context.append(str(df.iloc[r, c]))
        
        return ' '.join(context)


class FieldFusionStrategy:
    """字段级融合策略管理器"""
    
    def __init__(self):
        # 定义每个字段的优先数据源
        self.field_strategy = {
            'invoice_number': {
                'primary': 'invoice2data',
                'secondary': 'camelot',
                'fallback': 'coordinate'
            },
            'invoice_date': {
                'primary': 'invoice2data',
                'secondary': 'camelot',
                'fallback': 'coordinate'
            },
            'buyer_name': {
                'primary': 'camelot',  # Camelot在买方识别上表现最好
                'secondary': 'coordinate',
                'fallback': 'invoice2data'
            },
            'seller_name': {
                'primary': 'invoice2data',
                'secondary': 'camelot',
                'fallback': 'coordinate'
            },
            'total_amount': {
                'primary': 'invoice2data',  # invoice2data在金额提取上表现最好
                'secondary': 'camelot',
                'fallback': 'coordinate'
            },
            'project_name': {
                'primary': 'invoice2data',
                'secondary': 'coordinate',
                'fallback': 'camelot'
            }
        }
    
    def merge_results(self, camelot_result: Dict, invoice2data_result: Dict, 
                     coordinate_result: Dict) -> Dict[str, Any]:
        """根据策略合并多个来源的结果"""
        final_result = {}
        extraction_sources = {}
        
        # 将所有结果整合到一个字典中
        all_results = {
            'camelot': camelot_result or {},
            'invoice2data': invoice2data_result or {},
            'coordinate': coordinate_result or {}
        }
        
        # 按策略提取每个字段
        for field, strategy in self.field_strategy.items():
            value = None
            source = None
            
            # 尝试从优先级最高的源获取
            for priority in ['primary', 'secondary', 'fallback']:
                source_name = strategy[priority]
                source_data = all_results.get(source_name, {})
                
                # 处理invoice2data的特殊字段映射
                field_name = self._map_field_name(field, source_name)
                
                if field_name in source_data and source_data[field_name]:
                    value = source_data[field_name]
                    source = source_name
                    break
            
            if value:
                final_result[field] = value
                extraction_sources[field] = source
        
        # 添加元数据
        final_result['_extraction_sources'] = extraction_sources
        final_result['_extraction_confidence'] = self._calculate_confidence(final_result)
        
        return final_result
    
    def _map_field_name(self, standard_field: str, source: str) -> str:
        """映射标准字段名到各工具的特定字段名"""
        if source == 'invoice2data':
            mapping = {
                'invoice_date': 'date',
                'total_amount': 'amount',
                'seller_name': 'issuer'
            }
            return mapping.get(standard_field, standard_field)
        return standard_field
    
    def _calculate_confidence(self, result: Dict) -> float:
        """计算整体提取置信度"""
        key_fields = ['invoice_number', 'invoice_date', 'buyer_name', 'seller_name', 'total_amount']
        extracted_count = sum(1 for field in key_fields if field in result and result[field])
        return extracted_count / len(key_fields)


class CoordinateBackupExtractor:
    """坐标提取后备方案"""
    
    def __init__(self):
        try:
            # 尝试导入enhanced_coordinate_extractor
            from .enhanced_coordinate_extractor import EnhancedCoordinateExtractor
            self.extractor = EnhancedCoordinateExtractor()
            self.available = True
        except ImportError:
            # 如果没有enhanced_coordinate_extractor，使用简化版本
            self.extractor = None
            self.available = False
    
    def extract_from_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """使用坐标提取作为后备方案"""
        if self.available and self.extractor:
            try:
                result = self.extractor.extract_from_pdf(pdf_path)
                if result.get('success'):
                    return result.get('data', {})
            except Exception as e:
                print(f"坐标提取失败: {e}")
        
        # 如果enhanced_coordinate_extractor不可用，返回空结果
        return {}


class SmartInvoiceExtractor:
    """智能发票提取主控制器"""
    
    def __init__(self, template_dir: str = "app/services/ocr/templates"):
        # 初始化各组件
        self.camelot_parser = CamelotDataFrameParser()
        self.fusion_strategy = FieldFusionStrategy()
        self.coordinate_extractor = CoordinateBackupExtractor()
        
        # 加载invoice2data模板
        self.templates = read_templates(template_dir)
        print(f"加载了 {len(self.templates)} 个invoice2data模板")
    
    def extract_from_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """从PDF中提取发票信息"""
        result = {
            'file': os.path.basename(pdf_path),
            'method': 'smart_fusion',
            'success': False,
            'data': {},
            'debug_info': {}
        }
        
        try:
            # Step 1: 使用Camelot提取表格并解析
            camelot_result = self._extract_with_camelot(pdf_path)
            result['debug_info']['camelot'] = camelot_result
            
            # Step 2: 使用invoice2data直接处理PDF（保持原生能力）
            invoice2data_result = self._extract_with_invoice2data(pdf_path)
            result['debug_info']['invoice2data'] = invoice2data_result
            
            # Step 3: 如果需要，使用坐标提取作为后备
            coordinate_result = {}
            if self._needs_coordinate_extraction(camelot_result, invoice2data_result):
                coordinate_result = self.coordinate_extractor.extract_from_pdf(pdf_path)
                result['debug_info']['coordinate'] = coordinate_result
            
            # Step 4: 智能融合结果
            final_data = self.fusion_strategy.merge_results(
                camelot_result, invoice2data_result, coordinate_result
            )
            
            result['data'] = final_data
            result['success'] = bool(final_data.get('invoice_number'))
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def _extract_with_camelot(self, pdf_path: str) -> Dict[str, Any]:
        """使用Camelot提取并解析"""
        try:
            # 优先使用stream模式
            tables = camelot.read_pdf(pdf_path, flavor='stream', pages='1')
            
            if tables.n == 0:
                # 尝试lattice模式
                tables = camelot.read_pdf(pdf_path, flavor='lattice', pages='1')
            
            if tables.n > 0:
                # 使用第一个表格
                df = tables[0].df
                return self.camelot_parser.parse_dataframe(df)
            
        except Exception as e:
            print(f"Camelot提取失败: {e}")
        
        return {}
    
    def _extract_with_invoice2data(self, pdf_path: str) -> Dict[str, Any]:
        """使用invoice2data提取"""
        try:
            # 直接使用invoice2data处理PDF，保持其原生能力
            result = extract_data(pdf_path, templates=self.templates)
            return result if result else {}
        except Exception as e:
            print(f"invoice2data提取失败: {e}")
            return {}
    
    def _needs_coordinate_extraction(self, camelot_result: Dict, invoice2data_result: Dict) -> bool:
        """判断是否需要坐标提取"""
        # 如果关键字段缺失，则需要坐标提取
        key_fields = ['buyer_name', 'seller_name', 'total_amount']
        
        for field in key_fields:
            field_name = self.fusion_strategy._map_field_name(field, 'invoice2data')
            if not camelot_result.get(field) and not invoice2data_result.get(field_name):
                return True
        
        return False
    
    def test_single_file(self, pdf_path: str):
        """测试单个文件"""
        print(f"\n{'='*60}")
        print(f"测试文件: {os.path.basename(pdf_path)}")
        print('='*60)
        
        result = self.extract_from_pdf(pdf_path)
        
        if result['success']:
            print("✓ 成功提取")
            print(f"  提取置信度: {result['data'].get('_extraction_confidence', 0):.2f}")
            
            print("\n提取的数据:")
            sources = result['data'].get('_extraction_sources', {})
            for field, value in result['data'].items():
                if not field.startswith('_'):
                    source = sources.get(field, 'unknown')
                    print(f"  {field}: {value} (来源: {source})")
            
            print("\n各工具提取情况:")
            for tool in ['camelot', 'invoice2data', 'coordinate']:
                tool_data = result['debug_info'].get(tool, {})
                if tool_data:
                    fields = [k for k in tool_data.keys() if not k.startswith('_')]
                    print(f"  {tool}: 提取了 {len(fields)} 个字段")
        else:
            print("✗ 提取失败")
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
            'field_counts': {},
            'source_counts': {}
        }
        
        # 定义要统计的字段
        target_fields = ['invoice_number', 'invoice_date', 'total_amount', 
                        'buyer_name', 'seller_name', 'project_name']
        for field in target_fields:
            stats['field_counts'][field] = 0
            stats['source_counts'][field] = {'camelot': 0, 'invoice2data': 0, 'coordinate': 0}
        
        # 处理每个文件
        for i, pdf_path in enumerate(pdf_files):
            print(f"\n[{i+1}/{len(pdf_files)}] 处理: {os.path.relpath(pdf_path, 'downloads')}")
            
            result = self.extract_from_pdf(pdf_path)
            results.append(result)
            
            if result['success']:
                stats['success'] += 1
                
                # 统计字段提取情况和来源
                sources = result['data'].get('_extraction_sources', {})
                for field in target_fields:
                    if field in result['data'] and result['data'][field]:
                        stats['field_counts'][field] += 1
                        source = sources.get(field, 'unknown')
                        if source in stats['source_counts'][field]:
                            stats['source_counts'][field][source] += 1
        
        # 打印统计
        self.print_statistics(stats)
        
        # 保存结果
        output_file = f"smart_fusion_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # 转换datetime对象为字符串
        def serialize_value(obj):
            """递归序列化值"""
            if hasattr(obj, 'strftime'):
                return obj.strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(obj, dict):
                return {k: serialize_value(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [serialize_value(v) for v in obj]
            else:
                return obj
        
        serializable_results = []
        for result in results:
            serializable_results.append(serialize_value(result))
        
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
        print("智能融合方案统计:")
        print("-"*60)
        
        success_rate = stats['success'] / stats['total'] * 100
        print(f"总体成功率: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")
        
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
        
        print("\n数据来源分布:")
        for field in stats['source_counts']:
            sources = stats['source_counts'][field]
            total_extracted = sum(sources.values())
            if total_extracted > 0:
                field_name = field_names.get(field, field)
                print(f"\n  {field_name}:")
                for source, count in sources.items():
                    if count > 0:
                        percentage = count / total_extracted * 100
                        print(f"    {source:<12}: {count:>3} ({percentage:>5.1f}%)")


if __name__ == "__main__":
    # 创建智能提取器
    extractor = SmartInvoiceExtractor(template_dir="app/services/ocr/templates")
    
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