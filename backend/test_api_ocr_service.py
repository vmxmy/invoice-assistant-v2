#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试API服务层使用增强规则提取器
"""

import asyncio
import os
from app.services.ocr import OCRService
from app.services.ocr.config import OCRConfig

async def test_api_ocr_service():
    """测试API OCR服务"""
    
    print("测试API服务层的OCR服务")
    print("="*60)
    
    # 创建OCR配置（增强规则不需要API token）
    config = OCRConfig(api_token="dummy")  # 增强规则不需要真实token
    
    # 创建OCR服务（现在应该是增强规则提取器）
    ocr_service = OCRService(config)
    
    print(f"OCR服务类型: {type(ocr_service).__name__}")
    print(f"OCR服务模块: {type(ocr_service).__module__}")
    
    # 测试几个PDF文件
    test_files = [
        "downloads/25432000000031789815.pdf",  # 垂直文本
        "downloads/25442000000101203423.pdf",  # 垂直文本
        "downloads/25359134169000052039.pdf",  # 火车票
    ]
    
    for file_path in test_files:
        if not os.path.exists(file_path):
            continue
            
        print(f"\n测试文件: {os.path.basename(file_path)}")
        print("-"*40)
        
        try:
            result = await ocr_service.extract_invoice_data(file_path)
            
            if result.get('status') == 'success':
                print("  ✅ 成功提取")
                
                # 检查是否有结构化数据
                structured_data = result.get('structured_data')
                if structured_data:
                    print(f"    发票号码: {structured_data.main_info.invoice_number}")
                    print(f"    开票日期: {structured_data.main_info.invoice_date}")
                    print(f"    购买方: {structured_data.buyer_info.name}")
                    if structured_data.summary.total_amount:
                        print(f"    金额: ¥{structured_data.summary.total_amount}")
                    if hasattr(structured_data, 'project_name') and structured_data.project_name:
                        print(f"    项目: {structured_data.project_name}")
                
                print(f"    提取方法: {result.get('extraction_method', 'unknown')}")
                print(f"    处理时间: {result.get('processing_time', 0):.3f}秒")
                print(f"    置信度: {result.get('confidence', 0):.2f}")
            else:
                print(f"  ❌ 失败: {result.get('error')}")
                
        except Exception as e:
            print(f"  ❌ 异常: {e}")
    
    # 测试健康检查
    print(f"\n健康检查:")
    try:
        health = await ocr_service.health_check()
        print(f"  健康状态: {'✅ 正常' if health else '❌ 异常'}")
    except Exception as e:
        print(f"  健康检查异常: {e}")
    
    # 获取统计信息
    print(f"\n服务统计:")
    try:
        stats = ocr_service.get_statistics()
        print(f"  服务类型: {stats.get('service_type')}")
        print(f"  描述: {stats.get('description')}")
        if 'features' in stats:
            print("  特性:")
            for feature in stats['features']:
                print(f"    - {feature}")
        if 'test_results' in stats:
            print("  测试结果:")
            print(f"    成功率: {stats['test_results'].get('success_rate')}")
    except Exception as e:
        print(f"  统计信息获取异常: {e}")

async def test_batch_processing():
    """测试批量处理"""
    
    print(f"\n批量处理测试:")
    print("="*60)
    
    config = OCRConfig(api_token="dummy")
    ocr_service = OCRService(config)
    
    # 获取前5个PDF文件
    test_files = []
    for root, dirs, files in os.walk("downloads"):
        for file in files:
            if file.endswith('.pdf'):
                test_files.append(os.path.join(root, file))
                if len(test_files) >= 5:
                    break
        if len(test_files) >= 5:
            break
    
    if test_files:
        print(f"批量处理 {len(test_files)} 个文件...")
        
        start_time = asyncio.get_event_loop().time()
        results = await ocr_service.batch_extract_invoice_data(test_files)
        end_time = asyncio.get_event_loop().time()
        
        success_count = sum(1 for r in results if r.get('status') == 'success')
        total_time = end_time - start_time
        
        print(f"批量处理结果:")
        print(f"  总文件数: {len(test_files)}")
        print(f"  成功数量: {success_count}")
        print(f"  成功率: {success_count/len(test_files)*100:.1f}%")
        print(f"  总耗时: {total_time:.2f}秒")
        print(f"  平均耗时: {total_time/len(test_files):.3f}秒/文件")
    else:
        print("  ❌ 未找到测试文件")

if __name__ == "__main__":
    asyncio.run(test_api_ocr_service())
    asyncio.run(test_batch_processing())