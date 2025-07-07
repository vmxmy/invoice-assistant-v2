#!/usr/bin/env python3
"""
简化的发票上传测试 - 使用 Supabase 令牌
"""

import requests
import json
import time
from pathlib import Path

# 配置
BASE_URL = "http://localhost:8090"
API_PREFIX = "/api/v1"
TEST_PDF = "downloads/25359134169000052039.pdf"

# 使用 Supabase 匿名密钥作为测试
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"

def test_upload():
    print("🧪 测试发票上传功能...")
    
    # 检查文件
    if not Path(TEST_PDF).exists():
        print("❌ 测试文件不存在")
        return
    
    file_size = Path(TEST_PDF).stat().st_size
    print(f"📁 文件: {TEST_PDF}")
    print(f"📏 大小: {file_size / 1024:.2f} KB")
    
    # 测试认证状态
    print("\n1️⃣ 测试认证状态...")
    headers = {"Authorization": f"Bearer {SUPABASE_ANON_KEY}"}
    
    try:
        auth_resp = requests.get(f"{BASE_URL}{API_PREFIX}/auth/status", headers=headers, timeout=10)
        print(f"认证状态: {auth_resp.status_code}")
        if auth_resp.status_code == 200:
            auth_data = auth_resp.json()
            print(f"认证结果: {json.dumps(auth_data, ensure_ascii=False)}")
    except Exception as e:
        print(f"认证测试失败: {e}")
    
    # 测试文件上传
    print("\n2️⃣ 测试文件上传...")
    url = f"{BASE_URL}{API_PREFIX}/files/upload"
    
    try:
        with open(TEST_PDF, 'rb') as f:
            files = {'file': (Path(TEST_PDF).name, f, 'application/pdf')}
            data = {'create_invoice': 'true'}
            
            print(f"📤 POST {url}")
            start_time = time.time()
            
            response = requests.post(url, files=files, data=data, headers=headers, timeout=60)
            
            process_time = time.time() - start_time
            print(f"⏱️ 处理时间: {process_time:.2f} 秒")
            print(f"📊 状态码: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ 上传成功!")
                result = response.json()
                print("📄 响应内容:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
                return result
            else:
                print(f"❌ 上传失败! 状态码: {response.status_code}")
                print(f"错误内容: {response.text}")
                return None
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return None

if __name__ == "__main__":
    test_upload()