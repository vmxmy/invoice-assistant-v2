#!/usr/bin/env python3
"""
使用本地downloads/下所有PDF进行Invoice2Data全面测试
"""

import asyncio
import logging
import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any
import json

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.service import OCRService
from app.services.ocr.config import OCRConfig

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


class AllPDFsTest:
    """本地所有PDF测试类"""
    
    def __init__(self):
        self.config = OCRConfig.from_settings()
        self.downloads_dir = Path('/Users/xumingyang/app/invoice_assist/downloads')
        self.pdf_files = []
        self.results = []
        self.summary_stats = {
            'total_files': 0,
            'processed_files': 0,
            'success_count': 0,
            'error_count': 0,
            'total_processing_time': 0,
            'successful_extractions': {},
            'failed_files': [],
            'field_extraction_stats': {}
        }
    
    def discover_pdf_files(self):
        """发现downloads目录下的所有PDF文件"""
        print(f"🔍 扫描目录: {self.downloads_dir}")
        
        if not self.downloads_dir.exists():
            print(f"❌ Downloads目录不存在: {self.downloads_dir}")
            return
        
        # 递归查找所有PDF文件
        self.pdf_files = list(self.downloads_dir.glob("**/*.pdf"))
        self.summary_stats['total_files'] = len(self.pdf_files)
        
        print(f"📄 发现 {len(self.pdf_files)} 个PDF文件:")
        for i, pdf_file in enumerate(self.pdf_files, 1):
            file_size = pdf_file.stat().st_size / 1024  # KB
            print(f"   {i:2d}. {pdf_file.name} ({file_size:.1f}KB)")
        print()
    
    async def test_all_pdfs_individually(self):
        """逐个测试所有PDF文件"""
        print("🔍 开始逐个测试所有PDF文件...")
        print("="*80)
        
        async with OCRService(self.config) as service:
            for i, pdf_file in enumerate(self.pdf_files, 1):
                print(f"\n📄 [{i}/{len(self.pdf_files)}] 处理: {pdf_file.name}")
                print("-" * 60)
                
                start_time = time.time()
                
                try:
                    # 提取发票数据
                    result = await service.extract_invoice_data(str(pdf_file))
                    processing_time = time.time() - start_time
                    
                    self.summary_stats['processed_files'] += 1
                    self.summary_stats['total_processing_time'] += processing_time
                    
                    # 分析结果
                    if result.get('status') == 'success':
                        self.summary_stats['success_count'] += 1
                        print(f"   ✅ 处理成功 ({processing_time:.3f}秒)")
                        print(f"   🎯 信心度: {result.get('confidence', 0):.2%}")
                        print(f"   📋 提取方法: {result.get('extraction_method', 'unknown')}")
                        
                        # 分析提取的字段
                        extracted_info = self._analyze_extracted_fields(result)
                        self._update_field_stats(extracted_info)
                        
                        # 显示关键信息
                        self._display_key_info(extracted_info)
                        
                        # 保存成功结果
                        self.summary_stats['successful_extractions'][pdf_file.name] = {
                            'processing_time': processing_time,
                            'confidence': result.get('confidence', 0),
                            'extracted_fields': extracted_info,
                            'raw_result': result
                        }
                        
                    else:
                        self.summary_stats['error_count'] += 1
                        error_msg = result.get('error', 'Unknown error')
                        print(f"   ❌ 处理失败: {error_msg}")
                        
                        # 记录失败文件
                        self.summary_stats['failed_files'].append({
                            'file': pdf_file.name,
                            'error': error_msg,
                            'processing_time': processing_time
                        })
                    
                    # 保存详细结果
                    self.results.append({
                        'file': pdf_file.name,
                        'file_path': str(pdf_file),
                        'status': result.get('status'),
                        'processing_time': processing_time,
                        'result': result
                    })
                    
                except Exception as e:
                    processing_time = time.time() - start_time
                    self.summary_stats['error_count'] += 1
                    error_msg = str(e)
                    
                    print(f"   ❌ 异常失败: {error_msg}")
                    
                    self.summary_stats['failed_files'].append({
                        'file': pdf_file.name,
                        'error': error_msg,
                        'processing_time': processing_time
                    })
                    
                    self.results.append({
                        'file': pdf_file.name,
                        'file_path': str(pdf_file),
                        'status': 'exception',
                        'processing_time': processing_time,
                        'error': error_msg
                    })
    
    async def test_batch_processing(self):
        """测试批量处理性能"""
        if not self.pdf_files:
            return
        
        print("\n" + "="*80)
        print("🔍 测试批量处理性能...")
        
        # 限制批量测试的文件数量（避免过长时间）
        batch_files = self.pdf_files[:min(10, len(self.pdf_files))]
        file_paths = [str(f) for f in batch_files]
        
        print(f"📊 批量处理 {len(batch_files)} 个文件...")
        
        async with OCRService(self.config) as service:
            start_time = time.time()
            
            try:
                results = await service.batch_extract_invoice_data(file_paths)
                total_time = time.time() - start_time
                
                success_count = sum(1 for r in results if r.status == 'success')
                
                print(f"   ✅ 批量处理完成")
                print(f"   📊 总时间: {total_time:.3f}秒")
                print(f"   🎯 成功率: {success_count}/{len(results)} ({success_count/len(results)*100:.1f}%)")
                print(f"   ⏱️ 平均时间: {total_time/len(results):.3f}秒/文件")
                print(f"   🚀 吞吐量: {len(results)/total_time:.1f}文件/秒")
                
            except Exception as e:
                print(f"   ❌ 批量处理失败: {e}")
    
    def _analyze_extracted_fields(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """分析提取的字段"""
        extracted = {}
        
        # 关键字段列表
        key_fields = [
            'invoice_number', 'invoice_date', 'seller_name', 'buyer_name',
            'total_amount', 'amount', 'tax_amount', 'amount_in_words',
            'seller_tax_id', 'buyer_tax_id', 'issuer_person'
        ]
        
        for field in key_fields:
            value = result.get(field)
            if value is not None and str(value).strip():
                extracted[field] = value
        
        return extracted
    
    def _update_field_stats(self, extracted_info: Dict[str, Any]):
        """更新字段提取统计"""
        for field in extracted_info.keys():
            if field not in self.summary_stats['field_extraction_stats']:
                self.summary_stats['field_extraction_stats'][field] = 0
            self.summary_stats['field_extraction_stats'][field] += 1
    
    def _display_key_info(self, extracted_info: Dict[str, Any]):
        """显示关键提取信息"""
        if extracted_info.get('invoice_number'):
            print(f"   🔢 发票号码: {extracted_info['invoice_number']}")
        if extracted_info.get('seller_name'):
            print(f"   🏢 销售方: {extracted_info['seller_name']}")
        if extracted_info.get('buyer_name'):
            print(f"   🏛️ 购买方: {extracted_info['buyer_name']}")
        if extracted_info.get('total_amount'):
            print(f"   💰 总金额: ¥{extracted_info['total_amount']}")
        if extracted_info.get('invoice_date'):
            print(f"   📅 开票日期: {extracted_info['invoice_date']}")
        
        print(f"   📋 提取字段: {len(extracted_info)}个")
    
    def generate_detailed_report(self):
        """生成详细报告"""
        print("\n" + "="*80)
        print("📊 详细测试报告")
        print("="*80)
        
        # 基础统计
        print(f"📈 基础统计:")
        print(f"   总文件数: {self.summary_stats['total_files']}")
        print(f"   已处理数: {self.summary_stats['processed_files']}")
        print(f"   成功处理: {self.summary_stats['success_count']}")
        print(f"   失败处理: {self.summary_stats['error_count']}")
        
        if self.summary_stats['processed_files'] > 0:
            success_rate = self.summary_stats['success_count'] / self.summary_stats['processed_files'] * 100
            print(f"   成功率: {success_rate:.1f}%")
        
        # 性能统计
        if self.summary_stats['total_processing_time'] > 0:
            print(f"\n⏱️ 性能统计:")
            print(f"   总处理时间: {self.summary_stats['total_processing_time']:.3f}秒")
            avg_time = self.summary_stats['total_processing_time'] / self.summary_stats['processed_files']
            print(f"   平均处理时间: {avg_time:.3f}秒/文件")
            throughput = self.summary_stats['processed_files'] / self.summary_stats['total_processing_time']
            print(f"   处理吞吐量: {throughput:.1f}文件/秒")
        
        # 字段提取统计
        if self.summary_stats['field_extraction_stats']:
            print(f"\n📋 字段提取统计:")
            sorted_fields = sorted(
                self.summary_stats['field_extraction_stats'].items(),
                key=lambda x: x[1],
                reverse=True
            )
            for field, count in sorted_fields:
                percentage = count / self.summary_stats['success_count'] * 100 if self.summary_stats['success_count'] > 0 else 0
                print(f"   {field:15s}: {count:2d}/{self.summary_stats['success_count']:2d} ({percentage:5.1f}%)")
        
        # 成功文件详情
        if self.summary_stats['successful_extractions']:
            print(f"\n✅ 成功处理的文件 ({len(self.summary_stats['successful_extractions'])}个):")
            for filename, info in self.summary_stats['successful_extractions'].items():
                print(f"   📄 {filename}")
                print(f"      ⏱️ 处理时间: {info['processing_time']:.3f}秒")
                print(f"      🎯 信心度: {info['confidence']:.2%}")
                print(f"      📋 提取字段: {len(info['extracted_fields'])}个")
        
        # 失败文件详情
        if self.summary_stats['failed_files']:
            print(f"\n❌ 失败处理的文件 ({len(self.summary_stats['failed_files'])}个):")
            for failed in self.summary_stats['failed_files']:
                print(f"   📄 {failed['file']}")
                print(f"      ❌ 错误: {failed['error'][:100]}...")
                print(f"      ⏱️ 耗时: {failed['processing_time']:.3f}秒")
        
        # 总体评估
        print(f"\n🏆 Invoice2Data整体评估:")
        if self.summary_stats['processed_files'] > 0:
            success_rate = self.summary_stats['success_count'] / self.summary_stats['processed_files'] * 100
            
            if success_rate >= 90:
                rating = "🌟🌟🌟🌟🌟 优秀"
                conclusion = "完全适合生产环境"
            elif success_rate >= 75:
                rating = "🌟🌟🌟🌟⭐ 良好"
                conclusion = "适合生产环境，可能需要少量模板优化"
            elif success_rate >= 60:
                rating = "🌟🌟🌟⭐⭐ 中等"
                conclusion = "部分适合，需要模板优化"
            else:
                rating = "🌟🌟⭐⭐⭐ 待改进"
                conclusion = "需要大量模板优化"
            
            print(f"   📊 成功率: {success_rate:.1f}% - {rating}")
            print(f"   💡 建议: {conclusion}")
        
        # 保存详细结果到文件
        self._save_results_to_file()
    
    def _save_results_to_file(self):
        """保存结果到文件"""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        results_file = f"invoice2data_test_results_{timestamp}.json"
        
        # 准备保存的数据
        save_data = {
            'timestamp': timestamp,
            'summary_stats': self.summary_stats,
            'detailed_results': self.results
        }
        
        try:
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(save_data, f, ensure_ascii=False, indent=2, default=str)
            
            print(f"\n💾 详细结果已保存到: {results_file}")
            
        except Exception as e:
            print(f"\n❌ 保存结果文件失败: {e}")


async def main():
    """主测试函数"""
    print("🚀 启动Invoice2Data本地PDF全面测试")
    print("="*80)
    
    tester = AllPDFsTest()
    
    # 发现PDF文件
    tester.discover_pdf_files()
    
    if not tester.pdf_files:
        print("❌ 未发现任何PDF文件，测试结束")
        return
    
    # 逐个测试所有PDF
    await tester.test_all_pdfs_individually()
    
    # 批量处理测试
    await tester.test_batch_processing()
    
    # 生成详细报告
    tester.generate_detailed_report()


if __name__ == "__main__":
    asyncio.run(main())