#!/usr/bin/env python3
"""
生成发票汇总报告，包含所有核心信息
"""

import os
import json
import time
import requests
from pathlib import Path
from supabase import create_client
from datetime import datetime
import csv


def get_auth_token():
    """获取认证令牌"""
    supabase = create_client(
        'https://sfenhhtvcyslxplvewmt.supabase.co', 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
    )
    
    auth_response = supabase.auth.sign_in_with_password({
        'email': 'blueyang@gmail.com',
        'password': 'Xumy8!75'
    })
    
    return auth_response.session.access_token


def get_invoice_details(invoice_id: str, token: str):
    """获取发票详细信息"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    try:
        response = requests.get(f'http://127.0.0.1:8090/api/v1/invoices/{invoice_id}', headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        return None
    except Exception:
        return None


def extract_project_name(invoice_details):
    """从发票详情中提取项目名称"""
    extracted_data = invoice_details.get('extracted_data')
    project_name = 'N/A'
    
    if extracted_data:
        if isinstance(extracted_data, str):
            try:
                import json
                extracted_data = json.loads(extracted_data)
            except:
                pass
        
        if isinstance(extracted_data, dict):
            # 直接从顶级获取项目名称
            project_name = extracted_data.get('project_name', 'N/A')
            
            # 如果没有项目名称，尝试从发票类型推断
            if project_name == 'N/A' or project_name is None:
                invoice_type = extracted_data.get('main_info', {}).get('invoice_type', '')
                seller_name = invoice_details.get('seller_name', '')
                
                if '铁路电子客票' in invoice_type:
                    project_name = '铁路旅客运输服务'
                elif '餐饮' in seller_name or '寿司' in seller_name or '萝卜' in seller_name or '烧烤' in seller_name:
                    project_name = '餐饮服务'
                elif '酒店' in seller_name or '住宿' in seller_name:
                    project_name = '住宿服务'
                elif '科技' in seller_name:
                    project_name = '技术服务'
                elif '印章' in seller_name:
                    project_name = '印章服务'
                elif '税务' in seller_name or '财税' in seller_name:
                    project_name = '财税咨询服务'
                else:
                    project_name = '一般服务'
    
    return project_name


def process_pdf_file(file_path: Path, token: str, api_url: str):
    """处理单个PDF文件并返回发票信息"""
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (file_path.name, f, 'application/pdf')}
            response = requests.post(api_url, headers=headers, files=files, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                invoice_id = data.get('invoice_id')
                
                if invoice_id:
                    # 获取发票详细信息
                    invoice_details = get_invoice_details(invoice_id, token)
                    if invoice_details:
                        project_name = extract_project_name(invoice_details)
                        
                        return {
                            'success': True,
                            'file_name': file_path.name,
                            'invoice_number': invoice_details.get('invoice_number', 'N/A'),
                            'invoice_date': invoice_details.get('invoice_date', 'N/A'),
                            'seller_name': invoice_details.get('seller_name', 'N/A'),
                            'buyer_name': invoice_details.get('buyer_name', 'N/A'),
                            'total_amount': invoice_details.get('total_amount', 'N/A'),
                            'project_name': project_name
                        }
            
            return {
                'success': False,
                'file_name': file_path.name,
                'error': f'Status: {response.status_code}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'file_name': file_path.name,
            'error': str(e)
        }


def find_all_pdfs(downloads_dir: Path, root_only=True):
    """查找PDF文件"""
    pdf_files = []
    if root_only:
        # 只查找根目录
        for item in downloads_dir.iterdir():
            if item.is_file() and item.suffix.lower() == '.pdf' and '_annotated' not in item.name:
                pdf_files.append(item)
    else:
        # 递归查找所有PDF文件
        for item in downloads_dir.rglob('*.pdf'):
            if item.is_file() and '_annotated' not in item.name:  # 排除标注文件
                pdf_files.append(item)
    return sorted(pdf_files)


def main():
    print("🚀 === 生成发票汇总报告 ===\n")
    
    # 1. 获取认证令牌
    print("1. 获取认证令牌...")
    try:
        token = get_auth_token()
        print("✅ 认证成功\n")
    except Exception as e:
        print(f"❌ 认证失败: {e}")
        return
    
    # 2. 查找所有PDF文件
    downloads_dir = Path('downloads')
    if not downloads_dir.exists():
        print("❌ downloads目录不存在")
        return
    
    pdf_files = find_all_pdfs(downloads_dir, root_only=False)  # 包含子目录
    print(f"2. 找到 {len(pdf_files)} 个PDF文件（包含子目录）\n")
    
    # 3. 处理所有文件
    api_url = 'http://127.0.0.1:8090/api/v1/files/upload-invoice'
    invoice_data = []
    successful = 0
    failed = 0
    
    print("3. 开始处理文件...")
    print("-" * 80)
    
    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"[{i:3d}/{len(pdf_files)}] 处理: {pdf_file.name[:50]}...", end="")
        
        result = process_pdf_file(pdf_file, token, api_url)
        
        if result['success']:
            successful += 1
            invoice_data.append(result)
            print(" ✅")
        else:
            failed += 1
            print(f" ❌ ({result.get('error', 'Unknown')})")
        
        # 避免过于频繁的请求
        time.sleep(0.5)
    
    print("-" * 80)
    
    # 4. 生成汇总报告
    print(f"\n4. 生成汇总报告...")
    print(f"   ✅ 成功: {successful} 个")
    print(f"   ❌ 失败: {failed} 个")
    
    # 保存CSV文件
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_file = f'invoice_summary_{timestamp}.csv'
    
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['文件名', '发票号码', '发票日期', '销售方', '采购方', '合计金额', '项目内容'])
        
        for invoice in invoice_data:
            writer.writerow([
                invoice['file_name'],
                invoice['invoice_number'],
                invoice['invoice_date'],
                invoice['seller_name'],
                invoice['buyer_name'],
                invoice['total_amount'],
                invoice['project_name']
            ])
    
    print(f"\n📊 汇总报告已保存到: {csv_file}")
    
    # 5. 显示统计信息
    if invoice_data:
        # 按销售方统计
        sellers = {}
        for inv in invoice_data:
            seller = inv['seller_name']
            if seller in sellers:
                sellers[seller] += 1
            else:
                sellers[seller] = 1
        
        print("\n📈 === 销售方统计 ===")
        for seller, count in sorted(sellers.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"   {seller}: {count} 张")
        
        # 按项目类型统计
        projects = {}
        for inv in invoice_data:
            project = inv['project_name']
            if project in projects:
                projects[project] += 1
            else:
                projects[project] = 1
        
        print("\n📦 === 项目类型统计 ===")
        for project, count in sorted(projects.items(), key=lambda x: x[1], reverse=True):
            print(f"   {project}: {count} 张")
        
        # 计算总金额
        total_sum = 0
        for inv in invoice_data:
            try:
                amount = float(inv['total_amount'])
                total_sum += amount
            except:
                pass
        
        print(f"\n💰 === 总金额 ===")
        print(f"   合计: ¥{total_sum:,.2f}")
    
    print(f"\n🎯 报告生成完成！")


if __name__ == '__main__':
    main()