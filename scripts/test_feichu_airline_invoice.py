#!/usr/bin/env python3
"""
测试飞猪航空发票模板
"""

import sys
from pathlib import Path
import asyncio
import json

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.config import OCRConfig
from app.services.ocr.invoice2data_client import Invoice2DataClient

async def test_feichu_airline_invoice():
    """测试飞猪航空发票模板"""
    
    # 测试文件
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326164322/2025-03-26-阿斯兰航空服务（上海）有限公司-192.00-25317000000510550926.pdf"
    
    if not Path(pdf_path).exists():
        print(f"❌ 文件不存在: {pdf_path}")
        return
    
    print("✈️ 测试飞猪航空发票模板")
    print("=" * 80)
    print(f"📄 文件: {Path(pdf_path).name}")
    
    # 创建OCR服务
    config = OCRConfig()
    ocr_service = Invoice2DataClient(config)
    
    try:
        # 处理文件
        result = await ocr_service.process_single_file(pdf_path)
        
        if result['status'] == 'success':
            print(f"✅ OCR处理成功")
            
            raw_data = result.get('raw_data', {})
            structured_data = result.get('structured_data', {})
            
            print(f"\n📊 提取的原始数据:")
            print("-" * 40)
            
            # 基本信息
            print(f"发票号码: {raw_data.get('invoice_number')}")
            print(f"开票日期: {raw_data.get('date')}")
            print(f"发行方: {raw_data.get('issuer')}")
            
            # 金额信息
            print(f"\n💰 金额信息:")
            print(f"金额(小写): {raw_data.get('amount')}")
            print(f"金额(大写): {raw_data.get('chinese_amount')}")
            
            # 购销方信息
            print(f"\n🏢 购销方信息:")
            print(f"购买方名称: {raw_data.get('buyer_name')}")
            print(f"购买方税号: {raw_data.get('buyer_tax_id')}")
            print(f"销售方名称: {raw_data.get('seller_name')}")
            print(f"销售方税号: {raw_data.get('seller_tax_id')}")
            
            # 项目明细
            print(f"\n📋 项目明细:")
            print(f"服务类型: {raw_data.get('service_type')}")
            print(f"项目名称: {raw_data.get('project_name')}")
            print(f"项目金额: {raw_data.get('project_amount')}")
            print(f"税率: {raw_data.get('project_tax_rate')}")
            print(f"税额: {raw_data.get('project_tax_amount')}")
            
            # 机票特有信息
            print(f"\n✈️ 机票特有信息:")
            print(f"航空服务: {raw_data.get('airline_service')}")
            print(f"订票服务: {raw_data.get('booking_service')}")
            
            # 其他信息
            print(f"\n👤 其他信息:")
            print(f"开票人: {raw_data.get('issuer_person')}")
            
            # 结构化数据
            print(f"\n📋 结构化数据:")
            print("-" * 40)
            if structured_data:
                print(f"主要信息:")
                print(f"  发票号码: {structured_data.main_info.invoice_number}")
                print(f"  发票类型: {structured_data.main_info.invoice_type}")
                print(f"  开票日期: {structured_data.main_info.invoice_date}")
                
                print(f"\n销售方信息:")
                print(f"  名称: {structured_data.seller_info.name}")
                print(f"  税号: {structured_data.seller_info.tax_id}")
                
                print(f"\n购买方信息:")
                print(f"  名称: {structured_data.buyer_info.name}")
                print(f"  税号: {structured_data.buyer_info.tax_id}")
                
                print(f"\n汇总信息:")
                print(f"  金额: {structured_data.summary.amount}")
                print(f"  税额: {structured_data.summary.tax_amount}")
                print(f"  合计: {structured_data.summary.total_amount}")
                print(f"  大写: {structured_data.summary.amount_in_words}")
            
            # 验证关键信息
            print(f"\n🔍 验证结果:")
            print("-" * 40)
            
            expected = {
                "invoice_number": "25317000000510550926",
                "amount": 192.00,
                "seller_name": "阿斯兰航空服务（上海）有限公司",
                "service_type": "经纪代理服务"
            }
            
            # 检查发票号码
            actual_number = raw_data.get('invoice_number', '')
            if actual_number == expected['invoice_number']:
                print(f"✅ 发票号码正确: {actual_number}")
            else:
                print(f"❌ 发票号码错误: {actual_number} (应该是 {expected['invoice_number']})")
            
            # 检查金额
            actual_amount = raw_data.get('amount', 0)
            if float(actual_amount) == expected['amount']:
                print(f"✅ 金额正确: {actual_amount}")
            else:
                print(f"❌ 金额错误: {actual_amount} (应该是 {expected['amount']})")
            
            # 检查销售方
            actual_seller = raw_data.get('seller_name', '')
            if expected['seller_name'] in actual_seller or actual_seller in expected['seller_name']:
                print(f"✅ 销售方正确: {actual_seller}")
            else:
                print(f"❌ 销售方错误: {actual_seller} (应该包含 {expected['seller_name']})")
            
            # 检查服务类型
            actual_service = raw_data.get('service_type', '')
            if actual_service == expected['service_type']:
                print(f"✅ 服务类型正确: {actual_service}")
            else:
                print(f"❌ 服务类型错误: {actual_service} (应该是 {expected['service_type']})")
            
            # 保存完整结果
            result_file = "feichu_airline_test_result.json"
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "file": Path(pdf_path).name,
                    "status": "success",
                    "raw_data": raw_data,
                    "structured_data": json.loads(structured_data.model_dump_json()) if structured_data else None,
                    "expected": expected
                }, f, indent=2, ensure_ascii=False, default=str)
            
            print(f"\n💾 完整结果已保存到: {result_file}")
            
        else:
            print(f"❌ OCR处理失败: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ 处理出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_feichu_airline_invoice())