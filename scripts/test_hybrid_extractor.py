#!/usr/bin/env python3
"""
测试混合提取器的改进效果
比较原始invoice2data、增强提取器和混合提取器的性能
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
import sys

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.config import OCRConfig
from app.services.ocr.invoice2data_client import Invoice2DataClient
from app.services.ocr.enhanced_rule_extractor import EnhancedRuleExtractor
from app.services.ocr.hybrid_invoice_extractor import HybridInvoiceExtractor


class ExtractorTester:
    """提取器测试类"""
    
    def __init__(self):
        self.config = OCRConfig.from_settings()
        self.test_results = {
            'test_time': datetime.now().isoformat(),
            'extractors': {},
            'comparison': {},
            'improvements': {}
        }
    
    async def test_all_extractors(self, pdf_path: str):
        """测试所有提取器"""
        print(f"\n{'='*80}")
        print(f"测试文件: {pdf_path}")
        print(f"{'='*80}\n")
        
        # 1. 测试原始invoice2data
        print("1. 测试原始Invoice2Data...")
        invoice2data_client = Invoice2DataClient(self.config)
        invoice2data_result = await self._test_extractor(
            "invoice2data", 
            invoice2data_client, 
            pdf_path
        )
        
        # 2. 测试增强提取器
        print("\n2. 测试增强提取器...")
        enhanced_extractor = EnhancedRuleExtractor(self.config)
        enhanced_result = await self._test_extractor(
            "enhanced", 
            enhanced_extractor, 
            pdf_path
        )
        
        # 3. 测试混合提取器
        print("\n3. 测试混合提取器...")
        hybrid_extractor = HybridInvoiceExtractor(self.config)
        hybrid_result = await self._test_extractor(
            "hybrid", 
            hybrid_extractor, 
            pdf_path
        )
        
        # 比较结果
        self._compare_results(invoice2data_result, enhanced_result, hybrid_result)
        
        # 计算改进率
        self._calculate_improvements()
    
    async def _test_extractor(self, name: str, extractor, pdf_path: str):
        """测试单个提取器"""
        try:
            start_time = datetime.now()
            result = await extractor.extract_invoice_data(pdf_path)
            end_time = datetime.now()
            
            extraction_time = (end_time - start_time).total_seconds()
            
            # 提取关键字段
            if result.get('status') == 'success':
                data = result.get('structured_data', {})
                if hasattr(data, 'dict'):
                    data = data.dict()
                
                key_fields = self._extract_key_fields(data)
                field_count = sum(1 for v in key_fields.values() if v)
                
                print(f"✓ 成功 - 提取到 {field_count}/6 个关键字段")
                
                # 显示提取结果
                for field, value in key_fields.items():
                    status = "✓" if value else "✗"
                    display_value = value[:50] + "..." if value and len(value) > 50 else value
                    print(f"  {status} {field}: {display_value or '未提取到'}")
                
                self.test_results['extractors'][name] = {
                    'status': 'success',
                    'extraction_time': extraction_time,
                    'fields_extracted': field_count,
                    'key_fields': key_fields,
                    'confidence': result.get('confidence', 0)
                }
            else:
                print(f"✗ 失败 - {result.get('error', '未知错误')}")
                self.test_results['extractors'][name] = {
                    'status': 'failed',
                    'error': result.get('error', '未知错误'),
                    'extraction_time': extraction_time
                }
            
            return result
            
        except Exception as e:
            print(f"✗ 异常 - {str(e)}")
            self.test_results['extractors'][name] = {
                'status': 'error',
                'error': str(e)
            }
            return {'status': 'error', 'error': str(e)}
    
    def _extract_key_fields(self, data: dict) -> dict:
        """提取关键字段"""
        key_fields = {
            'invoice_number': None,
            'invoice_date': None,
            'seller_name': None,
            'buyer_name': None,
            'total_amount': None,
            'project_name': None
        }
        
        # 直接字段
        for field in ['invoice_number', 'invoice_date', 'project_name']:
            if field in data:
                key_fields[field] = str(data[field]) if data[field] else None
        
        # 嵌套字段
        if 'main_info' in data and isinstance(data['main_info'], dict):
            if 'invoice_number' in data['main_info']:
                key_fields['invoice_number'] = data['main_info']['invoice_number']
            if 'invoice_date' in data['main_info']:
                key_fields['invoice_date'] = str(data['main_info']['invoice_date'])
        
        if 'seller_info' in data and isinstance(data['seller_info'], dict):
            key_fields['seller_name'] = data['seller_info'].get('name')
        
        if 'buyer_info' in data and isinstance(data['buyer_info'], dict):
            key_fields['buyer_name'] = data['buyer_info'].get('name')
        
        if 'summary' in data and isinstance(data['summary'], dict):
            amount = data['summary'].get('total_amount')
            if amount:
                key_fields['total_amount'] = f"{float(amount):.2f}"
        
        # 从raw_data获取
        if 'seller_name' in data:
            key_fields['seller_name'] = data['seller_name']
        if 'buyer_name' in data:
            key_fields['buyer_name'] = data['buyer_name']
        if 'total_amount' in data:
            key_fields['total_amount'] = str(data['total_amount'])
        
        return key_fields
    
    def _compare_results(self, invoice2data_result, enhanced_result, hybrid_result):
        """比较三个提取器的结果"""
        print(f"\n{'='*80}")
        print("结果比较")
        print(f"{'='*80}")
        
        extractors = ['invoice2data', 'enhanced', 'hybrid']
        results = [invoice2data_result, enhanced_result, hybrid_result]
        
        # 比较每个字段
        fields = ['invoice_number', 'invoice_date', 'seller_name', 'buyer_name', 'total_amount', 'project_name']
        
        field_comparison = {}
        for field in fields:
            field_comparison[field] = {}
            print(f"\n{field}:")
            
            for i, (name, result) in enumerate(zip(extractors, results)):
                if result.get('status') == 'success':
                    extractor_data = self.test_results['extractors'][name]
                    value = extractor_data['key_fields'].get(field)
                    field_comparison[field][name] = value
                    
                    # 显示结果
                    if value:
                        display_value = value[:40] + "..." if len(value) > 40 else value
                        print(f"  {name:15} ✓ {display_value}")
                    else:
                        print(f"  {name:15} ✗ 未提取到")
                else:
                    field_comparison[field][name] = None
                    print(f"  {name:15} ✗ 提取失败")
        
        self.test_results['comparison'] = field_comparison
    
    def _calculate_improvements(self):
        """计算改进率"""
        print(f"\n{'='*80}")
        print("改进效果分析")
        print(f"{'='*80}\n")
        
        improvements = {}
        
        # 获取各提取器的成功字段数
        invoice2data_fields = 0
        enhanced_fields = 0
        hybrid_fields = 0
        
        if 'invoice2data' in self.test_results['extractors']:
            if self.test_results['extractors']['invoice2data']['status'] == 'success':
                invoice2data_fields = self.test_results['extractors']['invoice2data']['fields_extracted']
        
        if 'enhanced' in self.test_results['extractors']:
            if self.test_results['extractors']['enhanced']['status'] == 'success':
                enhanced_fields = self.test_results['extractors']['enhanced']['fields_extracted']
        
        if 'hybrid' in self.test_results['extractors']:
            if self.test_results['extractors']['hybrid']['status'] == 'success':
                hybrid_fields = self.test_results['extractors']['hybrid']['fields_extracted']
        
        # 计算提升百分比
        if invoice2data_fields > 0:
            hybrid_vs_invoice2data = ((hybrid_fields - invoice2data_fields) / invoice2data_fields) * 100
            print(f"混合提取器 vs Invoice2Data: +{hybrid_vs_invoice2data:.1f}% 提升")
            improvements['hybrid_vs_invoice2data'] = f"+{hybrid_vs_invoice2data:.1f}%"
        else:
            print(f"混合提取器 vs Invoice2Data: Invoice2Data未提取到任何字段")
            improvements['hybrid_vs_invoice2data'] = "N/A"
        
        if enhanced_fields > 0:
            hybrid_vs_enhanced = ((hybrid_fields - enhanced_fields) / enhanced_fields) * 100
            if hybrid_vs_enhanced > 0:
                print(f"混合提取器 vs 增强提取器: +{hybrid_vs_enhanced:.1f}% 提升")
                improvements['hybrid_vs_enhanced'] = f"+{hybrid_vs_enhanced:.1f}%"
            else:
                print(f"混合提取器 vs 增强提取器: {hybrid_vs_enhanced:.1f}%")
                improvements['hybrid_vs_enhanced'] = f"{hybrid_vs_enhanced:.1f}%"
        
        # 分析关键字段改进
        print("\n关键字段改进:")
        field_improvements = {}
        
        for field, values in self.test_results['comparison'].items():
            invoice2data_value = values.get('invoice2data')
            hybrid_value = values.get('hybrid')
            
            if not invoice2data_value and hybrid_value:
                print(f"  ✓ {field}: 从未提取到 → 成功提取")
                field_improvements[field] = "新增提取"
            elif invoice2data_value and hybrid_value and invoice2data_value != hybrid_value:
                print(f"  ✓ {field}: 值已优化")
                field_improvements[field] = "值优化"
            elif invoice2data_value and not hybrid_value:
                print(f"  ✗ {field}: 提取能力退化")
                field_improvements[field] = "退化"
        
        improvements['field_improvements'] = field_improvements
        self.test_results['improvements'] = improvements
        
        # 总结
        print(f"\n{'='*60}")
        print("总结:")
        print(f"  Invoice2Data: {invoice2data_fields}/6 字段")
        print(f"  增强提取器: {enhanced_fields}/6 字段")
        print(f"  混合提取器: {hybrid_fields}/6 字段")
        
        if hybrid_fields >= max(invoice2data_fields, enhanced_fields):
            print("\n✅ 混合提取器成功结合了两种方法的优势！")
        else:
            print("\n⚠️ 混合提取器还需要进一步优化")
    
    def save_results(self, output_file: str):
        """保存测试结果"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2, default=str)
        print(f"\n测试结果已保存到: {output_file}")


async def main():
    """主函数"""
    # 获取测试PDF路径
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        # 默认测试文件
        pdf_path = "/Users/xumingyang/Downloads/invoices_summary/renamed_invoices/2024-10-01-南昌铁路文化传媒有限公司-150.00-14492324090000064644.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"错误: 文件不存在 - {pdf_path}")
        return
    
    # 创建测试器
    tester = ExtractorTester()
    
    # 运行测试
    await tester.test_all_extractors(pdf_path)
    
    # 保存结果
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"hybrid_extractor_test_results_{timestamp}.json"
    tester.save_results(output_file)


if __name__ == "__main__":
    asyncio.run(main())