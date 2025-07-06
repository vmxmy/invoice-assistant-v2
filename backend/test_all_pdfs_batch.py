#!/usr/bin/env python3
"""
批量测试所有PDF文件（包含子目录），带进度保存
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
                elif '航空' in seller_name:
                    project_name = '航空服务'
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
                            'file_path': str(file_path),
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
                'file_path': str(file_path),
                'file_name': file_path.name,
                'error': f'Status: {response.status_code}'
            }
            
    except Exception as e:
        return {
            'success': False,
            'file_path': str(file_path),
            'file_name': file_path.name,
            'error': str(e)
        }


def find_all_pdfs(downloads_dir: Path):
    """递归查找所有PDF文件"""
    pdf_files = []
    for item in downloads_dir.rglob('*.pdf'):
        if item.is_file() and '_annotated' not in item.name and '.json' not in str(item):
            pdf_files.append(item)
    return sorted(pdf_files)


def load_progress():
    """加载进度文件"""
    progress_file = 'pdf_processing_progress.json'
    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            return json.load(f)
    return {'processed_files': [], 'results': []}


def save_progress(progress):
    """保存进度"""
    progress_file = 'pdf_processing_progress.json'
    with open(progress_file, 'w') as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def main():
    print("🚀 === 批量测试所有PDF文件（包含子目录）===\n")
    
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
    
    pdf_files = find_all_pdfs(downloads_dir)
    print(f"2. 找到 {len(pdf_files)} 个PDF文件\n")
    
    # 3. 加载进度
    progress = load_progress()
    processed_files = set(progress['processed_files'])
    results = progress['results']
    
    remaining_files = [f for f in pdf_files if str(f) not in processed_files]
    print(f"3. 已处理: {len(processed_files)} 个，待处理: {len(remaining_files)} 个\n")
    
    # 4. 处理文件
    api_url = 'http://127.0.0.1:8090/api/v1/files/upload-invoice'
    successful = len([r for r in results if r.get('success', False)])
    failed = len([r for r in results if not r.get('success', False)])
    
    print("4. 开始处理...")
    print("=" * 80)
    
    for i, pdf_file in enumerate(remaining_files, 1):
        print(f"\n[{i:3d}/{len(remaining_files)}] 处理: {pdf_file}")
        print(f"       路径: {pdf_file.parent}")
        
        # 处理文件
        result = process_pdf_file(pdf_file, token, api_url)
        
        if result['success']:
            successful += 1
            print(f"       ✅ 成功")
            print(f"       📋 发票号码: {result['invoice_number']}")
            print(f"       📅 发票日期: {result['invoice_date']}")
            print(f"       🏢 销售方: {result['seller_name']}")
            print(f"       🏬 采购方: {result['buyer_name']}")
            print(f"       💰 合计金额: ¥{result['total_amount']}")
            print(f"       📦 项目内容: {result['project_name']}")
        else:
            failed += 1
            print(f"       ❌ 失败: {result.get('error', 'Unknown')}")
        
        # 更新进度
        results.append(result)
        processed_files.add(str(pdf_file))
        progress['processed_files'] = list(processed_files)
        progress['results'] = results
        
        # 每处理10个文件保存一次进度
        if i % 10 == 0:
            save_progress(progress)
            print(f"\n💾 进度已保存 (已处理 {len(processed_files)}/{len(pdf_files)} 个文件)")
        
        # 避免过于频繁的请求
        time.sleep(0.5)
    
    # 最终保存进度
    save_progress(progress)
    
    print("\n" + "=" * 80)
    
    # 5. 生成汇总报告
    print(f"\n5. 生成汇总报告...")
    print(f"   ✅ 成功: {successful} 个")
    print(f"   ❌ 失败: {failed} 个")
    print(f"   📊 总计: {len(processed_files)} 个")
    
    # 保存CSV文件
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_file = f'all_invoices_summary_{timestamp}.csv'
    
    success_results = [r for r in results if r.get('success', False)]
    
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['文件路径', '文件名', '发票号码', '发票日期', '销售方', '采购方', '合计金额', '项目内容'])
        
        for result in success_results:
            writer.writerow([
                result['file_path'],
                result['file_name'],
                result['invoice_number'],
                result['invoice_date'],
                result['seller_name'],
                result['buyer_name'],
                result['total_amount'],
                result['project_name']
            ])
    
    print(f"\n📊 汇总报告已保存到: {csv_file}")
    
    # 6. 显示统计信息
    if success_results:
        # 按销售方统计
        sellers = {}
        total_sum = 0
        
        for inv in success_results:
            seller = inv['seller_name']
            if seller in sellers:
                sellers[seller] += 1
            else:
                sellers[seller] = 1
            
            try:
                amount = float(inv['total_amount'])
                total_sum += amount
            except:
                pass
        
        print("\n📈 === 销售方统计（前10名）===")
        for seller, count in sorted(sellers.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"   {seller}: {count} 张")
        
        # 按项目类型统计
        projects = {}
        for inv in success_results:
            project = inv['project_name']
            if project in projects:
                projects[project] += 1
            else:
                projects[project] = 1
        
        print("\n📦 === 项目类型统计 ===")
        for project, count in sorted(projects.items(), key=lambda x: x[1], reverse=True):
            print(f"   {project}: {count} 张")
        
        print(f"\n💰 === 总金额 ===")
        print(f"   合计: ¥{total_sum:,.2f}")
        if len(success_results) > 0:
            print(f"   平均: ¥{total_sum/len(success_results):,.2f}")
    
    print(f"\n🎯 批量处理完成！")
    
    # 询问是否清理进度文件
    print(f"\n💡 提示: 进度文件 'pdf_processing_progress.json' 已保存")
    print(f"   如需重新处理所有文件，请删除此文件")


if __name__ == '__main__':
    main()