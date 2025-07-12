#!/usr/bin/env python3
"""
检查已创建任务的状态
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# 配置
BACKEND_API_URL = "http://localhost:8090"
TASK_ID = "53d40ddb-b68c-4b56-afa6-5ae574ad86a7"  # 从日志中获取的任务ID

# 获取用户令牌
def get_user_token():
    with open('.user_token', 'r') as f:
        return f.read().strip()

async def main():
    """主测试流程"""
    print("=== 检查任务状态 ===")
    print(f"时间: {datetime.now()}")
    print(f"任务ID: {TASK_ID}")
    
    token = get_user_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    async with aiohttp.ClientSession() as session:
        # 查询最新发票
        try:
            async with session.get(
                f"{BACKEND_API_URL}/api/v1/invoices/",
                headers=headers,
                params={"limit": 10, "offset": 0, "sort": "created_at:desc"}
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    print(f"\n最新发票（按创建时间排序）:")
                    for item in result.get('items', []):
                        print(f"\n- 发票号: {item['invoice_number']}")
                        print(f"  创建时间: {item['created_at']}")
                        print(f"  来源: {item.get('source', 'unknown')}")
                        print(f"  销售方: {item['seller_name']}")
                        print(f"  金额: {item['total_amount']}")
        except Exception as e:
            print(f"查询异常: {e}")

if __name__ == "__main__":
    asyncio.run(main())