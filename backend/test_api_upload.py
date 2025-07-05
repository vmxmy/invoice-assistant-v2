#!/usr/bin/env python3
"""
测试 FastAPI 上传接口的完整流程
包括认证和发票 OCR 处理
"""

import asyncio
import json
import os
import sys
from pathlib import Path
import glob
import httpx
import uuid

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.auth import supabase_auth
from app.utils.logger import get_logger

logger = get_logger(__name__)


class APITester:
    """API 测试器"""
    
    def __init__(self):
        self.base_url = f"http://localhost:{settings.app_port}"
        self.api_prefix = settings.api_v1_prefix
        self.timeout = 300  # 5分钟超时，因为OCR处理需要时间
        
    async def get_test_token(self) -> str:
        """获取测试用户的token"""
        try:
            # 使用我们之前创建的测试用户
            test_user_id = "550e8400-e29b-41d4-a716-446655440000"
            
            # 创建一个简单的JWT token用于测试
            # 在实际环境中，这应该通过Supabase认证获得
            test_payload = {
                "id": test_user_id,
                "email": "test@example.com",
                "role": "authenticated",
                "aud": "authenticated",
                "exp": 9999999999  # 很远的过期时间
            }
            
            # 注意：这是一个简化的测试token，实际应用中需要正确的Supabase JWT
            import jwt
            test_token = jwt.encode(
                test_payload, 
                settings.supabase_jwt_secret, 
                algorithm="HS256"
            )
            
            return test_token
            
        except Exception as e:
            logger.error(f"获取测试token失败: {e}")
            # 返回一个模拟token
            return "test-token-for-development"
    
    async def verify_token(self, token: str) -> dict:
        """验证token是否有效"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.base_url}{self.api_prefix}/auth/verify-token",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                print(f"Token验证状态: {response.status_code}")
                result = response.json()
                print(f"Token验证结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
                
                return result
        except Exception as e:
            logger.error(f"Token验证失败: {e}")
            return {"valid": False, "error": str(e)}
    
    async def upload_invoice_file(self, file_path: str, token: str) -> dict:
        """上传发票文件进行OCR处理"""
        try:
            print(f"\n{'='*60}")
            print(f"上传文件: {Path(file_path).name}")
            print(f"文件大小: {Path(file_path).stat().st_size / 1024:.2f} KB")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # 准备文件
                with open(file_path, 'rb') as f:
                    files = {
                        "file": (Path(file_path).name, f, "application/pdf")
                    }
                    
                    # 设置请求参数
                    data = {
                        "create_invoice": "true"
                    }
                    
                    headers = {
                        "Authorization": f"Bearer {token}"
                    }
                    
                    print(f"\n发送请求到: {self.base_url}{self.api_prefix}/files/upload")
                    print(f"请求头: {headers}")
                    print(f"参数: {data}")
                    
                    # 发送请求
                    response = await client.post(
                        f"{self.base_url}{self.api_prefix}/files/upload",
                        files=files,
                        data=data,
                        headers=headers
                    )
                    
                    print(f"\n响应状态码: {response.status_code}")
                    print(f"响应头: {dict(response.headers)}")
                    
                    if response.status_code == 200:
                        result = response.json()
                        print(f"\n✅ 上传成功!")
                        print(f"完整响应内容:")
                        print(json.dumps(result, indent=2, ensure_ascii=False))
                        
                        return result
                    else:
                        error_content = response.text
                        print(f"\n❌ 上传失败!")
                        print(f"错误内容: {error_content}")
                        
                        try:
                            error_json = response.json()
                            print(f"错误详情: {json.dumps(error_json, indent=2, ensure_ascii=False)}")
                        except:
                            pass
                        
                        return {
                            "error": f"HTTP {response.status_code}",
                            "content": error_content
                        }
                        
        except Exception as e:
            print(f"\n❌ 请求失败: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}
    
    async def get_invoice_detail(self, invoice_id: str, token: str) -> dict:
        """获取发票详情（包含OCR结果）"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    f"{self.base_url}{self.api_prefix}/invoices/{invoice_id}",
                    headers={"Authorization": f"Bearer {token}"}
                )
                
                print(f"\n📄 获取发票详情状态: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"发票详情:")
                    print(json.dumps(result, indent=2, ensure_ascii=False))
                    return result
                else:
                    error_content = response.text
                    print(f"获取详情失败: {error_content}")
                    return {"error": error_content}
                    
        except Exception as e:
            print(f"获取发票详情失败: {e}")
            return {"error": str(e)}


async def main():
    """主测试函数"""
    print("开始测试 FastAPI 发票上传和 OCR 处理...\n")
    
    tester = APITester()
    
    # 1. 获取测试token
    print("1. 获取测试token")
    token = await tester.get_test_token()
    print(f"测试token: {token[:50]}...")
    
    # 2. 验证token
    print(f"\n2. 验证token")
    token_valid = await tester.verify_token(token)
    
    if not token_valid.get("valid"):
        print(f"⚠️ Token验证失败，但继续测试...")
        # 继续测试，某些情况下验证可能失败但API仍可工作
    
    # 3. 选择测试文件
    pdf_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/downloads"
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    
    if not pdf_files:
        print("❌ 未找到测试文件")
        return
    
    # 选择一个较小的文件进行测试
    test_file = min(pdf_files, key=lambda x: Path(x).stat().st_size)
    
    # 4. 上传文件并处理
    print(f"\n3. 上传文件进行OCR处理")
    upload_result = await tester.upload_invoice_file(test_file, token)
    
    # 5. 如果上传成功，获取发票详情
    if "invoice_id" in upload_result:
        invoice_id = upload_result["invoice_id"]
        print(f"\n4. 获取发票详情 (ID: {invoice_id})")
        await tester.get_invoice_detail(str(invoice_id), token)
    else:
        print(f"\n❌ 未获得invoice_id，无法查询详情")
    
    print(f"\n\n=== 测试完成 ===")


if __name__ == "__main__":
    asyncio.run(main())