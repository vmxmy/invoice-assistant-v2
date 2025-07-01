#!/usr/bin/env python3
"""
测试批量上传后的任务查询
"""
import os
import requests
import json
import time
import hashlib
from dotenv import load_dotenv
from datetime import datetime

# 加载环境变量
load_dotenv()

# API配置
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
MINERU_API_BASE_URL = 'https://mineru.net/api'

def query_batch_tasks(batch_id: str):
    """查询批次的任务状态"""
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}'
    }
    
    print(f"查询批次 {batch_id} 的任务...")
    
    # 尝试查询任务列表
    endpoints = [
        f'{MINERU_API_BASE_URL}/v4/tasks?batch_id={batch_id}',
        f'{MINERU_API_BASE_URL}/v4/tasks',  # 查询所有任务
        f'{MINERU_API_BASE_URL}/v4/extract/tasks?batch_id={batch_id}'
    ]
    
    for endpoint in endpoints:
        print(f"\n尝试端点: {endpoint}")
        response = requests.get(endpoint, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('code') == 0:
                data = result.get('data', {})
                task_list = data.get('list', [])
                total = data.get('total', 0)
                
                print(f"找到 {total} 个任务")
                
                if task_list:
                    for task in task_list:
                        print(f"\n任务详情:")
                        print(json.dumps(task, indent=2, ensure_ascii=False))
                        
                        # 如果找到任务，尝试获取详细状态
                        task_id = task.get('id') or task.get('task_id')
                        if task_id:
                            detail_url = f'{MINERU_API_BASE_URL}/v4/extract/task/{task_id}'
                            detail_response = requests.get(detail_url, headers=headers)
                            if detail_response.status_code == 200:
                                detail = detail_response.json()
                                print(f"\n任务 {task_id} 的详细状态:")
                                print(json.dumps(detail, indent=2, ensure_ascii=False))
                
                return task_list
    
    return []

def monitor_batch(batch_id: str, max_wait: int = 300):
    """监控批次任务状态"""
    print(f"开始监控批次 {batch_id}")
    print(f"最多等待 {max_wait} 秒")
    
    start_time = time.time()
    check_interval = 10  # 每10秒检查一次
    
    while time.time() - start_time < max_wait:
        elapsed = int(time.time() - start_time)
        print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 已等待 {elapsed} 秒...")
        
        tasks = query_batch_tasks(batch_id)
        
        if tasks:
            print(f"\n找到 {len(tasks)} 个任务！")
            return tasks
        
        print(f"暂无任务，{check_interval}秒后再次检查...")
        time.sleep(check_interval)
    
    print(f"\n超时！等待了 {max_wait} 秒仍未找到任务")
    return []

def test_recent_batch():
    """测试最近的批次"""
    # 使用之前的批次ID进行测试
    recent_batches = [
        "4b4b06ca-7520-43a5-90fc-9afffc411efc",  # 最新的
        "d617ef12-e135-4b45-a15f-174d404b38ef",
        "657a0d49-ed37-4e23-ad17-2f96c7ff6aa7"
    ]
    
    for batch_id in recent_batches:
        print(f"\n{'='*60}")
        print(f"测试批次: {batch_id}")
        print(f"{'='*60}")
        
        tasks = query_batch_tasks(batch_id)
        if tasks:
            print(f"找到任务！")
            break
        else:
            print("未找到任务")

def query_all_tasks():
    """查询所有任务"""
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}'
    }
    
    print("查询所有任务...")
    
    # 查询所有任务
    url = f'{MINERU_API_BASE_URL}/v4/tasks'
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        if result.get('code') == 0:
            data = result.get('data', {})
            task_list = data.get('list', [])
            total = data.get('total', 0)
            
            print(f"\n总共找到 {total} 个任务")
            
            if task_list:
                for i, task in enumerate(task_list[:5], 1):  # 只显示前5个
                    print(f"\n任务 {i}:")
                    print(f"  ID: {task.get('id') or task.get('task_id')}")
                    print(f"  状态: {task.get('state') or task.get('status')}")
                    print(f"  创建时间: {task.get('created_at') or task.get('create_time')}")
                    if 'batch_id' in task:
                        print(f"  批次ID: {task.get('batch_id')}")

if __name__ == "__main__":
    # 测试最近的批次
    # test_recent_batch()
    
    # 查询所有任务
    query_all_tasks()
    
    # 监控特定批次
    print("\n" + "="*60)
    monitor_batch("4b4b06ca-7520-43a5-90fc-9afffc411efc", max_wait=60)