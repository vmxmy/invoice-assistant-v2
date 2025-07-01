#!/usr/bin/env python3
import os
import requests
import json
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get token
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
print(f"Token loaded: {'Yes' if MINERU_API_TOKEN else 'No'}")

# Test 1: Create task with example PDF
url = "https://mineru.net/api/v4/extract/task"
headers = {
    'Authorization': f'Bearer {MINERU_API_TOKEN}',
    'Content-Type': 'application/json',
    'Accept': '*/*'
}

data = {
    "url": "https://cdn-mineru.openxlab.org.cn/demo/example.pdf",
    "is_ocr": True,
    "enable_formula": False
}

print("\n1. Creating extraction task...")
response = requests.post(url, headers=headers, json=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    result = response.json()
    if result.get('code') == 0:
        task_id = result['data']['task_id']
        print(f"\nTask ID: {task_id}")
        
        # Test 2: Check task status
        print("\n2. Checking task status...")
        time.sleep(5)  # Wait 5 seconds
        
        status_url = f"https://mineru.net/api/v4/extract/task/{task_id}"
        status_response = requests.get(status_url, headers={'Authorization': f'Bearer {MINERU_API_TOKEN}', 'Accept': '*/*'})
        print(f"Status check: {status_response.status_code}")
        print(f"Response: {json.dumps(status_response.json(), indent=2, ensure_ascii=False) if status_response.status_code == 200 else status_response.text}")