#!/usr/bin/env python3
"""
检查扫描任务状态
"""
import asyncio
import httpx
import json
from datetime import datetime

# API配置
API_BASE_URL = "http://localhost:8090"

async def get_auth_token():
    """获取认证令牌"""
    auth_url = "https://sfenhhtvcyslxplvewmt.supabase.co/auth/v1/token?grant_type=password"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE",
        "Content-Type": "application/json"
    }
    
    with open('test_output/results/auth_request.json', 'r') as f:
        auth_data = json.load(f)
    
    async with httpx.AsyncClient(proxies={}) as client:
        response = await client.post(auth_url, headers=headers, json=auth_data)
        if response.status_code == 200:
            return response.json()['access_token']
        else:
            print(f"认证失败: {response.status_code} - {response.text}")
            return None

async def check_scan_jobs():
    """检查扫描任务状态"""
    token = await get_auth_token()
    if not token:
        print("获取令牌失败")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 获取最近的扫描任务
        response = await client.get(
            f"{API_BASE_URL}/api/v1/email-scan/jobs?limit=5",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"获取扫描任务失败: {response.status_code}")
            print(f"响应: {response.text}")
            return
        
        data = response.json()
        jobs = data.get('items', [])
        
        print(f"\n找到 {len(jobs)} 个扫描任务:")
        print("-" * 80)
        
        for job in jobs:
            print(f"\n任务ID: {job['job_id']}")
            print(f"状态: {job['status']}")
            print(f"进度: {job.get('progress', 0)}%")
            print(f"当前步骤: {job.get('current_step', 'N/A')}")
            print(f"创建时间: {job['created_at']}")
            print(f"完成时间: {job.get('completed_at', 'N/A')}")
            
            if job.get('error_message'):
                print(f"错误信息: {job['error_message']}")
            
            if job.get('scan_results'):
                results = job['scan_results']
                print(f"\n扫描结果:")
                print(f"  - 总邮件数: {results.get('total_emails', 0)}")
                print(f"  - 扫描邮件数: {results.get('scanned_emails', 0)}")
                print(f"  - 匹配邮件数: {results.get('matched_emails', 0)}")
                print(f"  - 找到的邮件数: {len(results.get('emails', []))}")
                
                if results.get('sync_errors'):
                    print(f"  - 同步错误: {results['sync_errors']}")
            
            # 如果任务是running状态，尝试获取更详细的信息
            if job['status'] == 'running':
                print(f"\n⚠️ 任务 {job['job_id']} 仍在运行中...")
                print(f"   可能的原因:")
                print(f"   1. 邮件数量较多，仍在处理中")
                print(f"   2. 网络连接较慢")
                print(f"   3. 任务卡住了（可能需要取消并重试）")
                
                # 检查任务运行时间
                created_at = datetime.fromisoformat(job['created_at'].replace('Z', '+00:00'))
                running_time = (datetime.now() - created_at.replace(tzinfo=None)).total_seconds() / 60
                print(f"   运行时间: {running_time:.1f} 分钟")
                
                if running_time > 10:
                    print(f"   ⚠️ 任务已运行超过10分钟，可能需要取消并重试")

async def get_job_details(job_id: str):
    """获取特定任务的详细信息"""
    token = await get_auth_token()
    if not token:
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{API_BASE_URL}/api/v1/email-scan/jobs/{job_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            job = response.json()
            print(f"\n任务详情:")
            print(json.dumps(job, indent=2, ensure_ascii=False))
        else:
            print(f"获取任务详情失败: {response.status_code}")

if __name__ == "__main__":
    print("=== 扫描任务状态检查 ===")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    asyncio.run(check_scan_jobs())
    
    # 如果需要查看特定任务的详情，可以取消注释并填入任务ID
    # asyncio.run(get_job_details("8e425913"))