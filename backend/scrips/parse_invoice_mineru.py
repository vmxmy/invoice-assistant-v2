#!/usr/bin/env python3
import os
import sys
import requests
import json
import base64
import time
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MineRu API configuration
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
MINERU_API_BASE_URL = 'https://mineru.net/api'

def upload_file_to_get_url(pdf_path):
    """Try to upload file and get a URL"""
    # Try common file hosting endpoints
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Accept': '*/*'
    }
    
    # Try different upload endpoints
    upload_endpoints = [
        f'{MINERU_API_BASE_URL}/v4/file/upload',
        f'{MINERU_API_BASE_URL}/v4/upload',
        f'{MINERU_API_BASE_URL}/upload'
    ]
    
    for endpoint in upload_endpoints:
        try:
            print(f"Trying upload endpoint: {endpoint}")
            with open(pdf_path, 'rb') as pdf_file:
                files = {'file': (os.path.basename(pdf_path), pdf_file, 'application/pdf')}
                response = requests.post(endpoint, headers=headers, files=files)
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    # Look for URL in response
                    if 'url' in result:
                        return result['url']
                    elif 'file_url' in result:
                        return result['file_url']
                    elif 'data' in result and isinstance(result['data'], dict):
                        if 'url' in result['data']:
                            return result['data']['url']
        except Exception as e:
            print(f"Upload failed at {endpoint}: {e}")
    
    return None

def create_task_with_url(url):
    """Create extraction task with URL"""
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Content-Type': 'application/json',
        'Accept': '*/*'
    }
    
    data = {
        'url': url,
        'is_ocr': True,
        'enable_formula': False
    }
    
    response = requests.post(
        f'{MINERU_API_BASE_URL}/v4/extract/task',
        headers=headers,
        json=data
    )
    
    if response.status_code in [200, 201]:
        result = response.json()
        print("\nTask created successfully with URL!")
        return result
    else:
        print(f"Error: API request failed with status code {response.status_code}")
        print(f"Response: {response.text}")
        return None

def create_extraction_task(pdf_path):
    """Create a PDF extraction task using MineRu API v4"""
    
    # Check if file exists
    if not os.path.exists(pdf_path):
        print(f"Error: PDF file not found at {pdf_path}")
        return None
    
    print(f"Creating extraction task for: {pdf_path}")
    
    # 使用批量上传API处理本地文件
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    # 申请上传链接 - 使用正确的API端点
    filename = os.path.basename(pdf_path)
    data = {
        "enable_formula": False,
        "language": "zh",  # 中文发票
        "enable_table": True,
        "files": [
            {
                "name": filename,
                "is_ocr": True,
                "data_id": hashlib.md5(filename.encode()).hexdigest()[:8]  # 生成唯一ID
            }
        ]
    }
    
    print("申请文件上传链接...")
    url = f'{MINERU_API_BASE_URL}/v4/file-urls/batch'
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f'申请响应: {result}')
        
        if result.get('code') == 0:
            batch_id = result['data']['batch_id']
            file_urls = result['data']['file_urls']
            
            if file_urls and len(file_urls) > 0:
                upload_url = file_urls[0]
                print(f'批次ID: {batch_id}')
                print(f'上传URL: {upload_url[:50]}...')
                
                # 上传文件
                try:
                    with open(pdf_path, 'rb') as f:
                        upload_response = requests.put(upload_url, data=f)
                    
                    if upload_response.status_code == 200:
                        print("文件上传成功！")
                        # 文件上传后系统会自动创建解析任务
                        # 返回batch_id供后续查询
                        return {
                            'code': 0,
                            'msg': 'ok',
                            'data': {
                                'batch_id': batch_id,
                                'task_id': batch_id  # 使用batch_id作为task_id
                            }
                        }
                    else:
                        print(f"文件上传失败: {upload_response.status_code}")
                        print(f"响应: {upload_response.text}")
                except Exception as e:
                    print(f"上传文件时出错: {e}")
        else:
            print(f'申请上传链接失败: {result.get("msg")}')
    else:
        print(f"API请求失败: {response.status_code}")
        print(f"响应: {response.text}")
    
    # 如果批量上传API失败，尝试其他方法
    print("\n尝试使用本地文件服务器...")
    try:
        from local_file_server import LocalFileServer
        global file_server
        
        if 'file_server' not in globals():
            file_server = LocalFileServer()
            file_server.start()
        
        pdf_url = file_server.add_file(pdf_path)
        print(f"本地文件URL: {pdf_url}")
        
        return create_task_with_url(pdf_url)
    except Exception as e:
        print(f"本地服务器方法失败: {e}")
        
    return None

def create_task_with_base64(pdf_path):
    """Create task with base64 encoded file"""
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Content-Type': 'application/json',
        'Accept': '*/*'
    }
    
    # Read and encode file
    with open(pdf_path, 'rb') as pdf_file:
        pdf_content = pdf_file.read()
        pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    
    # Create request body
    data = {
        'file_base64': pdf_base64,
        'filename': os.path.basename(pdf_path),
        'is_ocr': True,
        'enable_formula': False
    }
    
    response = requests.post(
        f'{MINERU_API_BASE_URL}/v4/extract/task',
        headers=headers,
        json=data
    )
    
    if response.status_code in [200, 201]:
        result = response.json()
        print("\nTask created successfully with base64!")
        return result
    else:
        print(f"Error: API request failed with status code {response.status_code}")
        print(f"Response: {response.text}")
        return None

