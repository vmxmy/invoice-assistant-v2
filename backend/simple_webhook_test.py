#!/usr/bin/env python3
"""
简单webhook测试
"""

import httpx
import time

def test_simple_webhook():
    """测试webhook端点的基本连接"""
    print("🧪 简单Webhook连接测试")
    
    # 先测试测试端点
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get("http://127.0.0.1:8090/api/v1/webhooks/test-webhook")
            print(f"✅ 测试端点响应: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ 测试端点失败: {e}")
        return False
    
    # 测试邮件接收端点的基本连接
    try:
        timestamp = str(int(time.time()))
        
        headers = {
            "X-Mailgun-Signature-V2": "test-sig",
            "X-Mailgun-Timestamp": timestamp,
            "X-Mailgun-Token": "test-token"
        }
        
        # 最小化的表单数据
        form_data = {
            "recipient": "invoice-test-user-123@invoice.example.com",
            "sender": "test@example.com",
            "subject": "测试",
            "attachment-count": "0"
        }
        
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                "http://127.0.0.1:8090/api/v1/webhooks/email-received",
                data=form_data,
                headers=headers
            )
            
            print(f"📧 邮件端点响应: {response.status_code}")
            print(f"   响应头: {dict(response.headers)}")
            print(f"   响应内容: {response.text}")
            
            if response.status_code == 503:
                print("⚠️  503错误通常表示服务暂时不可用")
                print("   可能原因:")
                print("   1. Dramatiq broker连接问题")
                print("   2. 数据库连接问题")
                print("   3. 某个依赖服务未准备就绪")
            
            return response.status_code < 500
            
    except Exception as e:
        print(f"❌ 邮件端点测试失败: {e}")
        return False

if __name__ == "__main__":
    test_simple_webhook()