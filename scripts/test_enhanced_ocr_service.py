#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试增强OCR服务
"""

import os
import json
from datetime import datetime
from app.services.ocr.enhanced_ocr_service import EnhancedOCRService

def test_enhanced_service():
    """测试增强OCR服务"""
    service = EnhancedOCRService()
    
    # 测试问题文件（之前失败的垂直文本）
    test_files = [
        "downloads/25432000000031789815.pdf",  # 垂直文本
        "downloads/25442000000101203423.pdf",  # 垂直文本
        "downloads/25432000000022020617-杭州趣链科技有限公司.pdf",  # 正常文件
        "downloads/25439165666000019624.pdf",  # 火车票
    ]
    
    print("增强OCR服务测试")
    print("="*60)
    
    # 显示服务统计信息
    stats = service.get_statistics()
    print(f"服务类型: {stats['service_type']}")
    print(f"描述: {stats['description']}")
    print("特性:", ", ".join(stats['features']))
    print(f"测试结果: {stats['test_results']['success_rate']} 成功率")
    
    print("\n单文件测试:")
    print("-"*60)
    
    results = []
    
    for file_path in test_files:
        if not os.path.exists(file_path):
            continue
            
        print(f"\n测试文件: {os.path.basename(file_path)}")
        
        # 使用同步版本测试
        result = service.extract_invoice_data_sync(file_path)
        results.append(result)
        
        if result['status'] == 'success':
            print("✅ 成功提取")
            
            # 显示结构化数据
            structured_data = result.get('structured_data')
            if structured_data:
                main_info = structured_data.main_info
                buyer_info = structured_data.buyer_info
                seller_info = structured_data.seller_info
                summary = structured_data.summary
                
                print(f"  发票号码: {main_info.invoice_number}")
                print(f"  开票日期: {main_info.invoice_date}")
                print(f"  发票类型: {main_info.invoice_type}")
                if buyer_info.name:
                    print(f"  购买方: {buyer_info.name}")
                if seller_info.name:
                    print(f"  销售方: {seller_info.name}")
                if summary.total_amount:
                    print(f"  金额: ¥{summary.total_amount}")
                if hasattr(structured_data, 'project_name') and structured_data.project_name:
                    print(f"  项目: {structured_data.project_name}")
            
            print(f"  处理时间: {result.get('processing_time', 0):.3f}秒")
            print(f"  置信度: {result.get('confidence', 0):.2f}")
        else:
            print(f"❌ 失败: {result.get('error')}")
    
    # 统计
    print(f"\n测试统计:")
    print("-"*60)
    success_count = sum(1 for r in results if r['status'] == 'success')
    print(f"成功率: {success_count}/{len(results)} ({success_count/len(results)*100:.1f}%)")
    
    # 字段统计
    if success_count > 0:
        field_counts = {}
        for result in results:
            if result['status'] == 'success':
                structured_data = result.get('structured_data')
                if structured_data:
                    # 检查各字段是否提取成功
                    if structured_data.main_info.invoice_number:
                        field_counts['invoice_number'] = field_counts.get('invoice_number', 0) + 1
                    if structured_data.main_info.invoice_date:
                        field_counts['invoice_date'] = field_counts.get('invoice_date', 0) + 1
                    if structured_data.buyer_info.name:
                        field_counts['buyer_name'] = field_counts.get('buyer_name', 0) + 1
                    if structured_data.seller_info.name:
                        field_counts['seller_name'] = field_counts.get('seller_name', 0) + 1
                    if structured_data.summary.total_amount:
                        field_counts['total_amount'] = field_counts.get('total_amount', 0) + 1
                    if hasattr(structured_data, 'project_name') and structured_data.project_name:
                        field_counts['project_name'] = field_counts.get('project_name', 0) + 1
        
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
            rate = count / success_count * 100
            field_name = field_names.get(field, field)
            print(f"  {field_name}: {count}/{success_count} ({rate:.1f}%)")
    
    # 保存结果
    output_file = f"enhanced_ocr_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    # 序列化结果
    serializable_results = []
    for result in results:
        serializable_result = result.copy()
        if 'structured_data' in serializable_result:
            # 将结构化数据转换为字典
            structured_data = serializable_result['structured_data']
            serializable_result['structured_data'] = {
                'main_info': {
                    'invoice_number': structured_data.main_info.invoice_number,
                    'invoice_date': str(structured_data.main_info.invoice_date) if structured_data.main_info.invoice_date else None,
                    'invoice_type': structured_data.main_info.invoice_type
                },
                'buyer_info': {
                    'name': structured_data.buyer_info.name
                },
                'seller_info': {
                    'name': structured_data.seller_info.name
                },
                'summary': {
                    'total_amount': structured_data.summary.total_amount
                },
                'project_name': getattr(structured_data, 'project_name', None)
            }
        serializable_results.append(serializable_result)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'service_stats': stats,
            'test_results': serializable_results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n结果已保存到: {output_file}")

if __name__ == "__main__":
    test_enhanced_service()