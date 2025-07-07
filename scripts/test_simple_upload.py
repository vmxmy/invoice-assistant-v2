#!/usr/bin/env python3
"""
简单的文件上传测试，跳过认证
"""

import asyncio
import httpx
import os
from pathlib import Path


async def test_simple_upload():
    """简单上传测试"""
    # 选择一个小文件
    test_file = "/Users/xumingyang/app/invoice_assist/v2/backend/downloads/25429165818000508973.pdf"
    
    if not Path(test_file).exists():
        print("测试文件不存在")
        return
    
    print(f"测试文件: {Path(test_file).name}")
    print(f"文件大小: {Path(test_file).stat().st_size / 1024:.2f} KB")
    
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # 先测试版本端点
            print("\n测试版本端点...")
            version_resp = await client.get("http://localhost:8090/api/v1/version")
            print(f"版本端点状态: {version_resp.status_code}")
            print(f"版本信息: {version_resp.json()}")
            
            # 测试健康检查（如果有的话）
            print(f"\n测试根路径...")
            root_resp = await client.get("http://localhost:8090/")
            print(f"根路径状态: {root_resp.status_code}")
            print(f"根路径响应: {root_resp.text[:200]}")
            
            # 测试docs端点
            print(f"\n测试docs端点...")
            docs_resp = await client.get("http://localhost:8090/docs")
            print(f"Docs状态: {docs_resp.status_code}")
            
    except Exception as e:
        print(f"连接失败: {e}")


if __name__ == "__main__":
    asyncio.run(test_simple_upload())