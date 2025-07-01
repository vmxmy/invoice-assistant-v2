#!/usr/bin/env python3
"""
MineRu API 批量文件上传解析
使用文件上传链接方式处理本地文件
"""
import os
import requests
import json
import time
from typing import List, Dict
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# API配置
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
MINERU_API_BASE_URL = 'https://mineru.net/api'

class MineruBatchUploader:
    def __init__(self):
        self.api_token = MINERU_API_TOKEN
        self.base_url = MINERU_API_BASE_URL
        self.headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json',
            'Accept': '*/*'
        }
    
    def request_upload_links(self, file_names: List[str]) -> Dict:
        """
        申请批量文件上传链接
        
        Args:
            file_names: 文件名列表（最多200个）
            
        Returns:
            API响应，包含上传链接和任务ID
        """
        if len(file_names) > 200:
            raise ValueError("单次申请链接不能超过200个")
        
        # 构建请求数据
        files_data = []
        for file_name in file_names:
            files_data.append({
                'filename': os.path.basename(file_name),
                'is_ocr': True,
                'enable_formula': False
            })
        
        data = {
            'files': files_data
        }
        
        # 发送请求
        endpoint = f'{self.base_url}/v4/extract/batch/upload'
        print(f"申请{len(file_names)}个文件的上传链接...")
        
        response = requests.post(endpoint, headers=self.headers, json=data)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('code') == 0:
                print("成功获取上传链接")
                return result['data']
            else:
                print(f"获取上传链接失败: {result.get('msg')}")
                return None
        else:
            print(f"API请求失败: {response.status_code}")
            print(f"响应: {response.text}")
            return None
    
    def upload_file(self, file_path: str, upload_url: str) -> bool:
        """
        上传单个文件到指定URL
        
        Args:
            file_path: 本地文件路径
            upload_url: 上传链接
            
        Returns:
            是否上传成功
        """
        if not os.path.exists(file_path):
            print(f"文件不存在: {file_path}")
            return False
        
        try:
            # 读取文件内容
            with open(file_path, 'rb') as f:
                file_content = f.read()
            
            # 上传文件（注意：不设置Content-Type）
            response = requests.put(upload_url, data=file_content)
            
            if response.status_code in [200, 201]:
                print(f"文件上传成功: {os.path.basename(file_path)}")
                return True
            else:
                print(f"文件上传失败: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"上传文件时出错: {e}")
            return False
    
    def batch_upload_and_parse(self, file_paths: List[str]) -> Dict[str, str]:
        """
        批量上传文件并自动解析
        
        Args:
            file_paths: 本地文件路径列表
            
        Returns:
            文件路径到任务ID的映射
        """
        # 1. 申请上传链接
        upload_data = self.request_upload_links([os.path.basename(fp) for fp in file_paths])
        if not upload_data:
            return {}
        
        upload_links = upload_data.get('upload_links', [])
        task_mapping = {}
        
        # 2. 上传文件
        print(f"\n开始上传{len(file_paths)}个文件...")
        for i, file_path in enumerate(file_paths):
            if i < len(upload_links):
                link_info = upload_links[i]
                upload_url = link_info.get('upload_url')
                task_id = link_info.get('task_id')
                
                if upload_url and task_id:
                    # 上传文件
                    success = self.upload_file(file_path, upload_url)
                    if success:
                        task_mapping[file_path] = task_id
                        print(f"文件 {os.path.basename(file_path)} 对应任务ID: {task_id}")
        
        print(f"\n成功上传{len(task_mapping)}个文件")
        print("系统将自动扫描已上传文件并提交解析任务")
        
        return task_mapping
    
    def get_task_status(self, task_id: str) -> Dict:
        """查询任务状态"""
        endpoint = f'{self.base_url}/v4/extract/task/{task_id}'
        response = requests.get(endpoint, headers={'Authorization': f'Bearer {self.api_token}'})
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def wait_for_results(self, task_mapping: Dict[str, str], timeout: int = 300) -> Dict[str, Dict]:
        """
        等待所有任务完成
        
        Args:
            task_mapping: 文件路径到任务ID的映射
            timeout: 超时时间（秒）
            
        Returns:
            文件路径到解析结果的映射
        """
        results = {}
        start_time = time.time()
        
        print(f"\n等待{len(task_mapping)}个任务完成...")
        
        while len(results) < len(task_mapping) and (time.time() - start_time) < timeout:
            for file_path, task_id in task_mapping.items():
                if file_path not in results:
                    status = self.get_task_status(task_id)
                    if status and status.get('code') == 0:
                        data = status.get('data', {})
                        state = data.get('state', '').lower()
                        
                        if state == 'done':
                            results[file_path] = data
                            print(f"✓ 完成: {os.path.basename(file_path)}")
                        elif state in ['failed', 'error']:
                            results[file_path] = {'error': data.get('err_msg', 'Unknown error')}
                            print(f"✗ 失败: {os.path.basename(file_path)}")
            
            if len(results) < len(task_mapping):
                time.sleep(3)  # 每3秒检查一次
        
        print(f"\n解析完成: {len(results)}/{len(task_mapping)}")
        return results


def parse_local_invoices(pdf_paths: List[str]):
    """
    解析本地发票文件
    
    Args:
        pdf_paths: PDF文件路径列表
    """
    uploader = MineruBatchUploader()
    
    # 批量上传并解析
    task_mapping = uploader.batch_upload_and_parse(pdf_paths)
    
    if not task_mapping:
        print("没有文件成功上传")
        return
    
    # 等待解析完成
    results = uploader.wait_for_results(task_mapping)
    
    # 处理结果
    for file_path, result in results.items():
        print(f"\n{'='*50}")
        print(f"文件: {os.path.basename(file_path)}")
        print(f"{'='*50}")
        
        if 'error' in result:
            print(f"解析失败: {result['error']}")
        else:
            # 下载并解析结果
            zip_url = result.get('full_zip_url')
            if zip_url:
                print(f"结果下载链接: {zip_url}")
                # 这里可以调用之前的download_and_extract_results函数
                # 或者保存结果供后续处理


# 使用示例
if __name__ == "__main__":
    # 准备要解析的PDF文件列表
    pdf_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf",
        # 可以添加更多文件...
    ]
    
    # 批量解析
    parse_local_invoices(pdf_files)