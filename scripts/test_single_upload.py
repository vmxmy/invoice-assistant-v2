#!/usr/bin/env python3
"""
测试单个文件上传
"""
import os
import requests
import json
import time
import hashlib
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# API配置
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
MINERU_API_BASE_URL = 'https://mineru.net/api'

def test_single_file_upload():
    """测试单个文件上传流程"""
    
    # 选择一个测试文件
    test_file = "/Users/xumingyang/app/invoice_assist/downloads/25359134169000052039.pdf"
    
    if not os.path.exists(test_file):
        print(f"文件不存在: {test_file}")
        return
    
    # 1. 申请上传链接
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    filename = os.path.basename(test_file)
    data_id = hashlib.md5(test_file.encode()).hexdigest()[:16]
    
    data = {
        "enable_formula": False,
        "enable_table": True,
        "files": [
            {
                "name": filename,
                "is_ocr": True,
                "data_id": data_id
            }
        ]
    }
    
    print("1. 申请上传链接...")
    url = f'{MINERU_API_BASE_URL}/v4/file-urls/batch'
    response = requests.post(url, headers=headers, json=data)
    
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if result.get('code') == 0:
            batch_id = result['data']['batch_id']
            upload_url = result['data']['file_urls'][0]
            
            print(f"\n批次ID: {batch_id}")
            print(f"上传URL: {upload_url}")
            
            # 2. 上传文件 - 注意不要设置任何headers
            print(f"\n2. 上传文件...")
            print(f"文件大小: {os.path.getsize(test_file)} 字节")
            
            with open(test_file, 'rb') as f:
                file_content = f.read()
            
            # 直接PUT上传，不设置额外的headers
            upload_response = requests.put(upload_url, data=file_content)
            
            print(f"上传状态: {upload_response.status_code}")
            print(f"响应头: {dict(upload_response.headers)}")
            
            if upload_response.status_code != 200:
                print(f"响应内容: {upload_response.text}")
            else:
                print("文件上传成功！")
                
                # 3. 等待并查询任务状态
                print(f"\n3. 等待系统处理...")
                
                # 尝试不同的查询方式
                query_endpoints = [
                    f'{MINERU_API_BASE_URL}/v4/batch/{batch_id}/tasks',
                    f'{MINERU_API_BASE_URL}/v4/batches/{batch_id}',
                    f'{MINERU_API_BASE_URL}/v4/tasks?batch_id={batch_id}',
                    f'{MINERU_API_BASE_URL}/v4/batch-tasks/{batch_id}'
                ]
                
                print("\n尝试查询批次任务列表...")
                for endpoint in query_endpoints:
                    print(f"\n尝试端点: {endpoint}")
                    list_response = requests.get(endpoint, headers={'Authorization': f'Bearer {MINERU_API_TOKEN}'})
                    print(f"状态: {list_response.status_code}")
                    if list_response.status_code == 200:
                        print(f"响应: {json.dumps(list_response.json(), indent=2, ensure_ascii=False)}")
                        break
                    else:
                        print(f"失败: {list_response.text[:100]}")
                
                # 等待更长时间后再查询
                print(f"\n等待30秒后再查询任务...")
                time.sleep(30)
                
                # 再次尝试查询，使用data_id
                print(f"\n使用data_id查询: {data_id}")
                task_url = f'{MINERU_API_BASE_URL}/v4/extract/task/{data_id}'
                task_response = requests.get(task_url, headers={'Authorization': f'Bearer {MINERU_API_TOKEN}'})
                
                if task_response.status_code == 200:
                    result = task_response.json()
                    print(f"任务响应: {json.dumps(result, indent=2, ensure_ascii=False)}")
                    
                    if result.get('code') == 0:
                        data = result['data']
                        state = data.get('state')
                        print(f"\n任务状态: {state}")
                        
                        if state == 'done':
                            zip_url = data.get('full_zip_url')
                            print(f"结果下载链接: {zip_url}")
                            
                            # 下载结果
                            print("\n下载结果文件...")
                            zip_response = requests.get(zip_url)
                            if zip_response.status_code == 200:
                                with open('test_result.zip', 'wb') as f:
                                    f.write(zip_response.content)
                                print("结果已保存到 test_result.zip")

if __name__ == "__main__":
    test_single_file_upload()