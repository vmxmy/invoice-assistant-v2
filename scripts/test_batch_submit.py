#!/usr/bin/env python3
"""
测试批量提交任务的可能端点
"""
import requests
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')

def test_batch_submit(batch_id: str):
    """测试可能的批量提交端点"""
    
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    # 优先测试最有可能的端点
    possible_endpoint = f'https://mineru.net/api/v4/extract/task/{batch_id}'
    print(f"测试批次 {batch_id} 的提交端点...")
    print(f"\n优先尝试: {possible_endpoint}")

    # 尝试GET请求
    try:
        response = requests.get(possible_endpoint, headers=headers)
        print(f"GET 状态: {response.status_code}")
        if response.status_code in [200, 201, 202]:
            print(f"响应: {response.json()}")
            # 即使成功，也可能只是查询接口，不代表任务已触发，所以继续尝试其他方法
        elif response.status_code != 404:
            print(f"响应: {response.text[:200]}")
    except Exception as e:
        print(f"GET 错误: {e}")

    # 尝试POST请求
    try:
        response = requests.post(possible_endpoint, headers=headers, json={})
        print(f"POST 状态: {response.status_code}")
        if response.status_code in [200, 201]:
            print(f"响应: {response.json()}")
            return True
        elif response.status_code != 404:
            print(f"响应: {response.text[:200]}")
    except Exception as e:
        print(f"POST 错误: {e}")
    
    # 尝试PUT请求
    try:
        response = requests.put(possible_endpoint, headers=headers, json={})
        print(f"PUT 状态: {response.status_code}")
        if response.status_code in [200, 201]:
            print(f"响应: {response.json()}")
            return True
        elif response.status_code != 404:
            print(f"响应: {response.text[:200]}")
    except Exception as e:
        print(f"PUT 错误: {e}")

    print("\n--- 尝试其他可能的端点 ---")
    # 如果最可能的端点失败了，再尝试其他的
    other_endpoints = [
        f'https://mineru.net/api/v4/batch/{batch_id}/submit',
        f'https://mineru.net/api/v4/batches/{batch_id}/submit',
        f'https://mineru.net/api/v4/extract/batch/{batch_id}/submit',
        f'https://mineru.net/api/v4/batch-submit/{batch_id}',
        f'https://mineru.net/api/v4/batch/{batch_id}/create-tasks',
        f'https://mineru.net/api/v4/extract/batch/{batch_id}',
        f'https://mineru.net/api/v4/batch/{batch_id}/start',
        f'https://mineru.net/api/v4/batch/{batch_id}/process',
    ]
    
    for endpoint in other_endpoints:
        print(f"\n尝试: {endpoint}")
        try:
            response = requests.post(endpoint, headers=headers, json={})
            if response.status_code in [200, 201]:
                print(f"POST 成功! 响应: {response.json()}")
                return True
        except Exception:
            pass

    return False

def check_batch_info(batch_id: str):
    """检查批次信息"""
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}'
    }
    endpoint = f'https://mineru.net/api/v4/extract-results/batch/{batch_id}'
    print(f"\n检查批次 {batch_id} 的信息...")
    try:
        response = requests.get(endpoint, headers=headers)
        if response.status_code == 200:
            print(f"找到批次信息端点: {endpoint}")
            print(f"响应: {response.json()}")
            return
    except Exception as e:
        print(f"检查信息时出错: {e}")
    
    print("未找到批次信息或查询失败")

if __name__ == "__main__":
    recent_batch_ids = [
        "fc9fb4c3-0e81-4084-a570-cf69c33c05b1",
        "4b4b06ca-7520-43a5-90fc-9afffc411efc"
    ]
    
    for batch_id in recent_batch_ids:
        print(f"\n{'='*60}")
        print(f"测试批次: {batch_id}")
        print(f"{'='*60}")
        
        check_batch_info(batch_id)
        
        if test_batch_submit(batch_id):
            print(f"\n成功触发批次 {batch_id} 的任务创建！")
            break
