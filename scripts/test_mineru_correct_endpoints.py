#!/usr/bin/env python3
"""
测试正确的Mineru API端点
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
        'base_url': os.getenv('MINERU_API_BASE_URL', 'https://mineru.net/api')
    }


async def test_correct_endpoints():
    """测试正确的API端点"""
    config = load_env_config()
    
    headers = {
        'Authorization': f'Bearer {config["api_token"]}',
        'Content-Type': 'application/json',
        'User-Agent': 'invoice-assist-test/1.0'
    }
    
    base_url = config['base_url']
    
    print(f"🔗 测试API基础URL: {base_url}")
    print(f"🔑 使用Token: {config['api_token'][:20]}...")
    print()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # 1. 测试获取批量上传URL端点
        print("📡 测试 /file-urls/batch 端点 (POST)")
        try:
            test_files = [
                {"name": "test.pdf", "size": 1024}
            ]
            
            response = await client.post(
                f"{base_url}/v4/file-urls/batch",
                headers=headers,
                json={
                    "files": test_files,
                    "options": {
                        "extract_invoice": True,
                        "output_format": "json"
                    }
                }
            )
            
            print(f"   状态码: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ 响应格式正确")
                print(f"   📄 响应数据:")
                print(json.dumps(data, ensure_ascii=False, indent=4))
                
                # 提取batch_id用于后续测试
                batch_id = data.get('batch_id')
                if batch_id:
                    print(f"   🎯 获取到 batch_id: {batch_id}")
                    return batch_id
            else:
                print(f"   ❌ 错误: {response.text}")
                
        except Exception as e:
            print(f"   ❌ 异常: {e}")
        
        print()
        
        # 2. 测试状态查询端点（使用虚假的batch_id）
        print("📡 测试 /extract-results/batch/{batch_id} 端点 (GET)")
        try:
            fake_batch_id = "test_batch_123"
            response = await client.get(
                f"{base_url}/v4/extract-results/batch/{fake_batch_id}",
                headers=headers
            )
            
            print(f"   状态码: {response.status_code}")
            if response.status_code in [200, 404]:
                try:
                    data = response.json()
                    print(f"   📄 响应数据:")
                    print(json.dumps(data, ensure_ascii=False, indent=4)[:500])
                except:
                    print(f"   📄 响应文本: {response.text[:200]}")
            else:
                print(f"   ❌ 错误: {response.text[:200]}")
                
        except Exception as e:
            print(f"   ❌ 异常: {e}")
    
    return None


async def main():
    """主函数"""
    print("🧪 测试正确的Mineru API端点")
    print("=" * 50)
    
    batch_id = await test_correct_endpoints()
    
    if batch_id:
        print(f"\n🎉 API端点测试成功！获取到有效的 batch_id: {batch_id}")
        return 0
    else:
        print(f"\n⚠️ API端点测试未能获取到有效 batch_id")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())