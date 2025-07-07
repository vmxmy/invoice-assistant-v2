#!/usr/bin/env python3
"""
测试MineRu批量上传API
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

def test_batch_upload():
    """测试批量上传功能"""
    
    # 准备测试文件
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"文件不存在: {pdf_path}")
        return
    
    # 1. 申请上传链接
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    filename = os.path.basename(pdf_path)
    data = {
        "enable_formula": False,
        "enable_table": True,
        "files": [
            {
                "name": filename,
                "is_ocr": True,
                "data_id": hashlib.md5(filename.encode()).hexdigest()[:8]
            }
        ]
    }
    
    print("1. 申请文件上传链接...")
    url = f'{MINERU_API_BASE_URL}/v4/file-urls/batch'
    response = requests.post(url, headers=headers, json=data)
    
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    if response.status_code == 200:
        result = response.json()
        if result.get('code') == 0:
            batch_id = result['data']['batch_id']
            file_urls = result['data']['file_urls']
            
            print(f"\n批次ID: {batch_id}")
            print(f"上传URL数量: {len(file_urls)}")
            
            # 2. 上传文件
            if file_urls:
                upload_url = file_urls[0]
                print(f"\n2. 上传文件...")
                print(f"上传URL: {upload_url[:100]}...")
                
                with open(pdf_path, 'rb') as f:
                    upload_response = requests.put(upload_url, data=f)
                
                print(f"上传状态: {upload_response.status_code}")
                if upload_response.status_code == 200:
                    print("文件上传成功！")
                    
                    # 3. 查询任务状态
                    print(f"\n3. 等待系统创建解析任务...")
                    time.sleep(5)  # 等待系统处理
                    
                    # 从data_id构建可能的task_id
                    data_id = hashlib.md5(filename.encode()).hexdigest()[:8]
                    
                    # 尝试不同的查询方式
                    print(f"\n尝试查询任务状态...")
                    
                    # 方法1: 使用batch_id查询
                    query_endpoints = [
                        f'{MINERU_API_BASE_URL}/v4/task/batch/{batch_id}',
                        f'{MINERU_API_BASE_URL}/v4/tasks?batch_id={batch_id}',
                        f'{MINERU_API_BASE_URL}/v4/extract/task/{batch_id}',
                        f'{MINERU_API_BASE_URL}/v4/extract/task/{data_id}'
                    ]
                    
                    for endpoint in query_endpoints:
                        print(f"\n尝试端点: {endpoint}")
                        query_response = requests.get(endpoint, headers={'Authorization': f'Bearer {MINERU_API_TOKEN}'})
                        print(f"查询状态: {query_response.status_code}")
                        if query_response.status_code == 200:
                            print(f"查询结果: {json.dumps(query_response.json(), indent=2, ensure_ascii=False)}")
                            break
                        else:
                            print(f"查询失败: {query_response.text[:100]}...")
                else:
                    print(f"上传失败: {upload_response.text}")
        else:
            print(f"申请失败: {result.get('msg')}")

if __name__ == "__main__":
    test_batch_upload()