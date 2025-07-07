#!/usr/bin/env python3
"""
简单API测试脚本
"""

import asyncio
import httpx
from pathlib import Path

async def test_api():
    """简单API测试"""
    
    # 读取认证token
    token_file = Path(".auth_token")
    if token_file.exists():
        auth_token = token_file.read_text().strip()
        headers = {"Authorization": f"Bearer {auth_token}"}
        print(f"✅ 读取到认证token: {auth_token[:20]}...")
    else:
        print("❌ 未找到认证token文件")
        return
    
    base_url = "http://127.0.0.1:8090/api/v1"
    
    # 配置客户端以避免IPv6问题
    async with httpx.AsyncClient(
        timeout=10.0,
        limits=httpx.Limits(max_connections=5)
    ) as client:
        try:
            # 测试版本端点
            print("🧪 测试版本端点...")
            response = await client.get(f"{base_url}/version")
            print(f"版本端点: {response.status_code} - {response.text[:200]}")
            
            # 测试增强文件列表端点
            print("🧪 测试增强文件列表端点...")
            response = await client.get(
                f"{base_url}/enhanced-files/list",
                headers=headers
            )
            print(f"文件列表端点: {response.status_code} - {response.text[:200]}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ 成功获取文件列表，共 {data.get('total', 0)} 个文件")
            else:
                print(f"❌ 文件列表获取失败: {response.text}")
            
        except Exception as e:
            print(f"❌ 请求异常: {e}")

if __name__ == "__main__":
    asyncio.run(test_api())