#!/usr/bin/env python3
"""分析API响应格式的使用情况"""
import os
import re
from collections import defaultdict
from pathlib import Path


def analyze_endpoint_file(file_path):
    """分析单个端点文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取文件名
    filename = os.path.basename(file_path)
    
    # 查找所有的路由装饰器
    route_pattern = r'@router\.(get|post|put|delete|patch)\s*\([^)]*\)'
    routes = re.findall(route_pattern, content, re.MULTILINE | re.DOTALL)
    
    # 查找response_model的使用
    response_model_pattern = r'@router\.(get|post|put|delete|patch)\s*\([^)]*response_model\s*=\s*([^,\)]+)'
    response_models = re.findall(response_model_pattern, content, re.MULTILINE | re.DOTALL)
    
    # 查找success_response的使用
    success_response_count = content.count('success_response(')
    error_response_count = content.count('error_response(')
    
    # 查找直接返回字典的模式
    direct_dict_pattern = r'return\s+\{[^}]*["\']message["\']\s*:'
    direct_dict_count = len(re.findall(direct_dict_pattern, content, re.MULTILINE))
    
    # 查找直接返回对象的模式
    direct_return_pattern = r'return\s+(?!success_response|error_response|\{)[A-Za-z]'
    direct_return_count = len(re.findall(direct_return_pattern, content))
    
    return {
        'filename': filename,
        'total_routes': len(routes),
        'response_model_count': len(response_models),
        'response_models': [model[1].strip() for model in response_models],
        'success_response_count': success_response_count,
        'error_response_count': error_response_count,
        'direct_dict_count': direct_dict_count,
        'direct_return_count': direct_return_count
    }


def main():
    # 端点目录
    endpoints_dir = Path("/Users/xumingyang/app/invoice_assist/v2/backend/app/api/v1/endpoints")
    
    # 分析所有Python文件
    results = []
    for file_path in endpoints_dir.glob("*.py"):
        if file_path.name != "__init__.py":
            result = analyze_endpoint_file(file_path)
            results.append(result)
    
    # 打印详细分析
    print("=" * 80)
    print("API响应格式分析报告")
    print("=" * 80)
    
    # 统计总数
    total_routes = sum(r['total_routes'] for r in results)
    total_response_model = sum(r['response_model_count'] for r in results)
    total_success_response = sum(r['success_response_count'] for r in results)
    total_error_response = sum(r['error_response_count'] for r in results)
    total_direct_dict = sum(r['direct_dict_count'] for r in results)
    total_direct_return = sum(r['direct_return_count'] for r in results)
    
    print(f"\n总体统计:")
    print(f"  总路由数: {total_routes}")
    print(f"  使用response_model: {total_response_model}")
    print(f"  使用success_response: {total_success_response}")
    print(f"  使用error_response: {total_error_response}")
    print(f"  直接返回字典: {total_direct_dict}")
    print(f"  直接返回对象: {total_direct_return}")
    
    print(f"\n使用比例:")
    if total_routes > 0:
        print(f"  response_model: {total_response_model/total_routes*100:.1f}%")
        print(f"  success_response: {total_success_response/total_routes*100:.1f}%")
    
    # 按文件分组
    print("\n" + "=" * 80)
    print("文件详细分析:")
    print("=" * 80)
    
    # 分类文件
    response_model_files = []
    success_response_files = []
    mixed_files = []
    other_files = []
    
    for result in sorted(results, key=lambda x: x['filename']):
        if result['response_model_count'] > 0 and result['success_response_count'] > 0:
            mixed_files.append(result)
        elif result['response_model_count'] > 0:
            response_model_files.append(result)
        elif result['success_response_count'] > 0:
            success_response_files.append(result)
        else:
            other_files.append(result)
    
    # 打印使用response_model的文件
    if response_model_files:
        print("\n使用response_model的文件:")
        for result in response_model_files:
            print(f"\n  {result['filename']}:")
            print(f"    - 总路由: {result['total_routes']}")
            print(f"    - response_model使用: {result['response_model_count']}")
            print(f"    - 模型: {', '.join(result['response_models'])}")
    
    # 打印使用success_response的文件
    if success_response_files:
        print("\n使用success_response的文件:")
        for result in success_response_files:
            print(f"\n  {result['filename']}:")
            print(f"    - 总路由: {result['total_routes']}")
            print(f"    - success_response使用: {result['success_response_count']}")
            print(f"    - error_response使用: {result['error_response_count']}")
    
    # 打印混合使用的文件
    if mixed_files:
        print("\n混合使用的文件 (需要统一):")
        for result in mixed_files:
            print(f"\n  {result['filename']}:")
            print(f"    - 总路由: {result['total_routes']}")
            print(f"    - response_model使用: {result['response_model_count']}")
            print(f"    - success_response使用: {result['success_response_count']}")
            print(f"    - 模型: {', '.join(result['response_models'])}")
    
    # 打印其他文件
    if other_files:
        print("\n其他响应格式的文件:")
        for result in other_files:
            print(f"\n  {result['filename']}:")
            print(f"    - 总路由: {result['total_routes']}")
            print(f"    - 直接返回字典: {result['direct_dict_count']}")
            print(f"    - 直接返回对象: {result['direct_return_count']}")
    
    # 建议
    print("\n" + "=" * 80)
    print("建议:")
    print("=" * 80)
    
    if total_response_model > total_success_response:
        print("\n当前项目主要使用response_model模式 (占主导)")
        print("建议：")
        print("1. 保持response_model作为主要模式")
        print("2. 将使用success_response的端点迁移到response_model")
        print("3. 在前端统一处理response_model的响应格式")
    else:
        print("\n当前项目response_model和success_response使用较为平衡")
        print("建议：")
        print("1. 选择success_response作为统一格式（更灵活）")
        print("2. 移除所有response_model装饰器")
        print("3. 确保所有端点返回统一的{success, message, data, code}格式")
    
    print("\n需要修改的文件:")
    for result in mixed_files:
        print(f"  - {result['filename']} (混合使用，需要统一)")


if __name__ == "__main__":
    main()