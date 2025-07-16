#!/usr/bin/env python3
"""
测试 invoice_types_v3_supabase.py API 端点
验证所有功能是否正常工作
"""

import asyncio
import sys
import os
import json
from datetime import datetime
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

import httpx

# 配置
BASE_URL = "http://localhost:8090"
API_PREFIX = "/api/v1"

class InvoiceTypesV3SupabaseTest:
    def __init__(self):
        # 简化配置，使用基本的超时设置
        self.client = httpx.AsyncClient(
            base_url=BASE_URL, 
            timeout=30.0
        )
        
        # 尝试读取认证令牌
        auth_token = None
        try:
            with open('.auth_token', 'r') as f:
                auth_token = f.read().strip()
        except FileNotFoundError:
            print("⚠️  未找到认证令牌文件 .auth_token")
        
        self.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # 如果有认证令牌，添加到headers
        if auth_token:
            self.headers["Authorization"] = f"Bearer {auth_token}"
            print(f"✅ 已加载认证令牌")
        
        self.test_results = []
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
        
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
        if data:
            print(f"   Data: {json.dumps(data, indent=2, ensure_ascii=False)}")
        print()
        
    async def test_health_check(self):
        """测试健康检查端点"""
        try:
            response = await self.client.get(f"{API_PREFIX}/invoice-types/health")
            
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
            import traceback
            self.log_test(
                "Health Check",
                False,
                f"Exception: {str(e)}\nTraceback: {traceback.format_exc()}"
            )
            return False
            
    async def test_get_invoice_type_enum(self):
        """测试获取发票类型枚举"""
        try:
            response = await self.client.get(f"{API_PREFIX}/invoice-types/enum/types")
            
            if response.status_code == 200:
                data = response.json()
                types = data.get('types', [])
                self.log_test(
                    "Get Invoice Type Enum",
                    True,
                    f"Found {len(types)} invoice types",
                    {"types": types}
                )
                return True
            else:
                self.log_test(
                    "Get Invoice Type Enum",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Get Invoice Type Enum",
                False,
                f"Exception: {str(e)}"
            )
            return False
            
    async def test_get_all_configs(self):
        """测试获取所有配置"""
        try:
            response = await self.client.get(f"{API_PREFIX}/invoice-types/")
            
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
            
    async def test_get_high_priority_configs(self):
        """测试获取高优先级配置"""
        try:
            response = await self.client.get(f"{API_PREFIX}/invoice-types/?high_priority_only=true")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Get High Priority Configs",
                    True,
                    f"Found {len(data)} high priority configurations",
                    {"count": len(data)}
                )
                return data
            else:
                self.log_test(
                    "Get High Priority Configs",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return []
                
        except Exception as e:
            self.log_test(
                "Get High Priority Configs",
                False,
                f"Exception: {str(e)}"
            )
            return []
            
    async def test_search_configs(self):
        """测试搜索配置功能"""
        try:
            # 测试搜索火车票相关配置
            response = await self.client.get(
                f"{API_PREFIX}/invoice-types/search?keywords=火车票&keywords=train"
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Search Configs",
                    True,
                    f"Found {len(data)} configurations matching keywords",
                    {"count": len(data), "first_result": data[0] if data else None}
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
            
    async def test_get_specific_config(self, type_code: str = "train_ticket"):
        """测试获取特定配置"""
        try:
            response = await self.client.get(f"{API_PREFIX}/invoice-types/config/{type_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    f"Get Specific Config ({type_code})",
                    True,
                    f"Retrieved config: {data.get('type_name', 'Unknown')}",
                    {"type_code": data.get('type_code'), "type_name": data.get('type_name')}
                )
                return data
            elif response.status_code == 404:
                self.log_test(
                    f"Get Specific Config ({type_code})",
                    False,
                    f"Config not found: {type_code}"
                )
                return None
            else:
                self.log_test(
                    f"Get Specific Config ({type_code})",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_test(
                f"Get Specific Config ({type_code})",
                False,
                f"Exception: {str(e)}"
            )
            return None
            
    async def test_create_config(self):
        """测试创建配置"""
        try:
            test_config = {
                "type_code": "test_receipt",
                "type_name": "测试收据",
                "display_name": "测试收据",
                "description": "用于测试的收据类型",
                "pdf_keywords": ["测试", "收据"],
                "filename_keywords": ["test", "receipt"],
                "ocr_field_patterns": {
                    "amount": r"\\d+\\.\\d{2}"
                },
                "amount_range": [0.01, 1000.00],
                "priority": 90,
                "enabled": True,
                "fields": [
                    {
                        "name": "amount",
                        "display_name": "金额",
                        "value_paths": ["amount", "total"],
                        "data_type": "number",
                        "required": True
                    }
                ],
                "validation_rules": ["required_amount"]
            }
            
            response = await self.client.post(
                f"{API_PREFIX}/invoice-types/",
                json=test_config,
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Create Config",
                    True,
                    f"Created config: {data.get('type_code')}",
                    {"type_code": data.get('type_code'), "id": str(data.get('id'))}
                )
                return data
            else:
                self.log_test(
                    "Create Config",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Create Config",
                False,
                f"Exception: {str(e)}"
            )
            return None
            
    async def test_update_config(self, type_code: str = "test_receipt"):
        """测试更新配置"""
        try:
            update_data = {
                "type_code": type_code,
                "type_name": "更新的测试收据",
                "display_name": "更新的测试收据",
                "description": "已更新的用于测试的收据类型",
                "pdf_keywords": ["测试", "收据", "更新"],
                "filename_keywords": ["test", "receipt", "updated"],
                "ocr_field_patterns": {
                    "amount": r"\\d+\\.\\d{2}"
                },
                "amount_range": [0.01, 2000.00],
                "priority": 85,
                "enabled": True,
                "fields": [
                    {
                        "name": "amount",
                        "display_name": "金额",
                        "value_paths": ["amount", "total"],
                        "data_type": "number",
                        "required": True
                    }
                ],
                "validation_rules": ["required_amount"]
            }
            
            response = await self.client.put(
                f"{API_PREFIX}/invoice-types/config/{type_code}",
                json=update_data,
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Update Config",
                    True,
                    f"Updated config: {data.get('type_code')} - {data.get('type_name')}",
                    {"type_code": data.get('type_code'), "type_name": data.get('type_name')}
                )
                return data
            else:
                self.log_test(
                    "Update Config",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return None
                
        except Exception as e:
            self.log_test(
                "Update Config",
                False,
                f"Exception: {str(e)}"
            )
            return None
            
    async def test_batch_update_priorities(self):
        """测试批量更新优先级"""
        try:
            # 假设有一些配置存在
            updates = [
                {"type_code": "train_ticket", "priority": 10},
                {"type_code": "vat_invoice", "priority": 20}
            ]
            
            response = await self.client.post(
                f"{API_PREFIX}/invoice-types/batch-update-priorities",
                json={"updates": updates},
                headers=self.headers
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Batch Update Priorities",
                    True,
                    data.get('message', 'Batch update successful'),
                    {"updates_count": len(updates)}
                )
                return True
            else:
                self.log_test(
                    "Batch Update Priorities",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Batch Update Priorities",
                False,
                f"Exception: {str(e)}"
            )
            return False
            
    async def test_service_statistics(self):
        """测试服务统计信息"""
        try:
            response = await self.client.get(f"{API_PREFIX}/invoice-types/statistics/service")
            
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
            
    async def test_classification(self):
        """测试智能分类功能"""
        try:
            # 测试分类请求
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
            
            response = await self.client.post(
                f"{API_PREFIX}/invoice-types/classify",
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
                        "score_details": data.get('score_details')
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
            
    async def test_delete_config(self, type_code: str = "test_receipt"):
        """测试删除配置"""
        try:
            response = await self.client.delete(f"{API_PREFIX}/invoice-types/config/{type_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Delete Config",
                    True,
                    data.get('message', 'Config deleted successfully'),
                    {"type_code": type_code}
                )
                return True
            else:
                self.log_test(
                    "Delete Config",
                    False,
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Delete Config",
                False,
                f"Exception: {str(e)}"
            )
            return False
            
    async def run_all_tests(self):
        """运行所有测试"""
        print("=" * 60)
        print("开始测试 Invoice Types V3 Supabase API")
        print("=" * 60)
        
        # 基础功能测试
        await self.test_health_check()
        await self.test_get_invoice_type_enum()
        
        # 配置管理测试
        configs = await self.test_get_all_configs()
        await self.test_get_high_priority_configs()
        await self.test_search_configs()
        
        # 如果有配置，测试获取特定配置
        if configs:
            first_config = configs[0]
            await self.test_get_specific_config(first_config.get('type_code'))
            
        # CRUD 操作测试
        created_config = await self.test_create_config()
        if created_config:
            await self.test_update_config(created_config.get('type_code'))
            
        # 批量操作测试
        await self.test_batch_update_priorities()
        
        # 统计信息测试
        await self.test_service_statistics()
        
        # 分类功能测试
        await self.test_classification()
        
        # 清理测试数据
        if created_config:
            await self.test_delete_config(created_config.get('type_code'))
            
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
    async with InvoiceTypesV3SupabaseTest() as test:
        await test.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())