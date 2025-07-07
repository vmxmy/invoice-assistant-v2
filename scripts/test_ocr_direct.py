#!/usr/bin/env python3
"""
直接测试OCR服务，绕过API认证
"""

import sys
from pathlib import Path
import asyncio
import json
from datetime import datetime

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.config import OCRConfig
from app.services.ocr.invoice2data_client import Invoice2DataClient

async def test_ocr_direct():
    """直接测试OCR服务"""
    
    test_files = [
        {
            "file": 1,
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf",
            "expected": {"departure": "普宁站", "arrival": "广州南站", "train": "G3743"}
        },
        {
            "file": 2, 
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf",
            "expected": {"departure": "厦门北站", "arrival": "普宁站", "train": "G3743"}
        },
        {
            "file": 3,
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-35.50-25359134169000052039.pdf", 
            "expected": {"departure": "泉州站", "arrival": "厦门站", "train": "D6291"}
        }
    ]
    
    # 创建OCR服务
    config = OCRConfig()
    ocr_service = Invoice2DataClient(config)
    
    print("🚄 直接测试OCR服务处理火车票")
    print("=" * 80)
    
    # 收集所有结果
    all_results = []
    
    for test_file in test_files:
        file_path = test_file["path"]
        expected = test_file["expected"]
        
        if not Path(file_path).exists():
            print(f"❌ 文件{test_file['file']}: 文件不存在")
            continue
            
        print(f"\n📄 文件{test_file['file']}: {Path(file_path).name}")
        print(f"🚄 预期: {expected['departure']} → {expected['arrival']} ({expected['train']})")
        
        try:
            # 处理文件
            result = await ocr_service.process_single_file(file_path)
            
            if result['status'] == 'success':
                raw_data = result.get('raw_data', {})
                structured_data = result.get('structured_data', {})
                
                # 提取关键信息
                departure_station = raw_data.get('departure_station')
                arrival_station = raw_data.get('arrival_station')
                train_number = raw_data.get('train_number')
                departure_date = raw_data.get('departure_date')
                departure_time = raw_data.get('departure_time')
                amount = raw_data.get('amount')
                buyer_name = raw_data.get('buyer_name')
                seller_name = raw_data.get('seller_name')
                
                # 显示结果
                print(f"✅ OCR处理成功")
                print(f"📊 提取结果:")
                print(f"   出发站: {departure_station}")
                print(f"   到达站: {arrival_station}")
                print(f"   车次: {train_number}")
                print(f"   发车日期: {departure_date}")
                print(f"   发车时间: {departure_time}")
                print(f"   票价: {amount}")
                print(f"   购买方: {buyer_name}")
                print(f"   销售方: {seller_name}")
                
                # 检查是否正确
                stations_correct = (departure_station == expected['departure'] and 
                                  arrival_station == expected['arrival'])
                train_correct = train_number == expected['train']
                
                if stations_correct and train_correct:
                    print(f"✅ 所有信息提取正确!")
                else:
                    print(f"❌ 提取错误:")
                    if not stations_correct:
                        print(f"   站点错误: 应该是 {expected['departure']} → {expected['arrival']}")
                    if not train_correct:
                        print(f"   车次错误: 应该是 {expected['train']}")
                
                # 收集结果
                all_results.append({
                    "file": test_file['file'],
                    "filename": Path(file_path).name,
                    "status": "success",
                    "extracted": {
                        "departure_station": departure_station,
                        "arrival_station": arrival_station,
                        "train_number": train_number,
                        "departure_date": str(departure_date) if departure_date else None,
                        "departure_time": departure_time,
                        "amount": amount,
                        "buyer_name": buyer_name,
                        "seller_name": seller_name
                    },
                    "expected": expected,
                    "correct": stations_correct and train_correct
                })
                
            else:
                print(f"❌ OCR处理失败")
                all_results.append({
                    "file": test_file['file'],
                    "filename": Path(file_path).name,
                    "status": "failed",
                    "error": result.get('error', 'Unknown error')
                })
                
        except Exception as e:
            print(f"❌ 处理文件{test_file['file']}时出错: {e}")
            all_results.append({
                "file": test_file['file'],
                "filename": Path(file_path).name,
                "status": "error",
                "error": str(e)
            })
    
    print(f"\n" + "=" * 80)
    print("📊 测试总结:")
    print(f"总文件数: {len(all_results)}")
    success_count = sum(1 for r in all_results if r.get('status') == 'success')
    correct_count = sum(1 for r in all_results if r.get('correct', False))
    print(f"处理成功: {success_count}")
    print(f"提取正确: {correct_count}")
    
    # 保存结果到JSON文件
    result_file = f"ocr_direct_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"\n💾 详细结果已保存到: {result_file}")

if __name__ == "__main__":
    asyncio.run(test_ocr_direct())