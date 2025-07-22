#!/usr/bin/env python3
"""
分析扫描任务日志，检查日期参数传递问题
"""
import httpx
import asyncio
import json
from datetime import datetime

# API配置
BASE_URL = "http://localhost:8090"
SUPABASE_URL = "https://sfenhhtvcyslxplvewmt.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE"


async def analyze_scan_jobs():
    """分析最近的扫描任务"""
    print("=" * 60)
    print("扫描任务日志分析")
    print("=" * 60)
    
    # 获取认证token
    auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    auth_data = {
        "email": "blueyang@gmail.com",
        "password": "Xumy8%2175"
    }
    
    async with httpx.AsyncClient(proxy=None, timeout=30.0) as client:
        response = await client.post(
            auth_url,
            json=auth_data,
            headers={
                "apikey": ANON_KEY,
                "Content-Type": "application/json"
            }
        )
        
        if response.status_code != 200:
            print("❌ 认证失败")
            return
            
        token = response.json()["access_token"]
        
        # 获取最近的扫描任务
        response = await client.get(
            f"{BASE_URL}/api/v1/email-scan/jobs?limit=10",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code != 200:
            print("❌ 获取任务列表失败")
            return
            
        jobs = response.json()["data"]["items"]
        
        print(f"\n找到 {len(jobs)} 个扫描任务")
        print("-" * 60)
        
        # 分析每个任务
        for job in jobs[:5]:  # 只分析最近5个
            job_id = job["job_id"]
            created_at = job["created_at"]
            
            # 获取任务详情
            detail_response = await client.get(
                f"{BASE_URL}/api/v1/email-scan/jobs/{job_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if detail_response.status_code == 200:
                job_detail = detail_response.json()["data"]
                
                print(f"\n任务ID: {job_id}")
                print(f"创建时间: {created_at}")
                print(f"状态: {job_detail['status']}")
                
                # 分析扫描参数
                scan_params = job_detail.get("scan_params", {})
                print(f"\n扫描参数:")
                print(f"  - date_from: {scan_params.get('date_from', '未设置')}")
                print(f"  - date_to: {scan_params.get('date_to', '未设置')}")
                print(f"  - keywords: {scan_params.get('subject_keywords', [])}")
                print(f"  - exclude: {scan_params.get('exclude_keywords', [])}")
                
                # 结果统计
                print(f"\n结果统计:")
                print(f"  - 总邮件数: {job_detail.get('total_emails', 0)}")
                print(f"  - 扫描邮件: {job_detail.get('scanned_emails', 0)}")
                print(f"  - 匹配邮件: {job_detail.get('matched_emails', 0)}")
                
                # 分析邮件日期分布
                if job_detail.get("scan_results", {}).get("emails"):
                    emails = job_detail["scan_results"]["emails"]
                    date_stats = {}
                    
                    for email in emails:
                        if email.get("date"):
                            month = email["date"][:7]
                            date_stats[month] = date_stats.get(month, 0) + 1
                    
                    print(f"\n邮件日期分布:")
                    for month in sorted(date_stats.keys()):
                        print(f"  - {month}: {date_stats[month]}封")
                
                print("-" * 60)


async def test_imap_mock():
    """测试IMAP模拟模式"""
    print("\n\n测试IMAP模拟模式")
    print("=" * 60)
    
    # 检查是否启用了mock模式
    import os
    mock_enabled = os.getenv("ENABLE_IMAP_MOCK", "false").lower() == "true"
    
    print(f"IMAP Mock模式: {'已启用' if mock_enabled else '未启用'}")
    
    if mock_enabled:
        print("\n⚠️  警告: IMAP Mock模式已启用!")
        print("在Mock模式下，所有搜索都会返回相同的模拟数据")
        print("这会导致不同日期范围返回相同结果")
        print("\n解决方案:")
        print("1. 设置环境变量: export ENABLE_IMAP_MOCK=false")
        print("2. 或在.env文件中设置: ENABLE_IMAP_MOCK=false")


if __name__ == "__main__":
    # 运行分析
    asyncio.run(analyze_scan_jobs())
    
    # 测试mock模式
    asyncio.run(test_imap_mock())