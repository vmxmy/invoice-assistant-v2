#!/usr/bin/env python3
"""
修复后的异步API测试脚本
使用更简单的方法来避免 httpx AsyncClient 连接问题
"""

import asyncio
import requests
import json
from datetime import datetime

# 配置
BASE_URL = "http://localhost:8090"
API_PREFIX = "/api/v1"

class AsyncAPITest:
    def __init__(self):
        # 使用同步请求库，但在异步函数中调用
        self.base_url = BASE_URL
        self.api_prefix = API_PREFIX
        
        # 读取认证令牌
        try:
            with open('.auth_token', 'r') as f:
                auth_token = f.read().strip()
                self.headers = {
                    "Authorization": f"Bearer {auth_token}",
                    "Content-Type": "application/json"
                }
                print("✅ 已加载认证令牌")
        except FileNotFoundError:
            print("❌ 未找到认证令牌文件")
            self.headers = {"Content-Type": "application/json"}
        
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, message: str = "", data: dict = None):
        """记录测试结果"""
        result = {
            "test_name": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   {message}")
        if data and success:  # 只在成功时显示数据概要
            if isinstance(data, list):
                print(f"   返回 {len(data)} 项数据")
            elif isinstance(data, dict) and 'count' in data:
                print(f"   数据项: {data['count']}")
        print()
    
    async def run_sync_request(self, method: str, url: str, **kwargs):
        """在异步环境中运行同步请求"""
        loop = asyncio.get_event_loop()
        # 在线程池中运行同步请求以避免阻塞事件循环
        return await loop.run_in_executor(
            None,
            lambda: requests.request(method, url, timeout=10, **kwargs)
        )
    
    async def test_health_check(self):
        """测试健康检查端点"""
        try:
            response = await self.run_sync_request(
                "GET", 
                f"{self.base_url}{self.api_prefix}/invoice-types/health"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Health Check",
                    True,
                    f"Service: {data.get('service', 'Unknown')} - Version: {data.get('version', 'Unknown')}",
                    data
                )
                return True
            else:
                self.log_test(
                    "Health Check",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Health Check",
                False,
                f"Exception: {str(e)}"
            )
            return False
    
    async def test_get_all_configs(self):
        """测试获取所有配置"""
        try:
            response = await self.run_sync_request(
                "GET",
                f"{self.base_url}{self.api_prefix}/invoice-types/",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Get All Configs",
                    True,
                    f"Found {len(data)} configurations",
                    {"count": len(data), "first_config": data[0] if data else None}
                )
                return data
            else:
                self.log_test(
                    "Get All Configs",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return []
                
        except Exception as e:
            self.log_test(
                "Get All Configs",
                False,
                f"Exception: {str(e)}"
            )
            return []
    
    async def test_search_configs(self):
        """测试搜索配置功能"""
        try:
            response = await self.run_sync_request(
                "GET",
                f"{self.base_url}{self.api_prefix}/invoice-types/search?keywords=火车票",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Search Configs",
                    True,
                    f"Found {len(data)} configurations matching keywords",
                    {"count": len(data), "results": [{"type_code": c.get("type_code"), "display_name": c.get("display_name")} for c in data]}
                )
                return data
            else:
                self.log_test(
                    "Search Configs",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return []
                
        except Exception as e:
            self.log_test(
                "Search Configs",
                False,
                f"Exception: {str(e)}"
            )
            return []
    
    async def test_classification(self):
        """测试智能分类功能"""
        try:
            test_data = {
                "pdf_content": None,
                "filename": "火车票_2024.pdf",
                "ocr_data": {
                    "fare": "120.5",
                    "departure": "北京",
                    "arrival": "上海",
                    "date": "2024-01-15"
                },
                "use_high_priority_only": False
            }
            
            response = await self.run_sync_request(
                "POST",
                f"{self.base_url}{self.api_prefix}/invoice-types/classify",
                json=test_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Classification Test",
                    True,
                    f"Classified as: {data.get('type_code')} with confidence {data.get('confidence', 0):.3f}",
                    {
                        "type_code": data.get('type_code'),
                        "confidence": data.get('confidence'),
                        "display_name": data.get('display_name')
                    }
                )
                return data
            else:
                self.log_test(
                    "Classification Test",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Classification Test",
                False,
                f"Exception: {str(e)}"
            )
            return None
    
    async def test_service_statistics(self):
        """测试服务统计信息"""
        try:
            response = await self.run_sync_request(
                "GET",
                f"{self.base_url}{self.api_prefix}/invoice-types/statistics/service",
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Service Statistics",
                    True,
                    f"Total configs: {data.get('total_configs', 0)}, High priority: {data.get('high_priority_configs', 0)}",
                    data
                )
                return data
            else:
                self.log_test(
                    "Service Statistics",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Service Statistics",
                False,
                f"Exception: {str(e)}"
            )
            return None
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("=" * 60)
        print("开始测试 Invoice Types V3 Supabase API (异步版本)")
        print("=" * 60)
        
        # 基础功能测试
        await self.test_health_check()
        
        # 配置管理测试
        await self.test_get_all_configs()
        await self.test_search_configs()
        
        # 分类功能测试
        await self.test_classification()
        
        # 统计信息测试
        await self.test_service_statistics()
        
        # 输出测试结果摘要
        self.print_test_summary()
    
    def print_test_summary(self):
        """打印测试结果摘要"""
        print("\n" + "=" * 60)
        print("测试结果摘要")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"总测试数: {total_tests}")
        print(f"通过: {passed_tests}")
        print(f"失败: {failed_tests}")
        print(f"通过率: {(passed_tests / total_tests * 100):.1f}%")
        
        if failed_tests > 0:
            print("\n失败的测试:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test_name']}: {result['message']}")
        
        print("\n" + "=" * 60)

async def main():
    """主函数"""
    test = AsyncAPITest()
    await test.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())