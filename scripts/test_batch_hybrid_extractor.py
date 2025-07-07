#!/usr/bin/env python3
"""
批量测试混合提取器的改进效果
测试多个PDF文件，生成综合报告
"""

import asyncio
import json
import os
import glob
from datetime import datetime
from pathlib import Path
import sys

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.config import OCRConfig
from app.services.ocr.invoice2data_client import Invoice2DataClient
from app.services.ocr.enhanced_rule_extractor import EnhancedRuleExtractor
from app.services.ocr.hybrid_invoice_extractor import HybridInvoiceExtractor


class BatchExtractorTester:
    """批量提取器测试类"""
    
    def __init__(self):
        self.config = OCRConfig.from_settings()
        self.test_results = {
            'test_time': datetime.now().isoformat(),
            'summary': {
                'total_files': 0,
                'extractors': {
                    'invoice2data': {'success': 0, 'failed': 0, 'total_fields': 0},
                    'enhanced': {'success': 0, 'failed': 0, 'total_fields': 0},
                    'hybrid': {'success': 0, 'failed': 0, 'total_fields': 0}
                }
            },
            'files': [],
            'field_success_rates': {},
            'overall_improvements': {}
        }
    
    async def test_batch(self, pdf_paths: list):
        """批量测试多个PDF文件"""
        self.test_results['summary']['total_files'] = len(pdf_paths)
        
        print(f"\n{'='*80}")
        print(f"批量测试 {len(pdf_paths)} 个PDF文件")
        print(f"{'='*80}\n")
        
        # 初始化提取器
        invoice2data_client = Invoice2DataClient(self.config)
        enhanced_extractor = EnhancedRuleExtractor(self.config)
        hybrid_extractor = HybridInvoiceExtractor(self.config)
        
        # 测试每个文件
        for i, pdf_path in enumerate(pdf_paths, 1):
            print(f"\n[{i}/{len(pdf_paths)}] 测试文件: {os.path.basename(pdf_path)}")
            print("-" * 60)
            
            file_result = {
                'file_path': pdf_path,
                'file_name': os.path.basename(pdf_path),
                'extractors': {}
            }
            
            # 测试三个提取器
            for name, extractor in [
                ('invoice2data', invoice2data_client),
                ('enhanced', enhanced_extractor),
                ('hybrid', hybrid_extractor)
            ]:
                result = await self._test_single_extractor(name, extractor, pdf_path)
                file_result['extractors'][name] = result
                
                # 更新统计
                if result['status'] == 'success':
                    self.test_results['summary']['extractors'][name]['success'] += 1
                    self.test_results['summary']['extractors'][name]['total_fields'] += result['fields_count']
                else:
                    self.test_results['summary']['extractors'][name]['failed'] += 1
            
            self.test_results['files'].append(file_result)
            
            # 显示对比
            self._display_file_comparison(file_result)
        
        # 计算总体改进
        self._calculate_overall_improvements()
        
        # 显示总结
        self._display_summary()
    
    async def _test_single_extractor(self, name: str, extractor, pdf_path: str):
        """测试单个提取器"""
        try:
            result = await extractor.extract_invoice_data(pdf_path)
            
            if result.get('status') == 'success':
                data = result.get('structured_data', {})
                if hasattr(data, 'model_dump'):
                    data = data.model_dump()
                elif hasattr(data, 'dict'):
                    data = data.dict()
                
                key_fields = self._extract_key_fields(data)
                fields_count = sum(1 for v in key_fields.values() if v)
                
                return {
                    'status': 'success',
                    'fields_count': fields_count,
                    'key_fields': key_fields
                }
            else:
                return {
                    'status': 'failed',
                    'fields_count': 0,
                    'error': result.get('error', '未知错误')
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'fields_count': 0,
                'error': str(e)
            }
    
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
            try:
                key_fields['total_amount'] = f"{float(data['total_amount']):.2f}"
            except:
                key_fields['total_amount'] = str(data['total_amount'])
        
        return key_fields
    
    def _display_file_comparison(self, file_result):
        """显示单个文件的对比结果"""
        extractors = ['invoice2data', 'enhanced', 'hybrid']
        
        print(f"\n提取结果:")
        for name in extractors:
            result = file_result['extractors'][name]
            if result['status'] == 'success':
                print(f"  {name:15} ✓ 提取到 {result['fields_count']}/6 字段")
            else:
                print(f"  {name:15} ✗ 失败")
    
    def _calculate_overall_improvements(self):
        """计算总体改进"""
        # 计算每个字段的成功率
        fields = ['invoice_number', 'invoice_date', 'seller_name', 'buyer_name', 'total_amount', 'project_name']
        
        for field in fields:
            self.test_results['field_success_rates'][field] = {}
            
            for extractor in ['invoice2data', 'enhanced', 'hybrid']:
                success_count = 0
                total_count = 0
                
                for file_result in self.test_results['files']:
                    extractor_result = file_result['extractors'][extractor]
                    if extractor_result['status'] == 'success':
                        total_count += 1
                        if extractor_result.get('key_fields', {}).get(field):
                            success_count += 1
                
                if total_count > 0:
                    success_rate = (success_count / total_count) * 100
                    self.test_results['field_success_rates'][field][extractor] = {
                        'success': success_count,
                        'total': total_count,
                        'rate': f"{success_rate:.1f}%"
                    }
    
    def _display_summary(self):
        """显示总结"""
        print(f"\n\n{'='*80}")
        print("批量测试总结")
        print(f"{'='*80}\n")
        
        # 总体成功率
        print("总体提取成功率:")
        for name in ['invoice2data', 'enhanced', 'hybrid']:
            stats = self.test_results['summary']['extractors'][name]
            total = stats['success'] + stats['failed']
            if total > 0:
                success_rate = (stats['success'] / total) * 100
                avg_fields = stats['total_fields'] / stats['success'] if stats['success'] > 0 else 0
                print(f"  {name:15} {success_rate:5.1f}% ({stats['success']}/{total}) 平均字段数: {avg_fields:.1f}")
        
        # 字段成功率
        print(f"\n各字段提取成功率:")
        print(f"{'字段':<20} {'Invoice2Data':>15} {'增强提取器':>15} {'混合提取器':>15}")
        print("-" * 70)
        
        for field, rates in self.test_results['field_success_rates'].items():
            field_display = field.replace('_', ' ').title()
            invoice2data_rate = rates.get('invoice2data', {}).get('rate', 'N/A')
            enhanced_rate = rates.get('enhanced', {}).get('rate', 'N/A')
            hybrid_rate = rates.get('hybrid', {}).get('rate', 'N/A')
            print(f"{field_display:<20} {invoice2data_rate:>15} {enhanced_rate:>15} {hybrid_rate:>15}")
        
        # 改进分析
        print(f"\n改进效果:")
        
        # 计算平均字段提取数的提升
        invoice2data_avg = self.test_results['summary']['extractors']['invoice2data']['total_fields'] / max(1, self.test_results['summary']['extractors']['invoice2data']['success'])
        enhanced_avg = self.test_results['summary']['extractors']['enhanced']['total_fields'] / max(1, self.test_results['summary']['extractors']['enhanced']['success'])
        hybrid_avg = self.test_results['summary']['extractors']['hybrid']['total_fields'] / max(1, self.test_results['summary']['extractors']['hybrid']['success'])
        
        if invoice2data_avg > 0:
            improvement_vs_invoice2data = ((hybrid_avg - invoice2data_avg) / invoice2data_avg) * 100
            print(f"  混合提取器 vs Invoice2Data: +{improvement_vs_invoice2data:.1f}% 平均字段提取提升")
        
        if enhanced_avg > 0:
            improvement_vs_enhanced = ((hybrid_avg - enhanced_avg) / enhanced_avg) * 100
            if improvement_vs_enhanced > 0:
                print(f"  混合提取器 vs 增强提取器: +{improvement_vs_enhanced:.1f}% 平均字段提取提升")
            else:
                print(f"  混合提取器 vs 增强提取器: {improvement_vs_enhanced:.1f}% 平均字段提取")
        
        # 关键发现
        print(f"\n关键发现:")
        
        # 找出混合提取器改进最大的字段
        max_improvement_field = None
        max_improvement = 0
        
        for field, rates in self.test_results['field_success_rates'].items():
            if 'invoice2data' in rates and 'hybrid' in rates:
                invoice2data_success = rates['invoice2data']['success']
                hybrid_success = rates['hybrid']['success']
                if invoice2data_success < hybrid_success:
                    improvement = hybrid_success - invoice2data_success
                    if improvement > max_improvement:
                        max_improvement = improvement
                        max_improvement_field = field
        
        if max_improvement_field:
            print(f"  ✓ 最大改进字段: {max_improvement_field} (+{max_improvement} 个文件)")
        
        # 总结
        if hybrid_avg >= max(invoice2data_avg, enhanced_avg):
            print(f"\n✅ 混合提取器成功结合了两种方法的优势，提供了最佳的提取效果！")
        else:
            print(f"\n⚠️ 混合提取器还需要进一步优化")
    
    def save_results(self, output_file: str):
        """保存测试结果"""
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2, default=str)
        print(f"\n详细测试结果已保存到: {output_file}")


async def main():
    """主函数"""
    # 获取要测试的PDF文件
    if len(sys.argv) > 1:
        # 如果提供了具体路径
        pdf_paths = sys.argv[1:]
    else:
        # 使用默认的测试目录
        test_dir = "/Users/xumingyang/Downloads/selected_invoices_20250321114536"
        if os.path.exists(test_dir):
            pdf_paths = glob.glob(os.path.join(test_dir, "*.pdf"))[:10]  # 测试前10个文件
        else:
            print("错误: 未找到测试文件")
            return
    
    # 过滤不存在的文件
    pdf_paths = [p for p in pdf_paths if os.path.exists(p)]
    
    if not pdf_paths:
        print("错误: 没有找到可测试的PDF文件")
        return
    
    # 创建测试器
    tester = BatchExtractorTester()
    
    # 运行批量测试
    await tester.test_batch(pdf_paths)
    
    # 保存结果
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"batch_hybrid_test_results_{timestamp}.json"
    tester.save_results(output_file)


if __name__ == "__main__":
    asyncio.run(main())