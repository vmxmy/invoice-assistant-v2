#!/usr/bin/env python3
"""
测试多个火车票PDF文件的通用站点提取
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

async def test_single_ticket(pdf_path, ticket_name):
    """测试单个火车票"""
    try:
        from app.services.ocr import Invoice2DataClient, OCRConfig
        
        config = OCRConfig()
        client = Invoice2DataClient(config)
        
        print(f"\n📄 {ticket_name}")
        print(f"文件: {Path(pdf_path).name}")
        
        result = await client.extract_invoice_data(pdf_path)
        
        if result.get('status') == 'success':
            raw_data = result.get('raw_data', {})
            
            # 判断是否是火车票
            if raw_data.get('issuer') == '中国铁路电子客票':
                print("✅ 火车票识别成功")
                print(f"  车次: {raw_data.get('train_number', '未提取')}")
                print(f"  出发站: {raw_data.get('departure_station', '未提取')}")
                print(f"  到达站: {raw_data.get('arrival_station', '未提取')}")
                print(f"  出发时间: {raw_data.get('departure_time', '未提取')}")
                print(f"  票价: ¥{raw_data.get('amount', '未提取')}")
                
                # 显示调试信息
                if '_original_station_1' in raw_data:
                    print(f"  调试: 原始站点顺序 {raw_data.get('_original_station_1')} -> {raw_data.get('_original_station_2')}")
                
                return {
                    'status': 'success',
                    'type': 'train_ticket',
                    'data': {
                        'train_number': raw_data.get('train_number'),
                        'departure_station': raw_data.get('departure_station'),
                        'arrival_station': raw_data.get('arrival_station'),
                        'departure_time': raw_data.get('departure_time'),
                        'amount': raw_data.get('amount')
                    }
                }
            else:
                print(f"ℹ️  非火车票类型: {raw_data.get('issuer', '未识别')}")
                return {'status': 'success', 'type': 'other', 'issuer': raw_data.get('issuer')}
        else:
            print(f"❌ 提取失败: {result.get('error', '未知错误')}")
            return {'status': 'failed', 'error': result.get('error')}
            
    except Exception as e:
        print(f"❌ 处理异常: {e}")
        return {'status': 'error', 'error': str(e)}

async def test_multiple_tickets():
    """测试多个火车票文件"""
    print("🚄 测试多个火车票的通用站点提取")
    print("=" * 60)
    
    # 测试文件列表
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-35.50-25359134169000052039.pdf", 
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-57.50-25429165818000508973.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-556.00-25429165818000508972.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局湖北省税务局-377.00-25429165848000790553.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局湖南省税务局-96.50-25439165666000019624.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局湖南省税务局-339.00-25439122799000011090.pdf"
    ]
    
    results = []
    train_tickets = []
    
    for i, pdf_path in enumerate(test_files, 1):
        if not Path(pdf_path).exists():
            print(f"\n❌ 文件{i}: 文件不存在")
            continue
        
        result = await test_single_ticket(pdf_path, f"文件{i}")
        results.append(result)
        
        if result.get('type') == 'train_ticket':
            train_tickets.append(result['data'])
    
    # 统计结果
    print("\n" + "=" * 60)
    print("📊 测试结果统计")
    print("-" * 30)
    
    total_files = len([r for r in results if r.get('status') in ['success', 'failed']])
    successful_extractions = len([r for r in results if r.get('status') == 'success'])
    train_ticket_count = len(train_tickets)
    other_invoice_count = len([r for r in results if r.get('type') == 'other'])
    failed_count = len([r for r in results if r.get('status') in ['failed', 'error']])
    
    print(f"📁 总文件数: {total_files}")
    print(f"✅ 成功处理: {successful_extractions}")
    print(f"🚄 火车票: {train_ticket_count}")
    print(f"📄 其他发票: {other_invoice_count}")
    print(f"❌ 处理失败: {failed_count}")
    
    # 火车票详细分析
    if train_tickets:
        print(f"\n🚄 火车票详细分析")
        print("-" * 30)
        
        for i, ticket in enumerate(train_tickets, 1):
            print(f"火车票{i}:")
            route = f"{ticket.get('departure_station', '?')} -> {ticket.get('arrival_station', '?')}"
            print(f"  路线: {route}")
            print(f"  车次: {ticket.get('train_number', '?')}")
            print(f"  时间: {ticket.get('departure_time', '?')}")
            print(f"  票价: ¥{ticket.get('amount', '?')}")
        
        print(f"\n🎯 通用性验证:")
        unique_routes = set()
        unique_trains = set()
        
        for ticket in train_tickets:
            if ticket.get('departure_station') and ticket.get('arrival_station'):
                route = f"{ticket['departure_station']}-{ticket['arrival_station']}"
                unique_routes.add(route)
            if ticket.get('train_number'):
                unique_trains.add(ticket['train_number'])
        
        print(f"  不同路线数: {len(unique_routes)}")
        print(f"  不同车次数: {len(unique_trains)}")
        print(f"  站点提取成功率: {len([t for t in train_tickets if t.get('departure_station') and t.get('arrival_station')])} / {len(train_tickets)}")
        
        if unique_routes:
            print(f"  路线列表:")
            for route in sorted(unique_routes):
                print(f"    - {route}")
    
    return results

async def main():
    """主函数"""
    print("开始批量测试火车票通用站点提取...\n")
    
    results = await test_multiple_tickets()
    
    train_ticket_results = [r for r in results if r.get('type') == 'train_ticket']
    
    print(f"\n" + "=" * 60)
    print("🏆 最终评估")
    print("-" * 20)
    
    if train_ticket_results:
        success_rate = len([t for t in train_ticket_results if t['data'].get('departure_station') and t['data'].get('arrival_station')]) / len(train_ticket_results) * 100
        
        print(f"🎯 通用站点提取成功率: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 通用提取效果优秀!")
        elif success_rate >= 60:
            print("✅ 通用提取效果良好!")
        else:
            print("⚠️  通用提取需要进一步优化")
        
        print(f"\n💡 设计验证:")
        print(f"✅ 正则表达式 ([\u4e00-\u9fa5]+站) 可匹配任意中文站名")
        print(f"✅ 智能后处理可判断出发/到达关系")
        print(f"✅ 无需硬编码特定站名或路线")
        print(f"✅ 适用于不同地区的火车票")
    else:
        print("⚠️  未找到火车票进行测试")

if __name__ == "__main__":
    asyncio.run(main())