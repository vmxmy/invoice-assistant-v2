#!/usr/bin/env python3
"""
测试当前站点提取的实际结果
"""

import sys
from pathlib import Path
import asyncio

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.config import OCRConfig
from app.services.ocr.invoice2data_client import Invoice2DataClient

async def test_current_extraction():
    """测试当前的站点提取结果"""
    
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-35.50-25359134169000052039.pdf"
    ]
    
    # 创建OCR服务
    config = OCRConfig()
    ocr_service = Invoice2DataClient(config)
    
    expected_results = [
        {"file": 1, "departure": "普宁站", "arrival": "广州南站", "train": "G3743"},
        {"file": 2, "departure": "厦门北站", "arrival": "普宁站", "train": "G3743"},
        {"file": 3, "departure": "泉州站", "arrival": "厦门站", "train": "D6291"}
    ]
    
    print("🚄 测试当前站点提取结果")
    print("=" * 80)
    
    for i, (pdf_path, expected) in enumerate(zip(test_files, expected_results), 1):
        if not Path(pdf_path).exists():
            print(f"❌ 文件{i}: 文件不存在")
            continue
            
        print(f"\n📄 文件{i}: {Path(pdf_path).name}")
        print(f"🚄 预期: {expected['departure']} → {expected['arrival']} ({expected['train']})")
        
        try:
            result = await ocr_service.process_single_file(pdf_path)
            raw_data = result.get('raw_data', {})
            
            # 显示原始提取的站点信息
            station_1 = raw_data.get('station_1')
            station_2 = raw_data.get('station_2')
            departure_station = raw_data.get('departure_station')
            arrival_station = raw_data.get('arrival_station')
            train_number = raw_data.get('train_number')
            
            print(f"🔍 原始提取:")
            print(f"   station_1: {station_1}")
            print(f"   station_2: {station_2}")
            print(f"📊 处理后结果:")
            print(f"   出发站: {departure_station}")
            print(f"   到达站: {arrival_station}")
            print(f"   车次: {train_number}")
            
            # 检查是否正确
            is_correct = (departure_station == expected['departure'] and 
                         arrival_station == expected['arrival'])
            
            if is_correct:
                print(f"✅ 提取正确!")
            else:
                print(f"❌ 提取错误!")
                print(f"   应该是: {expected['departure']} → {expected['arrival']}")
                
        except Exception as e:
            print(f"❌ 处理失败: {e}")
    
    print(f"\n" + "=" * 80)
    print("💡 分析:")
    print("- 如果所有文件都正确，说明逻辑已修复")
    print("- 如果部分文件错误，需要进一步调整站点判断逻辑")

if __name__ == "__main__":
    asyncio.run(test_current_extraction())