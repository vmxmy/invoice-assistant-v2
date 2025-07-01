#!/usr/bin/env python3
"""
异步批量处理发票文件 - 支持任务状态实时刷新
"""
import os
import glob
import requests
import json
import time
import hashlib
import asyncio
import aiohttp
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# API配置
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
MINERU_API_BASE_URL = 'https://mineru.net/api'

class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
    ERROR = "error"

@dataclass
class FileTask:
    """文件任务信息"""
    file_path: str
    filename: str
    batch_id: Optional[str] = None
    task_id: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    error_msg: Optional[str] = None
    result_url: Optional[str] = None
    upload_url: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    
    @property
    def duration(self) -> float:
        """处理耗时"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0.0

class AsyncBatchProcessor:
    def __init__(self, max_concurrent_uploads: int = 5, max_concurrent_queries: int = 10):
        self.api_token = MINERU_API_TOKEN
        self.base_url = MINERU_API_BASE_URL
        self.headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json'
        }
        self.max_concurrent_uploads = max_concurrent_uploads
        self.max_concurrent_queries = max_concurrent_queries
        self.tasks: Dict[str, FileTask] = {}
        
    def get_pdf_files(self, directory: str, limit: Optional[int] = None) -> List[str]:
        """获取目录下的PDF文件"""
        pdf_pattern = os.path.join(directory, "*.pdf")
        pdf_files = sorted(glob.glob(pdf_pattern))
        
        if limit:
            pdf_files = pdf_files[:limit]
            
        print(f"找到 {len(pdf_files)} 个PDF文件")
        return pdf_files
    
    async def request_upload_urls(self, session: aiohttp.ClientSession, file_tasks: List[FileTask]) -> Dict[str, str]:
        """申请批量上传链接"""
        files_data = []
        task_mapping = {}
        
        for task in file_tasks:
            data_id = hashlib.md5(task.file_path.encode()).hexdigest()[:16]
            files_data.append({
                "name": task.filename,
                "is_ocr": True,
                "data_id": data_id
            })
            task_mapping[task.filename] = task
        
        data = {
            "enable_formula": False,
            "enable_table": True,
            "files": files_data
        }
        
        url = f'{self.base_url}/v4/file-urls/batch'
        
        async with session.post(url, headers=self.headers, json=data) as response:
            if response.status == 200:
                result = await response.json()
                print(f"\n申请上传链接响应: {json.dumps(result, ensure_ascii=False)[:200]}...")
                
                if result.get('code') == 0:
                    batch_id = result['data']['batch_id']
                    file_urls = result['data']['file_urls']
                    
                    print(f"批次ID: {batch_id}")
                    print(f"获得 {len(file_urls)} 个上传链接")
                    
                    # 分配上传URL给各个任务
                    url_mapping = {}
                    for i, (filename, task) in enumerate(task_mapping.items()):
                        if i < len(file_urls):
                            task.batch_id = batch_id
                            task.upload_url = file_urls[i]
                            task.task_id = hashlib.md5(f"{batch_id}_{filename}".encode()).hexdigest()[:16]
                            url_mapping[filename] = file_urls[i]
                            print(f"  {filename} -> {file_urls[i][:80]}...")
                    
                    return url_mapping
            else:
                print(f"申请上传链接失败: {response.status}")
                response_text = await response.text()
                print(f"响应: {response_text[:200]}")
        
        return {}
    
    async def upload_file(self, session: aiohttp.ClientSession, task: FileTask) -> bool:
        """异步上传单个文件"""
        if not task.upload_url:
            task.error_msg = "No upload URL"
            return False
            
        task.status = TaskStatus.UPLOADING
        task.start_time = time.time()
        
        try:
            with open(task.file_path, 'rb') as f:
                file_content = f.read()
            
            # 不要包含额外的headers，直接上传
            async with session.put(task.upload_url, data=file_content, headers={}) as response:
                if response.status == 200:
                    task.status = TaskStatus.PROCESSING
                    print(f"\n✓ 上传成功: {task.filename}")
                    return True
                else:
                    response_text = await response.text()
                    task.status = TaskStatus.ERROR
                    task.error_msg = f"Upload failed: {response.status} - {response_text[:100]}"
                    print(f"\n✗ 上传失败 {task.filename}: {response.status}")
                    return False
                    
        except Exception as e:
            task.status = TaskStatus.ERROR
            task.error_msg = str(e)
            print(f"\n✗ 上传异常 {task.filename}: {e}")
            return False
    
    async def check_task_status(self, session: aiohttp.ClientSession, task: FileTask) -> bool:
        """检查单个任务状态"""
        if task.status in [TaskStatus.DONE, TaskStatus.FAILED, TaskStatus.ERROR]:
            return True  # 已完成
        
        # 尝试多个可能的task_id
        possible_ids = [
            task.task_id,
            task.batch_id,
            hashlib.md5(task.filename.encode()).hexdigest(),
            hashlib.md5(task.file_path.encode()).hexdigest()[:16]
        ]
        
        for check_id in possible_ids:
            if not check_id:
                continue
                
            endpoint = f'{self.base_url}/v4/extract/task/{check_id}'
            
            try:
                async with session.get(endpoint, headers={'Authorization': f'Bearer {self.api_token}'}) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result.get('code') == 0:
                            data = result.get('data', {})
                            state = data.get('state', '').lower()
                            
                            if state == 'done':
                                task.status = TaskStatus.DONE
                                task.result_url = data.get('full_zip_url')
                                task.end_time = time.time()
                                return True
                            elif state in ['failed', 'error']:
                                task.status = TaskStatus.FAILED
                                task.error_msg = data.get('err_msg', 'Unknown error')
                                task.end_time = time.time()
                                return True
                            elif state in ['processing', 'pending']:
                                task.status = TaskStatus.PROCESSING
                                return False
            except:
                continue
        
        return False
    
    async def process_batch(self, file_tasks: List[FileTask]):
        """处理一批文件"""
        async with aiohttp.ClientSession() as session:
            # 1. 申请上传链接
            print(f"\n申请上传链接...")
            url_mapping = await self.request_upload_urls(session, file_tasks)
            
            if not url_mapping:
                print("申请上传链接失败")
                return
            
            # 2. 并发上传文件
            print(f"\n开始上传 {len(file_tasks)} 个文件...")
            upload_tasks = []
            for task in file_tasks:
                if task.upload_url:
                    upload_tasks.append(self.upload_file(session, task))
            
            # 限制并发数
            for i in range(0, len(upload_tasks), self.max_concurrent_uploads):
                batch = upload_tasks[i:i + self.max_concurrent_uploads]
                await asyncio.gather(*batch)
            
            # 3. 轮询检查任务状态
            print(f"\n等待解析完成...")
            all_done = False
            check_count = 0
            max_checks = 120  # 最多检查120次（10分钟）
            
            while not all_done and check_count < max_checks:
                check_count += 1
                
                # 检查所有任务状态
                check_tasks = []
                for task in file_tasks:
                    if task.status not in [TaskStatus.DONE, TaskStatus.FAILED, TaskStatus.ERROR]:
                        check_tasks.append(self.check_task_status(session, task))
                
                # 并发检查
                if check_tasks:
                    for i in range(0, len(check_tasks), self.max_concurrent_queries):
                        batch = check_tasks[i:i + self.max_concurrent_queries]
                        await asyncio.gather(*batch)
                
                # 显示当前状态
                self.display_status(file_tasks)
                
                # 检查是否全部完成
                all_done = all(
                    task.status in [TaskStatus.DONE, TaskStatus.FAILED, TaskStatus.ERROR] 
                    for task in file_tasks
                )
                
                if not all_done:
                    await asyncio.sleep(5)  # 等待5秒后再检查
    
    def display_status(self, file_tasks: List[FileTask]):
        """显示任务状态"""
        status_counts = {}
        for task in file_tasks:
            status = task.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # 清除上一行并显示新状态
        status_str = " | ".join([f"{status}: {count}" for status, count in status_counts.items()])
        print(f"\r状态: {status_str} | 总计: {len(file_tasks)}", end='', flush=True)
    
    async def download_results(self, session: aiohttp.ClientSession, task: FileTask, output_dir: str):
        """下载解析结果"""
        if task.status != TaskStatus.DONE or not task.result_url:
            return
        
        try:
            async with session.get(task.result_url) as response:
                if response.status == 200:
                    content = await response.read()
                    
                    # 保存ZIP文件
                    base_name = os.path.splitext(task.filename)[0]
                    zip_file = os.path.join(output_dir, f"{base_name}_result.zip")
                    
                    with open(zip_file, 'wb') as f:
                        f.write(content)
                    
                    print(f"\n✓ 已下载: {task.filename}")
        except Exception as e:
            print(f"\n✗ 下载失败 {task.filename}: {e}")
    
    async def process_directory(self, directory: str, limit: Optional[int] = None):
        """处理目录下的PDF文件"""
        start_time = time.time()
        
        # 1. 获取PDF文件
        pdf_files = self.get_pdf_files(directory, limit)
        if not pdf_files:
            print("没有找到PDF文件")
            return
        
        # 2. 创建任务
        file_tasks = []
        for pdf_path in pdf_files:
            task = FileTask(
                file_path=pdf_path,
                filename=os.path.basename(pdf_path)
            )
            self.tasks[pdf_path] = task
            file_tasks.append(task)
        
        print(f"\n将处理以下文件:")
        for i, task in enumerate(file_tasks, 1):
            print(f"{i}. {task.filename}")
        
        # 3. 批量处理（每批最多200个）
        batch_size = 200
        for i in range(0, len(file_tasks), batch_size):
            batch = file_tasks[i:i + batch_size]
            print(f"\n处理第 {i//batch_size + 1} 批（{len(batch)} 个文件）")
            await self.process_batch(batch)
        
        # 4. 下载结果
        output_dir = "/Users/xumingyang/app/invoice_assist/output_mineru/async_results"
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\n\n开始下载结果...")
        async with aiohttp.ClientSession() as session:
            download_tasks = []
            for task in file_tasks:
                if task.status == TaskStatus.DONE:
                    download_tasks.append(self.download_results(session, task, output_dir))
            
            # 并发下载
            for i in range(0, len(download_tasks), 5):
                batch = download_tasks[i:i + 5]
                await asyncio.gather(*batch)
        
        # 5. 生成报告
        self.generate_report(file_tasks, output_dir, time.time() - start_time)
    
    def generate_report(self, file_tasks: List[FileTask], output_dir: str, total_time: float):
        """生成处理报告"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_files': len(file_tasks),
            'total_time': f"{total_time:.2f}秒",
            'average_time': f"{total_time/len(file_tasks):.2f}秒/文件" if file_tasks else "0",
            'status_summary': {},
            'files': []
        }
        
        # 统计状态
        for task in file_tasks:
            status = task.status.value
            report['status_summary'][status] = report['status_summary'].get(status, 0) + 1
            
            file_info = {
                'filename': task.filename,
                'status': status,
                'duration': f"{task.duration:.2f}秒" if task.duration else "N/A",
                'error': task.error_msg,
                'result_url': task.result_url
            }
            report['files'].append(file_info)
        
        # 保存报告
        report_file = os.path.join(output_dir, f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 打印汇总
        print(f"\n\n{'='*60}")
        print(f"处理完成！")
        print(f"{'='*60}")
        print(f"总文件数: {report['total_files']}")
        print(f"总耗时: {report['total_time']}")
        print(f"平均处理时间: {report['average_time']}")
        print(f"\n状态统计:")
        for status, count in report['status_summary'].items():
            print(f"  {status}: {count}")
        print(f"\n报告已保存: {report_file}")


async def main():
    """主函数"""
    processor = AsyncBatchProcessor(
        max_concurrent_uploads=5,     # 同时上传5个文件
        max_concurrent_queries=10     # 同时查询10个任务状态
    )
    
    downloads_dir = "/Users/xumingyang/app/invoice_assist/downloads"
    
    # 处理目录（限制数量用于测试）
    await processor.process_directory(downloads_dir, limit=5)  # 先测试5个文件


if __name__ == "__main__":
    # 运行异步主函数
    asyncio.run(main())