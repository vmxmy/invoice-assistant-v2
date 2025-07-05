#!/usr/bin/env python3
"""
简化webhook测试 - 不依赖数据库
"""

import httpx
import time
import json

def test_webhook_without_db():
    """测试webhook端点，不使用数据库依赖"""
    print("🧪 无数据库依赖的Webhook测试")
    
    timestamp = str(int(time.time()))
    
    # 最简单的POST请求
    try:
        url = "http://127.0.0.1:8090/api/v1/webhooks/email-received"
        headers = {
            "X-Mailgun-Signature-V2": "test-signature",
            "X-Mailgun-Timestamp": timestamp,
            "X-Mailgun-Token": "test-token",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # 最简单的数据
        data = "recipient=test@example.com&sender=sender@example.com&subject=test"
        
        print(f"发送请求到: {url}")
        
        response = httpx.post(url, content=data, headers=headers, timeout=10.0)
        
        print(f"状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        print(f"响应内容: {response.text}")
        
        if response.status_code >= 500:
            print("❌ 服务器内部错误")
        elif response.status_code >= 400:
            print("⚠️  客户端错误")
        else:
            print("✅ 请求成功")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")

if __name__ == "__main__":
    test_webhook_without_db()