#!/usr/bin/env python3
"""
快速生成发票汇总报告（从数据库读取）
"""

import csv
from datetime import datetime
from supabase import create_client


def main():
    print("🚀 === 快速发票汇总报告 ===\n")
    
    # 连接数据库
    supabase = create_client(
        'https://sfenhhtvcyslxplvewmt.supabase.co', 
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'
    )
    
    # 认证
    auth_response = supabase.auth.sign_in_with_password({
        'email': 'blueyang@gmail.com',
        'password': 'Xumy8!75'
    })
    
    print("✅ 数据库连接成功\n")
    
    # 查询所有已处理的发票
    # 执行查询
    response = supabase.table('invoices') \
        .select('invoice_number,invoice_date,seller_name,buyer_name,total_amount,extracted_data,file_path') \
        .eq('processing_status', 'OCR_COMPLETED') \
        .order('created_at', desc=True) \
        .limit(100) \
        .execute()
    
    invoices = response.data
    print(f"📊 找到 {len(invoices)} 张已处理的发票\n")
    
    # 生成CSV文件
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    csv_file = f'invoice_summary_quick_{timestamp}.csv'
    
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['发票号码', '发票日期', '销售方', '采购方', '合计金额', '项目内容', '文件路径'])
        
        for invoice in invoices:
            # 提取项目名称
            project_name = 'N/A'
            extracted_data = invoice.get('extracted_data', {})
            if extracted_data:
                project_name = extracted_data.get('project_name', 'N/A')
                
                # 如果没有项目名称，根据销售方推断
                if project_name == 'N/A' or project_name is None:
                    seller = invoice.get('seller_name', '')
                    if '铁路' in seller:
                        project_name = '铁路旅客运输服务'
                    elif '餐饮' in seller or '酒店' in seller:
                        project_name = '餐饮服务'
                    elif '科技' in seller:
                        project_name = '技术服务'
            
            writer.writerow([
                invoice.get('invoice_number', 'N/A'),
                invoice.get('invoice_date', 'N/A'),
                invoice.get('seller_name', 'N/A'),
                invoice.get('buyer_name', 'N/A'),
                invoice.get('total_amount', 'N/A'),
                project_name,
                invoice.get('file_path', 'N/A')
            ])
            
            # 打印前10条记录
            if invoices.index(invoice) < 10:
                print(f"📄 发票号码: {invoice.get('invoice_number', 'N/A')}")
                print(f"   📅 日期: {invoice.get('invoice_date', 'N/A')}")
                print(f"   🏢 销售方: {invoice.get('seller_name', 'N/A')}")
                print(f"   🏬 采购方: {invoice.get('buyer_name', 'N/A')}")
                print(f"   💰 金额: ¥{invoice.get('total_amount', 'N/A')}")
                print(f"   📦 项目: {project_name}")
                print("-" * 60)
    
    print(f"\n✅ 汇总报告已保存到: {csv_file}")
    
    # 统计信息
    # 按销售方统计
    sellers = {}
    total_amount = 0
    
    for invoice in invoices:
        seller = invoice.get('seller_name', 'Unknown')
        if seller in sellers:
            sellers[seller] += 1
        else:
            sellers[seller] = 1
        
        try:
            amount = float(invoice.get('total_amount', 0))
            total_amount += amount
        except:
            pass
    
    print("\n📈 === 销售方统计（前5名）===")
    for seller, count in sorted(sellers.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"   {seller}: {count} 张")
    
    print(f"\n💰 === 总金额 ===")
    print(f"   合计: ¥{total_amount:,.2f}")
    if len(invoices) > 0:
        print(f"   平均: ¥{total_amount/len(invoices):,.2f}")
    
    print(f"\n🎯 汇总完成！")


if __name__ == '__main__':
    main()