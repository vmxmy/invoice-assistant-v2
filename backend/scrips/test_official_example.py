#!/usr/bin/env python3
"""
完全按照官方示例实现的测试脚本
"""
import requests
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')

# 完全按照官方示例
url = 'https://mineru.net/api/v4/file-urls/batch'
header = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {MINERU_API_TOKEN}'
}

# 测试文件
test_file = "/Users/xumingyang/app/invoice_assist/downloads/25359134169000052039.pdf"
filename = os.path.basename(test_file)

data = {
    "enable_formula": True,
    "language": "ch",  # 使用官方默认值
    "enable_table": True,
    "files": [
        {"name": filename, "is_ocr": True, "data_id": "test001"}  # 使用简单的data_id
    ]
}

file_path = [test_file]

try:
    response = requests.post(url, headers=header, json=data)
    if response.status_code == 200:
        result = response.json()
        print('response success. result:{}'.format(result))
        if result["code"] == 0:
            batch_id = result["data"]["batch_id"]
            urls = result["data"]["file_urls"]
            print('batch_id:{},urls:{}'.format(batch_id, urls))
            for i in range(0, len(urls)):
                with open(file_path[i], 'rb') as f:
                    res_upload = requests.put(urls[i], data=f)
                    if res_upload.status_code == 200:
                        print(f"{urls[i]} upload success")
                        
                        # 上传成功后，等待并查询任务
                        import time
                        print("\n等待系统创建任务...")
                        
                        # 等待不同的时间间隔
                        wait_times = [5, 10, 20, 30, 60]
                        for wait_time in wait_times:
                            print(f"\n等待 {wait_time} 秒...")
                            time.sleep(wait_time)
                            
                            # 查询任务列表
                            query_url = 'https://mineru.net/api/v4/tasks'
                            query_headers = {
                                'Authorization': f'Bearer {MINERU_API_TOKEN}'
                            }
                            
                            # 尝试不同的查询参数
                            query_params = [
                                {'batch_id': batch_id},
                                {},  # 查询所有任务
                            ]
                            
                            for params in query_params:
                                query_response = requests.get(query_url, headers=query_headers, params=params)
                                if query_response.status_code == 200:
                                    query_result = query_response.json()
                                    if query_result.get('code') == 0:
                                        tasks = query_result['data'].get('list', [])
                                        total = query_result['data'].get('total', 0)
                                        print(f"查询参数: {params}")
                                        print(f"找到 {total} 个任务")
                                        
                                        if tasks:
                                            print("任务列表:")
                                            for task in tasks:
                                                print(f"  - 任务ID: {task.get('id')}, 状态: {task.get('state')}")
                                            
                                            # 如果找到任务，退出循环
                                            break
                            
                            if tasks:
                                break
                        
                        # 最后尝试用data_id查询
                        print(f"\n尝试用data_id查询: test001")
                        task_url = f'https://mineru.net/api/v4/extract/task/test001'
                        task_response = requests.get(task_url, headers=query_headers)
                        if task_response.status_code == 200:
                            task_result = task_response.json()
                            print(f"查询结果: {task_result}")
                        
                    else:
                        print(f"{urls[i]} upload failed")
        else:
            print('apply upload url failed,reason:{}'.format(result.get("msg")))
    else:
        print('response not success. status:{} ,result:{}'.format(response.status_code, response.text))
except Exception as err:
    print(err)