def get_task_result(task_id):
    """Get the result of an extraction task"""
    headers = {
        'Authorization': f'Bearer {MINERU_API_TOKEN}',
        'Accept': '*/*'
    }
    
    # The correct endpoint for v4 API
    endpoint = f'{MINERU_API_BASE_URL}/v4/extract/task/{task_id}'
    
    print(f"Checking task status...")
    response = requests.get(endpoint, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to get status: {response.status_code}")
        return None

def download_and_extract_results(zip_url):
    """Download and extract results from ZIP URL"""
    try:
        print(f"Downloading results from: {zip_url}")
        response = requests.get(zip_url)
        
        if response.status_code == 200:
            # Save ZIP file temporarily
            import zipfile
            import tempfile
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
                tmp_file.write(response.content)
                tmp_path = tmp_file.name
            
            # Extract and read results
            results = {}
            with zipfile.ZipFile(tmp_path, 'r') as zip_file:
                # List all files in the ZIP
                for file_name in zip_file.namelist():
                    print(f"  Found file: {file_name}")
                    
                    # Look for JSON results
                    if file_name.endswith('.json'):
                        with zip_file.open(file_name) as f:
                            content = f.read().decode('utf-8')
                            results[file_name] = json.loads(content)
                    
                    # Look for text results
                    elif file_name.endswith('.txt') or file_name.endswith('.md'):
                        with zip_file.open(file_name) as f:
                            content = f.read().decode('utf-8')
                            results[file_name] = content
            
            # Clean up
            os.unlink(tmp_path)
            
            return results
        else:
            print(f"Failed to download results: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error downloading results: {e}")
        return None

def parse_pdf_with_mineru(pdf_path):
    """Parse PDF invoice using MineRu API"""
    
    # Create extraction task
    task_result = create_extraction_task(pdf_path)
    
    if not task_result:
        return None
    
    # Check if we got a successful response with task_id
    if task_result.get('code') == 0 and 'data' in task_result:
        task_data = task_result['data']
        task_id = task_data.get('task_id')
        
        if task_id:
            print(f"Task ID: {task_id}")
            print("Waiting for processing...")
            
            # Poll for results
            max_attempts = 30
            for i in range(max_attempts):
                time.sleep(3)  # Wait 3 seconds between checks
                result = get_task_result(task_id)
                
                if result:
                    # Check if we got the actual extraction result
                    if result.get('code') == 0:
                        data = result.get('data', {})
                        state = data.get('state', '').lower()
                        
                        if state == 'done':
                            print("\nExtraction completed!")
                            # Download and extract the ZIP file
                            zip_url = data.get('full_zip_url')
                            if zip_url:
                                extraction_results = download_and_extract_results(zip_url)
                                return extraction_results or data
                            else:
                                return data
                        elif state in ['failed', 'error']:
                            err_msg = data.get('err_msg', 'Unknown error')
                            print(f"\nExtraction failed: {err_msg}")
                            return result
                        elif state in ['processing', 'running', 'pending']:
                            print(f"Attempt {i+1}/{max_attempts}: State = {state}")
                        else:
                            print(f"Attempt {i+1}/{max_attempts}: Unknown state = {state}")
                    else:
                        print(f"Attempt {i+1}/{max_attempts}: API error - {result.get('msg', 'Unknown error')}")
                else:
                    print(f"Attempt {i+1}/{max_attempts}: No response...")
            
            return {"error": "Timeout waiting for results"}
    
    # If no task_id, return the error
    return task_result

def display_results(result):
    """Display parsed results in a formatted way"""
    if not result:
        return
    
    print("\n" + "="*50)
    print("PARSED INVOICE INFORMATION")
    print("="*50)
    
    # If result is a dictionary of files
    if isinstance(result, dict) and any(key.endswith(('.json', '.txt', '.md')) for key in result.keys()):
        # Display each file's content
        for file_name, content in result.items():
            print(f"\n--- {file_name} ---")
            if isinstance(content, dict):
                print(json.dumps(content, indent=2, ensure_ascii=False))
            else:
                print(content)
    else:
        # Pretty print the JSON result
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Try to extract key invoice information from the results
    print("\n" + "-"*50)
    print("EXTRACTED INVOICE DETAILS:")
    print("-"*50)
    
    # Look for invoice information in the results
    invoice_info = {}
    
    # If it's a dictionary of files, look for the main content
    if isinstance(result, dict):
        for file_name, content in result.items():
            if isinstance(content, dict):
                # Look for invoice fields in the content
                for key, value in content.items():
                    if any(field in key.lower() for field in ['invoice', '发票', 'seller', '销售', 'buyer', '购买', 'amount', '金额', 'date', '日期', 'tax', '税']):
                        invoice_info[key] = value
            elif isinstance(content, str) and ('发票' in content or 'invoice' in content.lower()):
                # Parse text content for invoice details
                print("\nText content found:")
                print(content[:500] + "..." if len(content) > 500 else content)

def main():
    # PDF file path
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    print(f"Starting MineRu API parsing for: {pdf_path}")
    
    # Parse the PDF
    result = parse_pdf_with_mineru(pdf_path)
    
    # Display results
    display_results(result)

if __name__ == "__main__":
    main()