#!/usr/bin/env python3
"""
批量处理发票文件并获取解析结果
"""
import os
import glob
import requests
import json
import time
import hashlib
from datetime import datetime
from typing import List, Dict
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# API配置
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
MINERU_API_BASE_URL = 'https://mineru.net/api'

class InvoiceBatchProcessor:
    def __init__(self):
        self.api_token = MINERU_API_TOKEN
        self.base_url = MINERU_API_BASE_URL
        self.headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json'
        }
        self.results = {}
        
    def get_pdf_files(self, directory: str) -> List[str]:
        """获取目录下所有PDF文件"""
        pdf_pattern = os.path.join(directory, "*.pdf")
        pdf_files = glob.glob(pdf_pattern)
        print(f"找到 {len(pdf_files)} 个PDF文件")
        return sorted(pdf_files)
    
    def batch_upload_files(self, pdf_files: List[str]) -> Dict[str, str]:
        """批量上传文件并返回文件路径到批次信息的映射"""
        # MineRu API限制单次最多200个文件
        batch_size = 200
        all_mappings = {}
        
        for i in range(0, len(pdf_files), batch_size):
            batch_files = pdf_files[i:i + batch_size]
            print(f"\n处理第 {i//batch_size + 1} 批文件（{len(batch_files)} 个）")
            
            # 准备文件数据
            files_data = []
            file_mapping = {}  # filename -> filepath
            
            for pdf_path in batch_files:
                filename = os.path.basename(pdf_path)
                data_id = hashlib.md5(pdf_path.encode()).hexdigest()[:16]
                files_data.append({
                    "name": filename,
                    "is_ocr": True,
                    "data_id": data_id
                })
                file_mapping[filename] = pdf_path
            
            # 申请上传链接
            data = {
                "enable_formula": False,
                "enable_table": True,
                "files": files_data
            }
            
            url = f'{self.base_url}/v4/file-urls/batch'
            response = requests.post(url, headers=self.headers, json=data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('code') == 0:
                    batch_id = result['data']['batch_id']
                    file_urls = result['data']['file_urls']
                    
                    print(f"批次ID: {batch_id}")
                    print(f"获得 {len(file_urls)} 个上传链接")
                    
                    # 上传文件
                    for idx, (pdf_path, upload_url) in enumerate(zip(batch_files, file_urls)):
                        print(f"上传 {idx+1}/{len(file_urls)}: {os.path.basename(pdf_path)}")
                        try:
                            with open(pdf_path, 'rb') as f:
                                upload_response = requests.put(upload_url, data=f)
                            
                            if upload_response.status_code == 200:
                                all_mappings[pdf_path] = {
                                    'batch_id': batch_id,
                                    'filename': os.path.basename(pdf_path),
                                    'upload_time': datetime.now().isoformat()
                                }
                            else:
                                print(f"  上传失败: {upload_response.status_code}")
                        except Exception as e:
                            print(f"  上传出错: {e}")
                else:
                    print(f"申请上传链接失败: {result.get('msg')}")
            else:
                print(f"API请求失败: {response.status_code}")
        
        return all_mappings
    
    def wait_and_get_results(self, file_mappings: Dict[str, dict], timeout: int = 600):
        """等待并获取所有文件的解析结果"""
        print(f"\n等待解析完成（最多 {timeout} 秒）...")
        start_time = time.time()
        
        # 按批次分组
        batch_groups = {}
        for file_path, info in file_mappings.items():
            batch_id = info['batch_id']
            if batch_id not in batch_groups:
                batch_groups[batch_id] = []
            batch_groups[batch_id].append(file_path)
        
        print(f"共有 {len(batch_groups)} 个批次需要查询")
        
        # 轮询查询结果
        completed_files = set()
        results = {}
        
        while len(completed_files) < len(file_mappings) and (time.time() - start_time) < timeout:
            for batch_id, file_paths in batch_groups.items():
                if all(fp in completed_files for fp in file_paths):
                    continue  # 该批次已完成
                
                # 尝试查询批次中每个文件的状态
                for file_path in file_paths:
                    if file_path in completed_files:
                        continue
                    
                    # 根据文件名生成可能的task_id
                    filename = os.path.basename(file_path)
                    data_id = hashlib.md5(file_path.encode()).hexdigest()[:16]
                    
                    # 尝试不同的查询方式
                    task_ids_to_try = [
                        batch_id,  # 批次ID
                        data_id,   # data_id
                        hashlib.md5(filename.encode()).hexdigest()  # 文件名hash
                    ]
                    
                    for task_id in task_ids_to_try:
                        endpoint = f'{self.base_url}/v4/extract/task/{task_id}'
                        try:
                            response = requests.get(
                                endpoint, 
                                headers={'Authorization': f'Bearer {self.api_token}'},
                                timeout=10
                            )
                            
                            if response.status_code == 200:
                                result = response.json()
                                if result.get('code') == 0:
                                    data = result.get('data', {})
                                    state = data.get('state', '').lower()
                                    
                                    if state == 'done':
                                        print(f"✓ 完成: {filename}")
                                        results[file_path] = data
                                        completed_files.add(file_path)
                                        break
                                    elif state in ['failed', 'error']:
                                        print(f"✗ 失败: {filename} - {data.get('err_msg')}")
                                        results[file_path] = {'error': data.get('err_msg')}
                                        completed_files.add(file_path)
                                        break
                                    elif state in ['processing', 'pending']:
                                        # 还在处理中
                                        break
                        except Exception as e:
                            # 查询失败，尝试下一个ID
                            continue
            
            # 显示进度
            print(f"\r进度: {len(completed_files)}/{len(file_mappings)} 文件", end='', flush=True)
            
            if len(completed_files) < len(file_mappings):
                time.sleep(5)  # 等待5秒后再查询
        
        print(f"\n\n解析完成: {len(completed_files)}/{len(file_mappings)} 个文件")
        return results
    
    def download_and_save_results(self, results: Dict[str, dict]):
        """下载并保存解析结果"""
        output_dir = "/Users/xumingyang/app/invoice_assist/output_mineru/batch_results"
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\n保存结果到: {output_dir}")
        
        for file_path, result in results.items():
            filename = os.path.basename(file_path)
            base_name = os.path.splitext(filename)[0]
            
            if 'error' in result:
                # 保存错误信息
                error_file = os.path.join(output_dir, f"{base_name}_error.json")
                with open(error_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        'file': filename,
                        'error': result['error'],
                        'timestamp': datetime.now().isoformat()
                    }, f, ensure_ascii=False, indent=2)
            else:
                # 下载并保存结果
                zip_url = result.get('full_zip_url')
                if zip_url:
                    try:
                        # 下载ZIP文件
                        print(f"下载结果: {filename}")
                        response = requests.get(zip_url)
                        if response.status_code == 200:
                            zip_file = os.path.join(output_dir, f"{base_name}_result.zip")
                            with open(zip_file, 'wb') as f:
                                f.write(response.content)
                            
                            # 保存元数据
                            meta_file = os.path.join(output_dir, f"{base_name}_meta.json")
                            with open(meta_file, 'w', encoding='utf-8') as f:
                                json.dump({
                                    'file': filename,
                                    'state': result.get('state'),
                                    'zip_url': zip_url,
                                    'task_id': result.get('task_id'),
                                    'timestamp': datetime.now().isoformat()
                                }, f, ensure_ascii=False, indent=2)
                    except Exception as e:
                        print(f"  下载失败: {e}")
    
    def process_directory(self, directory: str):
        """处理指定目录下的所有PDF文件"""
        print(f"开始处理目录: {directory}")
        print("="*60)
        
        # 1. 获取PDF文件
        pdf_files = self.get_pdf_files(directory)
        if not pdf_files:
            print("没有找到PDF文件")
            return
        
        # 限制处理数量（测试时）
        pdf_files = pdf_files[:3]  # 只处理前3个文件进行测试
        
        print(f"\n将处理以下文件:")
        for i, pdf in enumerate(pdf_files, 1):
            print(f"{i}. {os.path.basename(pdf)}")
        
        # 2. 批量上传
        print(f"\n开始批量上传...")
        file_mappings = self.batch_upload_files(pdf_files)
        
        if not file_mappings:
            print("没有文件成功上传")
            return
        
        print(f"\n成功上传 {len(file_mappings)} 个文件")
        
        # 3. 等待并获取结果
        results = self.wait_and_get_results(file_mappings)
        
        # 4. 下载并保存结果
        self.download_and_save_results(results)
        
        # 5. 生成汇总报告
        self.generate_summary_report(results)
    
    def generate_summary_report(self, results: Dict[str, dict]):
        """生成汇总报告"""
        output_dir = "/Users/xumingyang/app/invoice_assist/output_mineru/batch_results"
        report_file = os.path.join(output_dir, f"batch_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        
        summary = {
            'total_files': len(results),
            'successful': sum(1 for r in results.values() if 'error' not in r),
            'failed': sum(1 for r in results.values() if 'error' in r),
            'timestamp': datetime.now().isoformat(),
            'files': []
        }
        
        for file_path, result in results.items():
            file_info = {
                'filename': os.path.basename(file_path),
                'status': 'failed' if 'error' in result else 'success',
                'error': result.get('error', None),
                'zip_url': result.get('full_zip_url', None)
            }
            summary['files'].append(file_info)
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        print(f"\n汇总报告已保存: {report_file}")
        print(f"成功: {summary['successful']} 个文件")
        print(f"失败: {summary['failed']} 个文件")


if __name__ == "__main__":
    # 创建处理器
    processor = InvoiceBatchProcessor()
    
    # 处理downloads目录
    downloads_dir = "/Users/xumingyang/app/invoice_assist/downloads"
    processor.process_directory(downloads_dir)