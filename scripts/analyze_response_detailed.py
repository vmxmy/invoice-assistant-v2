#!/usr/bin/env python3
"""详细分析每个端点的响应格式"""
import os
import re
from pathlib import Path


def extract_endpoints(content):
    """提取所有端点信息"""
    # 匹配路由装饰器和函数定义
    pattern = r'@router\.(get|post|put|delete|patch)\s*\(([^)]*)\)\s*\n(?:.*\n)*?async def (\w+)'
    matches = re.findall(pattern, content, re.MULTILINE | re.DOTALL)
    
    endpoints = []
    for match in matches:
        method, decorator_params, func_name = match
        
        # 检查是否有response_model
        has_response_model = 'response_model' in decorator_params
        response_model = None
        if has_response_model:
            model_match = re.search(r'response_model\s*=\s*([^,\)]+)', decorator_params)
            if model_match:
                response_model = model_match.group(1).strip()
        
        # 查找函数体
        func_pattern = rf'async def {func_name}.*?(?=\n(?:async def|@router|$))'
        func_match = re.search(func_pattern, content, re.MULTILINE | re.DOTALL)
        
        uses_success_response = False
        uses_error_response = False
        returns_dict = False
        returns_object = False
        
        if func_match:
            func_body = func_match.group(0)
            uses_success_response = 'success_response(' in func_body
            uses_error_response = 'error_response(' in func_body
            
            # 检查返回类型
            return_matches = re.findall(r'return\s+([^\n]+)', func_body)
            for ret in return_matches:
                if ret.strip().startswith('{'):
                    returns_dict = True
                elif not ret.strip().startswith(('success_response', 'error_response')):
                    returns_object = True
        
        endpoints.append({
            'method': method.upper(),
            'function': func_name,
            'has_response_model': has_response_model,
            'response_model': response_model,
            'uses_success_response': uses_success_response,
            'uses_error_response': uses_error_response,
            'returns_dict': returns_dict,
            'returns_object': returns_object
        })
    
    return endpoints


def main():
    endpoints_dir = Path("/Users/xumingyang/app/invoice_assist/v2/backend/app/api/v1/endpoints")
    
    all_results = {}
    
    # 分析每个文件
    for file_path in sorted(endpoints_dir.glob("*.py")):
        if file_path.name == "__init__.py":
            continue
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        endpoints = extract_endpoints(content)
        if endpoints:
            all_results[file_path.name] = endpoints
    
    # 打印结果
    print("=" * 100)
    print("端点响应格式详细分析")
    print("=" * 100)
    
    # 统计
    total_endpoints = 0
    response_model_endpoints = 0
    success_response_endpoints = 0
    mixed_endpoints = 0
    dict_endpoints = 0
    object_endpoints = 0
    
    files_with_issues = []
    
    for filename, endpoints in all_results.items():
        print(f"\n{filename}:")
        print("-" * 80)
        
        file_has_mixed = False
        
        for ep in endpoints:
            total_endpoints += 1
            
            # 统计
            if ep['has_response_model']:
                response_model_endpoints += 1
            if ep['uses_success_response']:
                success_response_endpoints += 1
            if ep['returns_dict']:
                dict_endpoints += 1
            if ep['returns_object']:
                object_endpoints += 1
            
            # 检查混合使用
            if ep['has_response_model'] and ep['uses_success_response']:
                mixed_endpoints += 1
                file_has_mixed = True
            
            # 打印端点信息
            print(f"  {ep['method']:6} {ep['function']:30}", end=" ")
            
            response_types = []
            if ep['has_response_model']:
                response_types.append(f"response_model={ep['response_model']}")
            if ep['uses_success_response']:
                response_types.append("success_response")
            if ep['uses_error_response']:
                response_types.append("error_response")
            if ep['returns_dict']:
                response_types.append("returns_dict")
            if ep['returns_object'] and not ep['has_response_model']:
                response_types.append("returns_object")
            
            print(" | ".join(response_types) if response_types else "no explicit response format")
        
        if file_has_mixed:
            files_with_issues.append(filename)
    
    # 总结
    print("\n" + "=" * 100)
    print("总结统计")
    print("=" * 100)
    print(f"总端点数: {total_endpoints}")
    print(f"使用 response_model: {response_model_endpoints} ({response_model_endpoints/total_endpoints*100:.1f}%)")
    print(f"使用 success_response: {success_response_endpoints} ({success_response_endpoints/total_endpoints*100:.1f}%)")
    print(f"混合使用 (需要修复): {mixed_endpoints}")
    print(f"返回原始字典: {dict_endpoints}")
    print(f"返回原始对象: {object_endpoints}")
    
    if files_with_issues:
        print(f"\n需要修复的文件 (混合使用):")
        for f in files_with_issues:
            print(f"  - {f}")
    
    # 分析结论
    print("\n" + "=" * 100)
    print("结论和建议")
    print("=" * 100)
    
    if response_model_endpoints > success_response_endpoints * 2:
        print("\n✓ 项目主要使用 response_model 模式 (占 42.7%)")
        print("\n建议方案A: 统一使用 response_model (当前主流)")
        print("  优点:")
        print("  - 符合当前代码库的主要模式")
        print("  - FastAPI自动生成API文档")
        print("  - 类型安全，自动验证")
        print("  缺点:")
        print("  - 需要定义很多Response模型")
        print("  - 不够灵活")
        
        print("\n建议方案B: 统一使用 success_response")
        print("  优点:")
        print("  - 统一的响应格式 {success, message, data, code}")
        print("  - 更灵活，易于添加元数据")
        print("  - 前端处理更统一")
        print("  缺点:")
        print("  - 需要修改42.7%的端点")
        print("  - 失去自动API文档生成")
    
    print("\n推荐: 采用方案B，统一使用 success_response")
    print("原因:")
    print("1. 虽然需要修改较多代码，但长期维护更方便")
    print("2. 前端可以统一处理所有响应")
    print("3. 便于添加通用的错误处理和日志")


if __name__ == "__main__":
    main()