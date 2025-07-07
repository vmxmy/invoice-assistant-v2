#!/usr/bin/env python3
"""
使用API处理downloads目录下所有子目录的发票 - 使用requests库
"""
import os
import json
import time
from pathlib import Path
import requests
from datetime import datetime

# API配置
API_BASE_URL = "http://localhost:8090"
TOKEN_FILE = ".supabase_token"

# 读取令牌
def get_token():
    if not os.path.exists(TOKEN_FILE):
        print(f"❌ 令牌文件不存在: {TOKEN_FILE}")
        print("请先运行 get_token_local.py 获取令牌")
        return None
    
    with open(TOKEN_FILE, "r") as f:
        return f.read().strip()

# 收集所有PDF文件
def collect_pdf_files(base_dir="downloads"):
    pdf_files = []
    
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.lower().endswith('.pdf'):
                full_path = os.path.join(root, file)
                pdf_files.append(full_path)
    
    return pdf_files

# 上传单个发票
def upload_invoice(file_path, headers):
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            
            response = requests.post(
                f"{API_BASE_URL}/api/v1/files/upload-invoice",
                headers=headers,
                files=files,
                timeout=30
            )
            
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, f"HTTP {response.status_code}: {response.text}"
                
    except Exception as e:
        return False, str(e)

# 获取发票详情
def get_invoice_details(invoice_id, headers):
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/v1/invoices/{invoice_id}",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            return None
            
    except Exception:
        return None

def main():
    print("="*60)
    print("批量处理downloads目录下的发票")
    print("="*60)
    
    # 获取令牌
    token = get_token()
    if not token:
        return
    
    print(f"✓ 令牌已加载")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 收集PDF文件
    pdf_files = collect_pdf_files()
    print(f"\n找到 {len(pdf_files)} 个PDF文件")
    
    if not pdf_files:
        print("未找到任何PDF文件")
        return
    
    # 创建结果目录
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_file = f"downloads_api_processing_{timestamp}.json"
    
    # 处理统计
    results = {
        "total_files": len(pdf_files),
        "processed": 0,
        "success": 0,
        "failed": 0,
        "start_time": datetime.now().isoformat(),
        "files": []
    }
    
    print(f"\n开始处理...")
    
    for idx, file_path in enumerate(pdf_files, 1):
        print(f"\n[{idx}/{len(pdf_files)}] 处理: {file_path}")
        
        # 文件信息
        file_info = {
            "file_path": file_path,
            "file_name": os.path.basename(file_path),
            "file_size": os.path.getsize(file_path),
            "directory": os.path.dirname(file_path)
        }
        
        # 上传发票
        start_time = time.time()
        success, result = upload_invoice(file_path, headers)
        process_time = time.time() - start_time
        
        if success:
            print(f"  ✓ 上传成功 (耗时: {process_time:.2f}秒)")
            invoice_id = result.get("invoice_id")
            
            # 获取发票详情
            if invoice_id:
                invoice_details = get_invoice_details(invoice_id, headers)
                if invoice_details:
                    file_info["invoice_id"] = invoice_id
                    file_info["invoice_number"] = invoice_details.get("invoice_number")
                    file_info["invoice_date"] = invoice_details.get("invoice_date")
                    file_info["seller_name"] = invoice_details.get("seller_name")
                    file_info["buyer_name"] = invoice_details.get("buyer_name")
                    file_info["total_amount"] = invoice_details.get("total_amount")
                    file_info["project_name"] = invoice_details.get("extracted_data", {}).get("project_name")
                    
                    print(f"  发票号: {file_info['invoice_number']}")
                    print(f"  销售方: {file_info['seller_name']}")
                    print(f"  金额: {file_info['total_amount']}")
            
            file_info["status"] = "success"
            file_info["process_time"] = process_time
            results["success"] += 1
        else:
            print(f"  ✗ 上传失败: {result}")
            file_info["status"] = "failed"
            file_info["error"] = result
            file_info["process_time"] = process_time
            results["failed"] += 1
        
        results["processed"] += 1
        results["files"].append(file_info)
        
        # 保存中间结果
        if idx % 10 == 0 or idx == len(pdf_files):
            with open(result_file, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            print(f"\n中间结果已保存到: {result_file}")
    
    # 完成处理
    results["end_time"] = datetime.now().isoformat()
    
    # 保存最终结果
    with open(result_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    # 生成摘要报告
    summary_file = f"downloads_api_summary_{timestamp}.txt"
    with open(summary_file, "w", encoding="utf-8") as f:
        f.write("="*60 + "\n")
        f.write("下载目录发票处理摘要\n")
        f.write("="*60 + "\n\n")
        f.write(f"处理时间: {results['start_time']} - {results['end_time']}\n")
        f.write(f"总文件数: {results['total_files']}\n")
        f.write(f"处理成功: {results['success']}\n")
        f.write(f"处理失败: {results['failed']}\n")
        if results['total_files'] > 0:
            f.write(f"成功率: {results['success']/results['total_files']*100:.1f}%\n\n")
        
        # 按目录统计
        dir_stats = {}
        for file_info in results["files"]:
            dir_name = file_info["directory"]
            if dir_name not in dir_stats:
                dir_stats[dir_name] = {"total": 0, "success": 0, "failed": 0}
            
            dir_stats[dir_name]["total"] += 1
            if file_info["status"] == "success":
                dir_stats[dir_name]["success"] += 1
            else:
                dir_stats[dir_name]["failed"] += 1
        
        f.write("按目录统计:\n")
        f.write("-"*60 + "\n")
        for dir_name, stats in sorted(dir_stats.items()):
            f.write(f"{dir_name}:\n")
            f.write(f"  总数: {stats['total']}, 成功: {stats['success']}, 失败: {stats['failed']}\n")
        
        # 失败文件列表
        if results["failed"] > 0:
            f.write("\n失败文件列表:\n")
            f.write("-"*60 + "\n")
            for file_info in results["files"]:
                if file_info["status"] == "failed":
                    f.write(f"{file_info['file_path']}\n")
                    f.write(f"  错误: {file_info.get('error', 'Unknown')}\n")
    
    # 打印最终统计
    print("\n" + "="*60)
    print("处理完成!")
    print(f"总文件数: {results['total_files']}")
    print(f"处理成功: {results['success']}")
    print(f"处理失败: {results['failed']}")
    if results['total_files'] > 0:
        print(f"成功率: {results['success']/results['total_files']*100:.1f}%")
    print(f"\n详细结果已保存到: {result_file}")
    print(f"摘要报告已保存到: {summary_file}")

if __name__ == "__main__":
    main()