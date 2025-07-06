#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试增强规则提取器在所有90个PDF文件上的性能
验证100%成功率声明
"""

import os
import json
import glob
from datetime import datetime
from test_enhanced_standalone import StandaloneEnhancedExtractor

def find_all_pdfs():
    """找到所有PDF文件"""
    pdf_files = []
    
    # 在downloads目录及其子目录中查找所有PDF文件
    for pattern in ["downloads/*.pdf", "downloads/*/*.pdf", "downloads/*/*/*.pdf"]:
        pdf_files.extend(glob.glob(pattern))
    
    return sorted(pdf_files)

def test_all_pdfs():
    """测试所有PDF文件"""
    extractor = StandaloneEnhancedExtractor()
    
    # 获取所有PDF文件
    pdf_files = find_all_pdfs()
    
    print("增强规则提取器 - 全量PDF测试")
    print("="*80)
    print(f"发现 {len(pdf_files)} 个PDF文件")
    print("测试目标: 验证100%成功率")
    print("-"*80)
    
    results = []
    success_count = 0
    field_counts = {
        'invoice_number': 0,
        'invoice_date': 0, 
        'buyer_name': 0,
        'seller_name': 0,
        'total_amount': 0,
        'project_name': 0
    }
    
    start_time = datetime.now()
    
    for i, file_path in enumerate(pdf_files, 1):
        if not os.path.exists(file_path):
            continue
            
        print(f"\n[{i}/{len(pdf_files)}] 测试: {os.path.basename(file_path)}")
        
        # 提取发票信息
        file_start_time = datetime.now()
        result = extractor.extract_from_pdf(file_path)
        file_end_time = datetime.now()
        
        processing_time = (file_end_time - file_start_time).total_seconds()
        result['processing_time'] = processing_time
        result['file_index'] = i
        result['relative_path'] = file_path
        
        results.append(result)
        
        if result.get('success'):
            success_count += 1
            print("  ✅ 成功")
            
            # 统计字段提取情况
            for field in field_counts:
                if result.get(field):
                    field_counts[field] += 1
            
            # 显示关键信息
            if result.get('invoice_number'):
                print(f"    发票号码: {result['invoice_number']}")
            if result.get('buyer_name'):
                print(f"    购买方: {result['buyer_name']}")
            if result.get('total_amount'):
                print(f"    金额: ¥{result['total_amount']}")
            if result.get('project_name'):
                print(f"    项目: {result['project_name']}")
                
        else:
            print(f"  ❌ 失败: {result.get('error', '未知错误')}")
        
        print(f"    处理时间: {processing_time:.3f}秒")
    
    end_time = datetime.now()
    total_time = (end_time - start_time).total_seconds()
    
    # 计算统计信息
    success_rate = (success_count / len(pdf_files) * 100) if pdf_files else 0
    avg_processing_time = total_time / len(pdf_files) if pdf_files else 0
    
    print("\n" + "="*80)
    print("测试总结")
    print("="*80)
    print(f"总文件数: {len(pdf_files)}")
    print(f"成功数量: {success_count}")
    print(f"失败数量: {len(pdf_files) - success_count}")
    print(f"成功率: {success_rate:.1f}%")
    print(f"总处理时间: {total_time:.2f}秒")
    print(f"平均处理时间: {avg_processing_time:.3f}秒/文件")
    
    # 字段提取率统计
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
        rate = (count / success_count * 100) if success_count > 0 else 0
        field_name = field_names.get(field, field)
        print(f"  {field_name}: {count}/{success_count} ({rate:.1f}%)")
    
    # 失败文件统计
    failed_files = [r for r in results if not r.get('success')]
    if failed_files:
        print(f"\n失败文件 ({len(failed_files)}):")
        for result in failed_files:
            print(f"  - {os.path.basename(result.get('relative_path', ''))}: {result.get('error', '未知错误')}")
    
    # 保存详细结果
    output_file = f"enhanced_rule_all_pdfs_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    summary = {
        'test_info': {
            'test_type': 'enhanced_rule_all_pdfs',
            'description': '增强规则提取器全量PDF测试',
            'test_time': datetime.now().isoformat(),
            'total_files': len(pdf_files),
            'success_count': success_count,
            'failure_count': len(pdf_files) - success_count,
            'success_rate': f"{success_rate:.1f}%",
            'total_processing_time': total_time,
            'average_processing_time': avg_processing_time
        },
        'field_extraction_rates': {
            field_names[field]: {
                'count': count,
                'rate': f"{(count / success_count * 100) if success_count > 0 else 0:.1f}%"
            }
            for field, count in field_counts.items()
        },
        'failed_files': [
            {
                'file': os.path.basename(r.get('relative_path', '')),
                'error': r.get('error', '未知错误'),
                'processing_time': r.get('processing_time', 0)
            }
            for r in failed_files
        ],
        'detailed_results': results
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细结果已保存到: {output_file}")
    
    # 验证100%成功率声明
    print("\n" + "="*80)
    if success_rate == 100.0:
        print("🎉 验证成功: 增强规则提取器达到100%成功率!")
        print("✅ 所有PDF文件处理成功")
    else:
        print(f"⚠️  验证失败: 成功率为 {success_rate:.1f}%，未达到100%")
        print(f"❌ {len(failed_files)} 个文件处理失败")
    
    return results, success_rate

if __name__ == "__main__":
    test_all_pdfs()