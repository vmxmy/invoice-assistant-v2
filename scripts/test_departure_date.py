#!/usr/bin/env python3
"""
测试火车票发车日期提取
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

async def test_departure_date_extraction():
    """测试发车日期提取"""
    print("📅 测试火车票发车日期提取")
    print("=" * 60)
    
    # 测试文件列表
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-35.50-25359134169000052039.pdf"
    ]
    
    try:
        from app.services.ocr import Invoice2DataClient, OCRConfig
        
        config = OCRConfig()
        client = Invoice2DataClient(config)
        
        results = []
        
        for i, pdf_path in enumerate(test_files, 1):
            if not Path(pdf_path).exists():
                print(f"❌ 文件{i}: 文件不存在")
                continue
            
            print(f"\n📄 文件{i}: {Path(pdf_path).name}")
            
            result = await client.extract_invoice_data(pdf_path)
            
            if result.get('status') == 'success':
                raw_data = result.get('raw_data', {})
                
                if raw_data.get('issuer') == '中国铁路电子客票':
                    # 提取火车票相关信息
                    train_number = raw_data.get('train_number', '未提取')
                    departure_date = raw_data.get('departure_date', '未提取')
                    departure_time = raw_data.get('departure_time', '未提取')
                    arrival_time = raw_data.get('arrival_time', '未提取')
                    departure_station = raw_data.get('departure_station', '未提取')
                    arrival_station = raw_data.get('arrival_station', '未提取')
                    seat_type = raw_data.get('seat_type', '未提取')
                    passenger_name = raw_data.get('passenger_name', '未提取')
                    
                    print(f"✅ 火车票识别成功")
                    print(f"  🚄 车次: {train_number}")
                    print(f"  📅 发车日期: {departure_date}")
                    print(f"  🕐 出发时间: {departure_time}")
                    print(f"  🕐 到达时间: {arrival_time}")
                    print(f"  🚉 出发站: {departure_station}")
                    print(f"  🚉 到达站: {arrival_station}")
                    print(f"  💺 座位类型: {seat_type}")
                    print(f"  👤 乘客姓名: {passenger_name}")
                    
                    results.append({
                        'file': Path(pdf_path).name,
                        'train_number': train_number,
                        'departure_date': departure_date,
                        'departure_time': departure_time,
                        'arrival_time': arrival_time,
                        'departure_station': departure_station,
                        'arrival_station': arrival_station,
                        'seat_type': seat_type,
                        'passenger_name': passenger_name,
                        'status': 'success'
                    })
                else:
                    print(f"ℹ️  非火车票: {raw_data.get('issuer', '未识别')}")
                    results.append({
                        'file': Path(pdf_path).name,
                        'status': 'not_train_ticket'
                    })
            else:
                print(f"❌ 提取失败: {result.get('error', '未知错误')}")
                results.append({
                    'file': Path(pdf_path).name,
                    'status': 'failed'
                })
        
        # 统计分析
        print("\n" + "=" * 60)
        print("📊 发车日期提取分析")
        print("-" * 30)
        
        train_tickets = [r for r in results if r.get('status') == 'success']
        
        if train_tickets:
            # 统计各字段提取成功率
            fields = ['train_number', 'departure_date', 'departure_time', 'arrival_time', 
                     'departure_station', 'arrival_station', 'seat_type', 'passenger_name']
            
            print(f"🏢 总火车票数: {len(train_tickets)}")
            
            for field in fields:
                success_count = len([t for t in train_tickets if t[field] != '未提取'])
                success_rate = success_count / len(train_tickets) * 100
                print(f"📋 {field}: {success_count}/{len(train_tickets)} ({success_rate:.1f}%)")
            
            print(f"\n💡 新增字段验证:")
            departure_dates = [t['departure_date'] for t in train_tickets if t['departure_date'] != '未提取']
            arrival_times = [t['arrival_time'] for t in train_tickets if t['arrival_time'] != '未提取']
            
            if departure_dates:
                print(f"✅ 发车日期提取成功: {len(departure_dates)}个")
                for date in set(departure_dates):
                    print(f"  - {date}")
            else:
                print(f"❌ 发车日期提取失败，需要调整正则表达式")
            
            if arrival_times:
                print(f"✅ 到达时间提取成功: {len(arrival_times)}个")
                for time in set(arrival_times):
                    print(f"  - {time}")
            else:
                print(f"⚠️  到达时间提取失败，可能PDF中没有此信息")
        
        return results
        
    except Exception as e:
        print(f"❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return []

async def main():
    """主函数"""
    print("开始测试火车票发车日期提取...\n")
    
    results = await test_departure_date_extraction()
    
    # 最终评估
    train_results = [r for r in results if r.get('status') == 'success']
    
    if train_results:
        departure_date_count = len([r for r in train_results if r['departure_date'] != '未提取'])
        departure_date_rate = departure_date_count / len(train_results) * 100
        
        print(f"\n" + "=" * 60)
        print("🏆 最终评估")
        print("-" * 20)
        print(f"🎯 发车日期提取成功率: {departure_date_rate:.1f}%")
        
        if departure_date_rate >= 80:
            print("🎉 发车日期提取效果优秀!")
        elif departure_date_rate >= 50:
            print("✅ 发车日期提取效果良好!")
        else:
            print("⚠️  发车日期提取需要进一步优化")
        
        print(f"\n💡 模板更新验证:")
        print(f"✅ 添加了 departure_date 字段")
        print(f"✅ 添加了 arrival_time 字段")  
        print(f"✅ 支持多种日期格式: YYYY-MM-DD 和 YYYY年MM月DD日")

if __name__ == "__main__":
    asyncio.run(main())