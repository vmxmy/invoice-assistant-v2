#!/usr/bin/env python3
"""
分析失败的PDF文件文本内容，优化金额字段的正则表达式
"""

import asyncio
import logging
import os
import sys
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
from collections import defaultdict, Counter

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.service import OCRService
from app.services.ocr.config import OCRConfig
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from pdfminer.high_level import extract_text

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


class FailedPDFAnalyzer:
    """失败PDF文件分析器"""
    
    def __init__(self):
        self.config = OCRConfig.from_settings()
        self.downloads_dir = Path('/Users/xumingyang/app/invoice_assist/downloads')
        self.templates_dir = Path(__file__).parent / 'app/services/ocr/templates'
        self.failed_files = []
        self.text_analysis_results = []
        self.amount_patterns = []
        
    def discover_pdf_files(self) -> List[Path]:
        """发现所有PDF文件"""
        if not self.downloads_dir.exists():
            print(f"❌ Downloads目录不存在: {self.downloads_dir}")
            return []
        
        pdf_files = list(self.downloads_dir.glob("**/*.pdf"))
        print(f"📄 发现 {len(pdf_files)} 个PDF文件")
        return pdf_files
    
    async def identify_failed_files(self) -> List[Path]:
        """识别处理失败的PDF文件"""
        pdf_files = self.discover_pdf_files()
        failed_files = []
        
        print("🔍 识别失败的PDF文件...")
        
        async with OCRService(self.config) as service:
            for pdf_file in pdf_files:
                try:
                    result = await service.extract_invoice_data(str(pdf_file))
                    
                    if result.get('status') != 'success':
                        error_msg = result.get('error', '未知错误')
                        if 'amount' in error_msg.lower():
                            failed_files.append(pdf_file)
                            print(f"   ❌ {pdf_file.name}: {error_msg}")
                        
                except Exception as e:
                    if 'amount' in str(e).lower():
                        failed_files.append(pdf_file)
                        print(f"   ❌ {pdf_file.name}: {str(e)}")
        
        self.failed_files = failed_files
        print(f"\n📊 发现 {len(failed_files)} 个因金额字段失败的PDF文件")
        return failed_files
    
    def extract_raw_text(self, pdf_path: Path) -> str:
        """提取PDF原始文本"""
        try:
            return extract_text(str(pdf_path))
        except Exception as e:
            logger.error(f"提取原始文本失败 {pdf_path.name}: {e}")
            return ""
    
    def extract_invoice2data_text(self, pdf_path: Path) -> str:
        """提取invoice2data处理后的文本"""
        try:
            # 使用invoice2data的内部文本提取
            from invoice2data.extract.invoice_template import InvoiceTemplate
            from invoice2data.extract.text import extract_text as i2d_extract_text
            
            text = i2d_extract_text(str(pdf_path))
            return text
        except Exception as e:
            logger.error(f"提取invoice2data文本失败 {pdf_path.name}: {e}")
            return ""
    
    def analyze_text_patterns(self, pdf_path: Path) -> Dict[str, Any]:
        """分析文本中的金额相关模式"""
        raw_text = self.extract_raw_text(pdf_path)
        i2d_text = self.extract_invoice2data_text(pdf_path)
        
        analysis = {
            'file_name': pdf_path.name,
            'raw_text_length': len(raw_text),
            'i2d_text_length': len(i2d_text),
            'amount_patterns': [],
            'potential_amounts': [],
            'chinese_amounts': [],
            'decimal_amounts': [],
            'currency_symbols': [],
            'text_samples': {
                'raw_text_preview': raw_text[:500] + "..." if len(raw_text) > 500 else raw_text,
                'i2d_text_preview': i2d_text[:500] + "..." if len(i2d_text) > 500 else i2d_text,
                'raw_text_full': raw_text,
                'i2d_text_full': i2d_text
            }
        }
        
        # 分析各种金额模式
        texts_to_analyze = [
            ('raw', raw_text),
            ('invoice2data', i2d_text)
        ]
        
        for text_type, text in texts_to_analyze:
            if not text:
                continue
                
            # 查找常见的金额模式
            patterns = {
                'price_tax_total': r'价税合计[：:]?.*?[¥￥]?([\d,]+\.?\d*)',
                'price_tax_total_small': r'价税合计.*?[（(]小写[）)].*?[¥￥]?([\d,]+\.?\d*)',
                'price_tax_total_big': r'价税合计.*?[（(]大写[）)].*?([壹贰叁肆伍陆柒捌玖拾佰仟万亿]+)',
                'amount_small': r'[（(]小写[）)].*?[¥￥]?([\d,]+\.?\d*)',
                'amount_big': r'[（(]大写[）)].*?([壹贰叁肆伍陆柒捌玖拾佰仟万亿]+)',
                'currency_amounts': r'[¥￥]([\d,]+\.?\d*)',
                'decimal_numbers': r'([\d,]+\.\d{2})',
                'integer_amounts': r'(?<![\d.])([\d,]{3,}\.?\d*)(?![\d.])',
                'chinese_numbers': r'([壹贰叁肆伍陆柒捌玖拾佰仟万亿]+)',
                'total_words': r'合计.*?[¥￥]?([\d,]+\.?\d*)',
                'invoice_amount': r'发票金额.*?[¥￥]?([\d,]+\.?\d*)',
                'tax_amount': r'税额.*?[¥￥]?([\d,]+\.?\d*)'
            }
            
            for pattern_name, pattern in patterns.items():
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    analysis['amount_patterns'].append({
                        'text_type': text_type,
                        'pattern_name': pattern_name,
                        'pattern': pattern,
                        'matches': matches,
                        'match_count': len(matches)
                    })
        
        # 提取所有可能的金额数值
        for text_type, text in texts_to_analyze:
            if not text:
                continue
                
            # 十进制数字
            decimal_amounts = re.findall(r'([\d,]+\.\d{2})', text)
            analysis['decimal_amounts'].extend([{'text_type': text_type, 'amount': amt} for amt in decimal_amounts])
            
            # 中文数字
            chinese_amounts = re.findall(r'([壹贰叁肆伍陆柒捌玖拾佰仟万亿]+)', text)
            analysis['chinese_amounts'].extend([{'text_type': text_type, 'amount': amt} for amt in chinese_amounts])
            
            # 货币符号
            currency_symbols = re.findall(r'[¥￥]([\d,]+\.?\d*)', text)
            analysis['currency_symbols'].extend([{'text_type': text_type, 'amount': amt} for amt in currency_symbols])
        
        return analysis
    
    async def analyze_all_failed_files(self):
        """分析所有失败的文件"""
        failed_files = await self.identify_failed_files()
        
        if not failed_files:
            print("✅ 没有发现因金额字段失败的PDF文件")
            return
        
        print(f"\n🔍 开始分析 {len(failed_files)} 个失败的PDF文件...")
        print("=" * 80)
        
        for i, pdf_file in enumerate(failed_files, 1):
            print(f"\n📄 [{i}/{len(failed_files)}] 分析: {pdf_file.name}")
            print("-" * 60)
            
            analysis = self.analyze_text_patterns(pdf_file)
            self.text_analysis_results.append(analysis)
            
            # 显示分析结果
            self.display_analysis_results(analysis)
    
    def display_analysis_results(self, analysis: Dict[str, Any]):
        """显示单个文件的分析结果"""
        print(f"   📊 文本长度: 原始={analysis['raw_text_length']}, invoice2data={analysis['i2d_text_length']}")
        
        # 显示发现的金额模式
        if analysis['amount_patterns']:
            print("   💰 发现的金额模式:")
            for pattern in analysis['amount_patterns']:
                print(f"      {pattern['pattern_name']} ({pattern['text_type']}): {pattern['matches']}")
        
        # 显示可能的金额数值
        if analysis['decimal_amounts']:
            decimal_vals = [amt['amount'] for amt in analysis['decimal_amounts']]
            print(f"   🔢 十进制金额: {set(decimal_vals)}")
        
        if analysis['chinese_amounts']:
            chinese_vals = [amt['amount'] for amt in analysis['chinese_amounts']]
            print(f"   🈯 中文金额: {set(chinese_vals)}")
        
        if analysis['currency_symbols']:
            currency_vals = [amt['amount'] for amt in analysis['currency_symbols']]
            print(f"   💱 货币符号金额: {set(currency_vals)}")
        
        # 显示文本预览
        if analysis['text_samples']['i2d_text_preview']:
            print(f"   📖 invoice2data文本预览:")
            print(f"      {analysis['text_samples']['i2d_text_preview'][:200]}...")
    
    def generate_optimized_patterns(self) -> List[Dict[str, Any]]:
        """基于分析结果生成优化的正则表达式"""
        print("\n🔧 基于分析结果生成优化的正则表达式...")
        
        # 统计所有匹配的模式
        pattern_stats = defaultdict(list)
        all_amounts = set()
        
        for result in self.text_analysis_results:
            for pattern_info in result['amount_patterns']:
                pattern_stats[pattern_info['pattern_name']].extend(pattern_info['matches'])
            
            # 收集所有金额值
            for amt_info in result['decimal_amounts']:
                all_amounts.add(amt_info['amount'])
            for amt_info in result['currency_symbols']:
                all_amounts.add(amt_info['amount'])
        
        # 生成优化的模式
        optimized_patterns = []
        
        # 模式1: 价税合计（小写）
        if pattern_stats['price_tax_total_small']:
            optimized_patterns.append({
                'field': 'amount',
                'pattern': r'价税合计.*?[（(]小写[）)].*?[¥￥]?([\d,]+\.?\d*)',
                'description': '价税合计小写金额',
                'matches_found': len(pattern_stats['price_tax_total_small']),
                'sample_matches': pattern_stats['price_tax_total_small'][:5]
            })
        
        # 模式2: 通用价税合计
        if pattern_stats['price_tax_total']:
            optimized_patterns.append({
                'field': 'amount',
                'pattern': r'价税合计[：:]?.*?[¥￥]?([\d,]+\.?\d*)',
                'description': '通用价税合计',
                'matches_found': len(pattern_stats['price_tax_total']),
                'sample_matches': pattern_stats['price_tax_total'][:5]
            })
        
        # 模式3: 合计金额
        if pattern_stats['total_words']:
            optimized_patterns.append({
                'field': 'amount',
                'pattern': r'合计.*?[¥￥]?([\d,]+\.?\d*)',
                'description': '合计金额',
                'matches_found': len(pattern_stats['total_words']),
                'sample_matches': pattern_stats['total_words'][:5]
            })
        
        # 模式4: 发票金额
        if pattern_stats['invoice_amount']:
            optimized_patterns.append({
                'field': 'amount',
                'pattern': r'发票金额.*?[¥￥]?([\d,]+\.?\d*)',
                'description': '发票金额',
                'matches_found': len(pattern_stats['invoice_amount']),
                'sample_matches': pattern_stats['invoice_amount'][:5]
            })
        
        # 模式5: 货币符号后的金额
        if any(amt_info['amount'] for result in self.text_analysis_results for amt_info in result['currency_symbols']):
            optimized_patterns.append({
                'field': 'amount',
                'pattern': r'[¥￥]([\d,]+\.?\d*)',
                'description': '货币符号后金额',
                'matches_found': len([amt for result in self.text_analysis_results for amt in result['currency_symbols']]),
                'sample_matches': list(set([amt['amount'] for result in self.text_analysis_results for amt in result['currency_symbols']]))[:5]
            })
        
        # 模式6: 宽松的十进制数字匹配
        optimized_patterns.append({
            'field': 'amount',
            'pattern': r'([\d,]+\.\d{2})',
            'description': '宽松的十进制金额匹配',
            'matches_found': len(all_amounts),
            'sample_matches': list(all_amounts)[:5]
        })
        
        self.amount_patterns = optimized_patterns
        return optimized_patterns
    
    def display_optimization_results(self):
        """显示优化结果"""
        print("\n🎯 优化的正则表达式模式:")
        print("=" * 80)
        
        for i, pattern in enumerate(self.amount_patterns, 1):
            print(f"\n{i}. {pattern['description']}")
            print(f"   模式: {pattern['pattern']}")
            print(f"   匹配次数: {pattern['matches_found']}")
            print(f"   示例匹配: {pattern['sample_matches']}")
    
    def create_optimized_template(self):
        """创建优化的模板文件"""
        print("\n📝 创建优化的模板文件...")
        
        # 基于分析结果创建多个模板变体
        templates = []
        
        # 模板1: 严格匹配
        strict_template = {
            'issuer': '中国电子发票-严格匹配',
            'keywords': ['电子发票', '发票号码', '开票日期'],
            'fields': {
                'invoice_number': '发票号码[：:]\\s*(\\d+)',
                'date': '开票日期[：:]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)',
                'buyer_name': '购\\s*名称：([^\\s]*[^销]*?)\\s+销',
                'seller_name': '销\\s*名称：([^\\n]+)',
                'buyer_tax_id': '统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})(?=.*销)',
                'seller_tax_id': '销.*?统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})',
                'amount': '价税合计.*?[（(]小写[）)].*?[¥￥]?([\\d,]+\\.?\\d*)',
                'chinese_words': '价税合计[（(]大写[）)]\\s*([^\\n（]+)',
                'issuer_person': '开票人[：:]\\s*([^\\n\\s]+)'
            }
        }
        
        # 模板2: 宽松匹配
        loose_template = {
            'issuer': '中国电子发票-宽松匹配',
            'keywords': ['电子发票', '发票号码', '开票日期'],
            'fields': {
                'invoice_number': '发票号码[：:]\\s*(\\d+)',
                'date': '开票日期[：:]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)',
                'buyer_name': '购\\s*名称：([^\\s]*[^销]*?)\\s+销',
                'seller_name': '销\\s*名称：([^\\n]+)',
                'buyer_tax_id': '统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})(?=.*销)',
                'seller_tax_id': '销.*?统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})',
                'amount': '价税合计.*?[¥￥]?([\\d,]+\\.?\\d*)',
                'chinese_words': '价税合计.*?[（(]大写[）)]\\s*([^\\n（]+)',
                'issuer_person': '开票人[：:]\\s*([^\\n\\s]+)'
            }
        }
        
        # 模板3: 多模式匹配
        multi_pattern_template = {
            'issuer': '中国电子发票-多模式匹配',
            'keywords': ['电子发票', '发票号码', '开票日期'],
            'fields': {
                'invoice_number': '发票号码[：:]\\s*(\\d+)',
                'date': '开票日期[：:]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)',
                'buyer_name': '购\\s*名称：([^\\s]*[^销]*?)\\s+销',
                'seller_name': '销\\s*名称：([^\\n]+)',
                'buyer_tax_id': '统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})(?=.*销)',
                'seller_tax_id': '销.*?统一社会信用代码/纳税人识别号[：:]\\s*([A-Z0-9]{18})',
                'amount': '(?:价税合计.*?[（(]小写[）)].*?[¥￥]?([\\d,]+\\.?\\d*)|合计.*?[¥￥]?([\\d,]+\\.?\\d*)|[¥￥]([\\d,]+\\.?\\d*))',
                'chinese_words': '价税合计.*?[（(]大写[）)]\\s*([^\\n（]+)',
                'issuer_person': '开票人[：:]\\s*([^\\n\\s]+)'
            }
        }
        
        templates = [strict_template, loose_template, multi_pattern_template]
        
        # 保存模板文件
        for i, template in enumerate(templates, 1):
            template_file = self.templates_dir / f'china_electronic_invoice_v{i}.yml'
            with open(template_file, 'w', encoding='utf-8') as f:
                import yaml
                yaml.dump(template, f, default_flow_style=False, allow_unicode=True)
            print(f"   ✅ 模板 {i} 已保存: {template_file.name}")
    
    async def test_optimized_templates(self):
        """测试优化后的模板"""
        print("\n🧪 测试优化后的模板...")
        
        if not self.failed_files:
            print("❌ 没有失败的文件用于测试")
            return
        
        # 测试前几个失败的文件
        test_files = self.failed_files[:5]
        
        for i in range(1, 4):  # 测试3个版本的模板
            template_file = self.templates_dir / f'china_electronic_invoice_v{i}.yml'
            if not template_file.exists():
                continue
            
            print(f"\n🔍 测试模板 v{i}: {template_file.name}")
            
            # 加载模板
            templates = read_templates(str(self.templates_dir))
            success_count = 0
            
            for pdf_file in test_files:
                try:
                    result = extract_data(str(pdf_file), templates=templates)
                    if result and result.get('amount'):
                        success_count += 1
                        print(f"   ✅ {pdf_file.name}: 金额={result.get('amount')}")
                    else:
                        print(f"   ❌ {pdf_file.name}: 未提取到金额")
                except Exception as e:
                    print(f"   ❌ {pdf_file.name}: {str(e)}")
            
            print(f"   📊 模板 v{i} 成功率: {success_count}/{len(test_files)} ({success_count/len(test_files)*100:.1f}%)")
    
    def save_analysis_report(self):
        """保存分析报告"""
        import time
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        report_file = f"failed_pdf_analysis_{timestamp}.json"
        
        report_data = {
            'timestamp': timestamp,
            'failed_files_count': len(self.failed_files),
            'failed_files': [str(f) for f in self.failed_files],
            'text_analysis_results': self.text_analysis_results,
            'optimized_patterns': self.amount_patterns,
            'recommendations': [
                "使用多模式匹配来提高金额字段的提取成功率",
                "考虑宽松匹配策略来处理不同格式的发票",
                "增加货币符号后的金额匹配模式",
                "优化中文大写金额的提取规则"
            ]
        }
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, ensure_ascii=False, indent=2, default=str)
            print(f"\n💾 分析报告已保存: {report_file}")
        except Exception as e:
            print(f"\n❌ 保存分析报告失败: {e}")
    
    def generate_summary_report(self):
        """生成总结报告"""
        print("\n📊 失败PDF分析总结报告")
        print("=" * 80)
        
        if not self.failed_files:
            print("✅ 没有发现因金额字段失败的PDF文件")
            return
        
        print(f"📈 基础统计:")
        print(f"   失败文件数: {len(self.failed_files)}")
        print(f"   分析文件数: {len(self.text_analysis_results)}")
        
        # 统计分析结果
        total_patterns = sum(len(result['amount_patterns']) for result in self.text_analysis_results)
        total_decimal_amounts = sum(len(result['decimal_amounts']) for result in self.text_analysis_results)
        total_chinese_amounts = sum(len(result['chinese_amounts']) for result in self.text_analysis_results)
        
        print(f"   发现模式数: {total_patterns}")
        print(f"   十进制金额数: {total_decimal_amounts}")
        print(f"   中文金额数: {total_chinese_amounts}")
        
        # 优化建议
        print(f"\n💡 优化建议:")
        print(f"   1. 使用多模式匹配策略")
        print(f"   2. 增加宽松匹配选项")
        print(f"   3. 优化货币符号匹配")
        print(f"   4. 考虑文本预处理差异")
        
        # 显示优化后的模式
        if self.amount_patterns:
            print(f"\n🎯 推荐的优化模式:")
            for i, pattern in enumerate(self.amount_patterns[:3], 1):
                print(f"   {i}. {pattern['description']}: {pattern['pattern']}")


async def main():
    """主分析函数"""
    print("🚀 启动失败PDF文件分析工具")
    print("=" * 80)
    
    analyzer = FailedPDFAnalyzer()
    
    # 分析失败的文件
    await analyzer.analyze_all_failed_files()
    
    # 生成优化的模式
    analyzer.generate_optimized_patterns()
    
    # 显示优化结果
    analyzer.display_optimization_results()
    
    # 创建优化的模板
    analyzer.create_optimized_template()
    
    # 测试优化后的模板
    await analyzer.test_optimized_templates()
    
    # 保存分析报告
    analyzer.save_analysis_report()
    
    # 生成总结报告
    analyzer.generate_summary_report()


if __name__ == "__main__":
    asyncio.run(main())