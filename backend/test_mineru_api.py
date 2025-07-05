#!/usr/bin/env python3
"""
Mineru API 连接测试

测试Mineru API的连接性和可用端点
"""

import asyncio
import httpx
import os
import json
from pathlib import Path


def load_env_config():
    """从环境变量加载配置"""
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value.strip('"')
    
    return {
        'api_token': os.getenv('MINERU_API_TOKEN'),
        'base_url': os.getenv('MINERU_API_BASE_URL', 'https://mineru.net')
    }


async def test_api_endpoints(config):
    """测试不同的API端点"""
    headers = {
        'Authorization': f'Bearer {config["api_token"]}',
        'Content-Type': 'application/json',
        'User-Agent': 'invoice-assist-test/1.0'
    }
    
    base_url = config['base_url']
    
    # 测试不同的端点
    endpoints_to_test = [
        "/health",
        "/api/health",
        "/v1/health",
        "/v4/health",
        "/status",
        "/api/status",
        "/v1/status",
        "/v4/status",
        "/",
        "/api/v1/",
        "/api/v4/",
        "/v4/",
        "/docs",
        "/api/docs",
        "/v4/docs",
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        print(f"🔗 测试API基础URL: {base_url}")
        print(f"🔑 使用Token: {config['api_token'][:20]}...")
        print()
        
        for endpoint in endpoints_to_test:
            url = f"{base_url}{endpoint}"
            print(f"📡 测试端点: {endpoint}")
            
            try:
                response = await client.get(url, headers=headers)
                print(f"   ✅ 状态码: {response.status_code}")
                
                if response.status_code == 200:
                    # 尝试解析JSON
                    try:
                        data = response.json()
                        print(f"   📄 响应: {json.dumps(data, ensure_ascii=False, indent=4)[:200]}...")
                    except:
                        content = response.text[:200]
                        print(f"   📄 响应: {content}...")
                elif response.status_code in [401, 403]:
                    print("   🔐 需要认证或权限不足")
                elif response.status_code == 404:
                    print("   🚫 端点不存在")
                elif response.status_code == 405:
                    print("   ⚠️ 方法不允许 (可能需要POST)")
                else:
                    print(f"   ❓ 其他状态: {response.text[:100]}")
                    
            except httpx.TimeoutException:
                print("   ⏰ 请求超时")
            except Exception as e:
                print(f"   ❌ 错误: {e}")
            
            print()


async def test_common_ocr_endpoints(config):
    """测试常见的OCR相关端点"""
    headers = {
        'Authorization': f'Bearer {config["api_token"]}',
        'Content-Type': 'application/json',
        'User-Agent': 'invoice-assist-test/1.0'
    }
    
    base_url = config['base_url']
    
    # 常见的OCR端点
    ocr_endpoints = [
        "/api/v1/ocr",
        "/api/v1/parse",
        "/api/v1/extract",
        "/api/v1/invoice",
        "/v1/ocr",
        "/v1/parse", 
        "/v1/extract",
        "/v1/invoice",
        "/v4/ocr",
        "/v4/parse",
        "/v4/extract",
        "/v4/invoice",
        "/v4/batch",
        "/api/v4/batch",
        "/ocr",
        "/parse",
        "/extract",
        "/invoice",
        "/batch"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        print("🔍 测试OCR相关端点...")
        print()
        
        for endpoint in ocr_endpoints:
            url = f"{base_url}{endpoint}"
            print(f"📡 测试OCR端点: {endpoint}")
            
            try:
                # 先试GET
                response = await client.get(url, headers=headers)
                print(f"   GET ✅ 状态码: {response.status_code}")
                
                if response.status_code == 405:
                    # 如果GET不允许，试POST
                    try:
                        post_response = await client.post(url, headers=headers, json={})
                        print(f"   POST ✅ 状态码: {post_response.status_code}")
                        
                        if post_response.status_code == 200:
                            try:
                                data = post_response.json()
                                print(f"   📄 POST响应: {json.dumps(data, ensure_ascii=False, indent=4)[:200]}...")
                            except:
                                content = post_response.text[:200]
                                print(f"   📄 POST响应: {content}...")
                    except Exception as e:
                        print(f"   POST ❌ 错误: {e}")
                
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        print(f"   📄 GET响应: {json.dumps(data, ensure_ascii=False, indent=4)[:200]}...")
                    except:
                        content = response.text[:200]
                        print(f"   📄 GET响应: {content}...")
                
            except Exception as e:
                print(f"   ❌ 错误: {e}")
            
            print()


async def test_mineru_documentation():
    """测试获取API文档"""
    print("📚 尝试获取API文档...")
    
    doc_urls = [
        "https://mineru.net/docs",
        "https://mineru.net/api/docs", 
        "https://mineru.net/swagger",
        "https://mineru.net/openapi.json",
        "https://mineru.net/redoc",
        "https://api.mineru.net/docs",
        "https://api.mineru.net/swagger",
        "https://docs.mineru.net/"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for url in doc_urls:
            try:
                response = await client.get(url)
                print(f"📖 {url}: {response.status_code}")
                if response.status_code == 200:
                    content = response.text[:300]
                    print(f"   内容预览: {content}...")
                    break
            except Exception as e:
                print(f"📖 {url}: 错误 - {e}")


async def main():
    """主函数"""
    print("🧪 Mineru API 连接测试")
    print("=" * 50)
    
    # 加载配置
    config = load_env_config()
    
    if not config['api_token']:
        print("❌ 未找到MINERU_API_TOKEN")
        return 1
    
    # 测试基础端点
    await test_api_endpoints(config)
    
    print("\n" + "="*50)
    
    # 测试OCR端点
    await test_common_ocr_endpoints(config)
    
    print("\n" + "="*50)
    
    # 测试文档
    await test_mineru_documentation()
    
    print("\n🎉 测试完成！")
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())