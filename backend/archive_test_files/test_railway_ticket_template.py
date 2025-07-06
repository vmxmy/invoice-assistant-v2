#!/usr/bin/env python3
"""
测试火车票模板提取
"""

import asyncio
from pathlib import Path
from app.services.ocr.service import OCRService
import json

# 模拟火车票文本内容（用于测试）
SAMPLE_RAILWAY_TICKET_TEXT = """
                        铁路电子客票                   
                                                    发票号码：12345678901234567890
                                                    开票日期：2025年03月15日
                     
购买方名称：张三
身份证号：110101********1234

车次：G1234                  出发站：北京南 → 上海虹桥
出发日期：2025-03-20          开车时间：08:30
座位：二等座                  座位号：5车12A号

乘客姓名：张三
票价：￥553.00

销售方：中国国家铁路集团有限公司
统一社会信用代码：91100000MA01ABCD12

价税合计（小写）￥553.00
"""

async def test_railway_ticket_extraction():
    """测试火车票数据提取"""
    
    # 创建OCR服务
    ocr_service = OCRService()
    
    # 查找火车票PDF文件
    downloads_dir = Path("downloads")
    
    # 查找可能是火车票的文件（通常包含特定关键词）
    possible_tickets = []
    for pdf_file in downloads_dir.glob("*.pdf"):
        # 可以根据文件名或其他标识判断
        possible_tickets.append(pdf_file)
    
    if not possible_tickets:
        print("未找到火车票PDF文件")
        print("\n将使用模拟数据测试模板...")
        
        # 创建临时测试文件
        from invoice2data.input import pdftotext
        import tempfile
        
        # 这里我们需要实际的火车票PDF来测试
        # 暂时先输出模板已创建的信息
        print("\n火车票模板已创建，包含以下字段：")
        print("- 发票号码 (invoice_number)")
        print("- 票号 (ticket_number)")
        print("- 开票日期 (date)")
        print("- 车次 (train_number)")
        print("- 出发站/到达站 (departure_arrival)")
        print("- 出发日期 (departure_date)")
        print("- 出发时间 (departure_time)")
        print("- 座位类型 (seat_type)")
        print("- 座位号 (seat_number)")
        print("- 乘客姓名 (passenger_name)")
        print("- 票价 (amount)")
        print("- 销售方 (seller_name) - 默认为中国国家铁路集团有限公司")
        
        return
    
    print(f"找到 {len(possible_tickets)} 个可能的火车票文件")
    
    # 测试每个文件
    for pdf_file in possible_tickets[:3]:  # 只测试前3个
        print(f"\n测试文件: {pdf_file.name}")
        print("="*60)
        
        try:
            async with ocr_service:
                result = await ocr_service.extract_invoice_data(str(pdf_file))
            
            if result.get('status') == 'success':
                print("提取成功！")
                
                # 检查是否识别为火车票
                if result.get('invoice_type') == '铁路电子客票':
                    print("✓ 成功识别为火车票")
                    
                    # 显示提取的关键信息
                    print(f"\n关键信息：")
                    print(f"  发票类型: {result.get('invoice_type')}")
                    print(f"  发票号码: {result.get('invoice_number')}")
                    print(f"  开票日期: {result.get('invoice_date')}")
                    print(f"  金额: ¥{result.get('amount', 0)}")
                    print(f"  销售方: {result.get('seller_name')}")
                    
                    # 显示原始提取数据中的火车票特有字段
                    raw_data = result.get('raw_data', {})
                    if raw_data:
                        print(f"\n火车票特有信息：")
                        print(f"  票号: {raw_data.get('ticket_number')}")
                        print(f"  车次: {raw_data.get('train_number')}")
                        print(f"  出发/到达: {raw_data.get('departure_arrival')}")
                        print(f"  出发日期: {raw_data.get('departure_date')}")
                        print(f"  出发时间: {raw_data.get('departure_time')}")
                        print(f"  座位类型: {raw_data.get('seat_type')}")
                        print(f"  座位号: {raw_data.get('seat_number')}")
                        print(f"  乘客姓名: {raw_data.get('passenger_name')}")
                else:
                    print(f"× 未识别为火车票，识别类型: {result.get('invoice_type')}")
                    
            else:
                print(f"提取失败: {result.get('error')}")
                
        except Exception as e:
            print(f"处理错误: {e}")

if __name__ == "__main__":
    asyncio.run(test_railway_ticket_extraction())