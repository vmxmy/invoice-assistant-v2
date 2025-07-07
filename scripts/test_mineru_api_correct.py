#!/usr/bin/env python3
"""
测试正确的MineruNet API调用方式
根据文档使用 v4 API 的批量处理模式
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

import httpx

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class MineruAPITester:
    """MineruNet API 测试器"""
    
    def __init__(self):
        self.base_url = "https://mineru.net/api/v4"
        self.api_token = settings.mineru_api_token
        self.timeout = 60
        
    async def test_api_health(self) -> Dict[str, Any]:
        """测试API健康状态"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/health")
                print(f"Health check response status: {response.status_code}")
                print(f"Health check response: {response.text}")
                return {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "status_code": response.status_code,
                    "response": response.text
                }
        except Exception as e:
            print(f"Health check failed: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def get_batch_upload_urls(self, file_paths: List[str]) -> Dict[str, Any]:
        """获取批量上传URL"""
        try:
            # 准备文件信息
            files_info = []
            for file_path in file_paths:
                path = Path(file_path)
                files_info.append({
                    "name": path.name,
                    "size": path.stat().st_size
                })
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "files": files_info
                }
                
                response = await client.post(
                    f"{self.base_url}/file-urls/batch",
                    headers=headers,
                    json=payload
                )
                
                print(f"Batch upload URLs request status: {response.status_code}")
                print(f"Response: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("code") == 0:
                        return result["data"]
                    else:
                        return {
                            "error": f"API Error: {result.get('msg', 'Unknown error')}",
                            "code": result.get("code"),
                            "response": result
                        }
                else:
                    return {
                        "error": f"HTTP {response.status_code}",
                        "response": response.text
                    }
                    
        except Exception as e:
            print(f"Get batch upload URLs failed: {e}")
            return {
                "error": str(e)
            }
    
    async def upload_file_to_presigned_url(self, file_path: str, upload_url: str) -> bool:
        """上传文件到预签名URL"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                with open(file_path, 'rb') as f:
                    file_content = f.read()
                    response = await client.put(
                        upload_url, 
                        content=file_content
                    )
                    
                print(f"Upload file {Path(file_path).name} status: {response.status_code}")
                print(f"Upload response: {response.text}")
                return response.status_code == 200
                
        except Exception as e:
            print(f"Upload file failed: {e}")
            return False
    
    async def poll_batch_results(self, batch_id: str, timeout: int = 600) -> Dict[str, Any]:
        """轮询批量处理结果"""
        start_time = time.time()
        poll_interval = 15  # 15秒轮询间隔
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                headers = {
                    "Authorization": f"Bearer {self.api_token}"
                }
                
                while time.time() - start_time < timeout:
                    response = await client.get(
                        f"{self.base_url}/extract-results/batch/{batch_id}",
                        headers=headers
                    )
                    
                    print(f"Poll results status: {response.status_code}")
                    
                    if response.status_code == 200:
                        result = response.json()
                        print(f"Current result: {json.dumps(result, indent=2, ensure_ascii=False)}")
                        
                        # 检查是否所有任务都完成
                        if self._all_tasks_completed(result):
                            return result
                    else:
                        print(f"Poll failed: {response.text}")
                    
                    await asyncio.sleep(poll_interval)
                
                return {"error": "Polling timeout"}
                
        except Exception as e:
            print(f"Poll batch results failed: {e}")
            return {"error": str(e)}
    
    def _all_tasks_completed(self, result: Dict[str, Any]) -> bool:
        """检查所有任务是否完成"""
        if result.get("code") != 0:
            return False
        
        data = result.get("data", {})
        extract_results = data.get("extract_result", [])
        
        if not extract_results:
            return False
        
        for task in extract_results:
            state = task.get("state", "")
            if state not in ["done", "failed"]:
                return False
        
        return True
    
    async def test_single_file_process(self, file_path: str) -> Dict[str, Any]:
        """测试单个文件的完整处理流程"""
        print(f"\n{'='*60}")
        print(f"Testing file: {Path(file_path).name}")
        print(f"File size: {Path(file_path).stat().st_size / 1024:.2f} KB")
        
        # 1. 获取批量上传URL
        print("\n1. Getting batch upload URLs...")
        upload_result = await self.get_batch_upload_urls([file_path])
        
        if "error" in upload_result:
            return {"error": f"Failed to get upload URLs: {upload_result['error']}"}
        
        # 2. 上传文件
        print("\n2. Uploading file...")
        batch_id = upload_result.get("batch_id")
        upload_urls = upload_result.get("file_urls", [])
        
        if not batch_id or not upload_urls:
            return {"error": "Invalid upload response format"}
        
        upload_success = await self.upload_file_to_presigned_url(file_path, upload_urls[0])
        if not upload_success:
            return {"error": "File upload failed"}
        
        # 3. 轮询结果
        print("\n3. Polling for results...")
        results = await self.poll_batch_results(batch_id)
        
        return {
            "batch_id": batch_id,
            "results": results
        }


async def main():
    """主测试函数"""
    print("开始测试MineruNet API正确调用方式...\n")
    
    tester = MineruAPITester()
    
    # 1. 测试API健康状态
    print("1. Testing API health...")
    health = await tester.test_api_health()
    print(f"Health status: {health}\n")
    
    # 2. 测试完整的文件处理流程
    pdf_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/downloads"
    pdf_files = list(Path(pdf_dir).glob("*.pdf"))
    
    if pdf_files:
        # 选择一个小文件进行测试
        test_file = min(pdf_files, key=lambda x: x.stat().st_size)
        print(f"2. Testing complete file processing workflow with: {test_file.name}")
        
        result = await tester.test_single_file_process(str(test_file))
        print(f"\nFinal result: {json.dumps(result, indent=2, ensure_ascii=False)}")
    else:
        print("No PDF files found for testing")
    
    print("\n=== 测试完成 ===")


if __name__ == "__main__":
    asyncio.run(main())