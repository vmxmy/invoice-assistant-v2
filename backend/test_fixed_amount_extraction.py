#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
测试修复后的金额提取功能
"""

from test_enhanced_standalone import StandaloneEnhancedExtractor
import json

def test_fixed_amount_extraction():
    """测试修复后的金额提取"""
    
    extractor = StandaloneEnhancedExtractor()
    
    # 测试之前失败的火车票文件
    test_files = [
        "downloads/25359134169000052039.pdf",  # ￥35.50
        "downloads/25429165848000790553.pdf",  # ￥377.00  
        "downloads/25439122799000011090.pdf",  # ￥339.00
        "downloads/25439165660000008536.pdf",  # 应该有金额
        "downloads/25439165666000015358.pdf",  # 应该有金额
    ]
    
    print("测试修复后的火车票金额提取")
    print("="*60)
    
    results = []
    success_count = 0
    
    for i, file_path in enumerate(test_files, 1):
        print(f"\n[{i}] 测试: {file_path}")
        
        result = extractor.extract_from_pdf(file_path)
        results.append(result)
        
        if result.get('success'):
            print("  ✅ 提取成功")
            print(f"    发票号码: {result.get('invoice_number')}")
            print(f"    发票类型: {result.get('invoice_type')}")
            
            if result.get('total_amount'):
                print(f"    金额: ¥{result.get('total_amount')} ✅")
                success_count += 1
            else:
                print(f"    金额: 未提取到 ❌")
        else:
            print(f"  ❌ 提取失败: {result.get('error')}")
    
    print(f"\n火车票金额提取测试结果:")
    print(f"  测试文件: {len(test_files)}")
    print(f"  金额提取成功: {success_count}")
    print(f"  成功率: {success_count/len(test_files)*100:.1f}%")
    
    return results

def test_all_amount_extraction():
    """重新测试所有文件的金额提取"""
    
    # 读取之前的测试结果
    with open('enhanced_rule_all_pdfs_test_20250706_102034.json', 'r', encoding='utf-8') as f:
        old_test_data = json.load(f)
    
    # 找到之前金额为null的文件
    missing_amount_files = []
    for result in old_test_data['detailed_results']:
        if result.get('success') and not result.get('total_amount'):
            missing_amount_files.append(result['relative_path'])
    
    print(f"\n重新测试之前失败的{len(missing_amount_files)}个文件")
    print("="*60)
    
    extractor = StandaloneEnhancedExtractor()
    fixed_count = 0
    
    for i, file_path in enumerate(missing_amount_files[:10], 1):  # 测试前10个
        print(f"\n[{i}] 重新测试: {file_path}")
        
        result = extractor.extract_from_pdf(file_path)
        
        if result.get('success') and result.get('total_amount'):
            print(f"  ✅ 修复成功! 金额: ¥{result.get('total_amount')}")
            fixed_count += 1
        else:
            print(f"  ❌ 仍然失败")
    
    print(f"\n修复结果:")
    print(f"  重新测试: {min(10, len(missing_amount_files))} 个文件")
    print(f"  修复成功: {fixed_count}")
    print(f"  修复率: {fixed_count/min(10, len(missing_amount_files))*100:.1f}%")

if __name__ == "__main__":
    test_fixed_amount_extraction()
    test_all_amount_extraction()