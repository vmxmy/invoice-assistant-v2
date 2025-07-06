#!/usr/bin/env python3
"""
测试Webhook端点
模拟Mailgun发送邮件数据到我们的webhook端点
"""

import sys
import json
import hashlib
import hmac
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import httpx
from app.core.config import settings


def generate_mailgun_signature(timestamp: str, token: str, signing_key: str) -> str:
    """生成Mailgun签名"""
    value = f"{timestamp}{token}"
    return hmac.new(
        signing_key.encode(),
        value.encode(),
        hashlib.sha256
    ).hexdigest()


def test_webhook_endpoint():
    """测试webhook端点"""
    print("🧪 Webhook端点测试")
    print("=" * 40)
    
    # 测试数据
    timestamp = str(int(time.time()))
    token = "test-token-123"
    
    # 模拟Mailgun form数据（使用标准UUID格式）
    form_data = {
        "recipient": "invoice-550e8400-e29b-41d4-a716-446655440000@invoice.example.com",
        "sender": "test@example.com",
        "subject": "发票 - 测试发票文档",
        "body-plain": "这是一个测试发票邮件",
        "body-html": "<p>这是一个测试发票邮件</p>",
        "Message-Id": f"test-message-{int(time.time())}@test.com",
        "attachment-count": "0"
    }
    
    # 生成测试签名
    signature = "test-signature-placeholder"
    
    print(f"📧 测试数据:")
    print(f"   收件人: {form_data['recipient']}")
    print(f"   主题: {form_data['subject']}")
    print(f"   发件人: {form_data['sender']}")
    
    try:
        # 发送到webhook端点
        webhook_url = "http://127.0.0.1:8090/api/v1/webhooks/email-received"
        
        print(f"\n🚀 发送到webhook端点...")
        print(f"   URL: {webhook_url}")
        
        headers = {
            "X-Mailgun-Signature-V2": signature,
            "X-Mailgun-Timestamp": timestamp,
            "X-Mailgun-Token": token
        }
        
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                webhook_url,
                data=form_data,
                headers=headers
            )
            
            print(f"✅ Webhook响应:")
            print(f"   状态码: {response.status_code}")
            print(f"   响应内容: {response.text}")
            
            if response.status_code == 200:
                print(f"🎉 Webhook测试成功!")
                return True
            else:
                print(f"⚠️  Webhook返回错误状态码: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ Webhook测试失败: {e}")
        print(f"💡 提示: 确保API服务器正在运行")
        return False


if __name__ == "__main__":
    test_webhook_endpoint()