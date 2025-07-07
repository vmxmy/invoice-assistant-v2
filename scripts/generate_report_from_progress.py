#!/usr/bin/env python3
"""
从进度文件生成发票汇总报告
"""

import json
import csv
from datetime import datetime
from pathlib import Path


def main():
    print("🚀 === 从进度文件生成发票汇总报告 ===\n")
    
    # 1. 加载进度文件
    progress_file = 'pdf_processing_progress.json'
    if not Path(progress_file).exists():
        print("❌ 进度文件不存在，请先运行 test_all_pdfs_batch.py")
        return
    
    with open(progress_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    results = data['results']
    success_results = [r for r in results if r.get('success', False)]
    failed_results = [r for r in results if not r.get('success', False)]
    
    print(f"📊 处理统计:")
    print(f"   ✅ 成功: {len(success_results)} 个")
    print(f"   ❌ 失败: {len(failed_results)} 个")
    print(f"   📊 总计: {len(results)} 个\n")
    
    # 2. 生成CSV文件
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_file = f'invoice_full_report_{timestamp}.csv'
    
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['文件路径', '文件名', '发票号码', '发票日期', '销售方', '采购方', '合计金额', '项目内容'])
        
        for result in success_results:
            writer.writerow([
                result.get('file_path', ''),
                result.get('file_name', ''),
                result.get('invoice_number', ''),
                result.get('invoice_date', ''),
                result.get('seller_name', ''),
                result.get('buyer_name', ''),
                result.get('total_amount', ''),
                result.get('project_name', '')
            ])
    
    print(f"📄 详细报告已保存到: {csv_file}\n")
    
    # 3. 失败文件列表
    if failed_results:
        failed_file = f'failed_invoices_{timestamp}.txt'
        with open(failed_file, 'w', encoding='utf-8') as f:
            f.write("失败的发票文件列表\n")
            f.write("=" * 50 + "\n\n")
            for result in failed_results:
                f.write(f"文件: {result.get('file_path', 'Unknown')}\n")
                f.write(f"错误: {result.get('error', 'Unknown error')}\n")
                f.write("-" * 30 + "\n")
        print(f"❌ 失败文件列表已保存到: {failed_file}\n")
    
    # 4. 统计分析
    if success_results:
        # 按销售方统计
        sellers = {}
        projects = {}
        buyers = {}
        total_sum = 0
        date_stats = {}
        
        for inv in success_results:
            # 销售方统计
            seller = inv.get('seller_name', 'Unknown')
            sellers[seller] = sellers.get(seller, 0) + 1
            
            # 采购方统计
            buyer = inv.get('buyer_name', 'Unknown')
            buyers[buyer] = buyers.get(buyer, 0) + 1
            
            # 项目统计
            project = inv.get('project_name', 'Unknown')
            projects[project] = projects.get(project, 0) + 1
            
            # 日期统计
            date = inv.get('invoice_date', 'Unknown')
            if date != 'Unknown' and date != 'N/A':
                month = date[:7]  # YYYY-MM
                date_stats[month] = date_stats.get(month, 0) + 1
            
            # 金额统计
            try:
                amount = float(inv.get('total_amount', 0))
                total_sum += amount
            except:
                pass
        
        print("📈 === 销售方统计 (前10名) ===")
        for seller, count in sorted(sellers.items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"   {seller}: {count} 张")
        
        print("\n🏬 === 采购方统计 ===")
        for buyer, count in sorted(buyers.items(), key=lambda x: x[1], reverse=True):
            print(f"   {buyer}: {count} 张")
        
        print("\n📦 === 项目类型统计 ===")
        for project, count in sorted(projects.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(success_results)) * 100
            print(f"   {project}: {count} 张 ({percentage:.1f}%)")
        
        print("\n📅 === 月度统计 ===")
        for month, count in sorted(date_stats.items()):
            print(f"   {month}: {count} 张")
        
        print(f"\n💰 === 金额统计 ===")
        print(f"   总金额: ¥{total_sum:,.2f}")
        if len(success_results) > 0:
            print(f"   平均金额: ¥{total_sum/len(success_results):,.2f}")
            
        # 找出金额最大的发票
        max_invoice = max(success_results, key=lambda x: float(x.get('total_amount', 0)))
        print(f"   最大金额: ¥{max_invoice.get('total_amount')} ({max_invoice.get('seller_name')} - {max_invoice.get('invoice_date')})")
        
        # 找出金额最小的发票
        min_invoice = min(success_results, key=lambda x: float(x.get('total_amount', 0)) if x.get('total_amount') != 'N/A' else float('inf'))
        print(f"   最小金额: ¥{min_invoice.get('total_amount')} ({min_invoice.get('seller_name')} - {min_invoice.get('invoice_date')})")
    
    # 5. 目录统计
    print("\n📁 === 目录分布统计 ===")
    dir_stats = {}
    for result in success_results:
        file_path = Path(result.get('file_path', ''))
        parent_dir = str(file_path.parent)
        dir_stats[parent_dir] = dir_stats.get(parent_dir, 0) + 1
    
    for dir_path, count in sorted(dir_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"   {dir_path}: {count} 个文件")
    
    print(f"\n🎯 报告生成完成！")
    print(f"\n💡 提示:")
    print(f"   1. 详细发票信息查看: {csv_file}")
    if failed_results:
        print(f"   2. 失败文件列表查看: failed_invoices_{timestamp}.txt")
    print(f"   3. 如需重新处理，删除 'pdf_processing_progress.json' 文件")


if __name__ == '__main__':
    main()