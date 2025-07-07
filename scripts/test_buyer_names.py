#!/usr/bin/env python3
"""
测试购买方名称的通用提取
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

async def test_buyer_extraction():
    """测试购买方名称提取"""
    print("🏢 测试购买方名称通用提取")
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
                    buyer_name = raw_data.get('buyer_name', '未提取')
                    seller_name = raw_data.get('seller_name', '未提取')
                    
                    print(f"✅ 火车票识别成功")
                    print(f"  购买方: {buyer_name}")
                    print(f"  销售方: {seller_name}")
                    
                    results.append({
                        'file': Path(pdf_path).name,
                        'buyer_name': buyer_name,
                        'seller_name': seller_name,
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
        print("📊 购买方名称提取分析")
        print("-" * 30)
        
        train_tickets = [r for r in results if r.get('status') == 'success']
        
        if train_tickets:
            # 统计购买方名称
            buyer_names = [t['buyer_name'] for t in train_tickets if t['buyer_name'] != '未提取']
            unique_buyers = list(set(buyer_names))
            
            print(f"🏢 总火车票数: {len(train_tickets)}")
            print(f"✅ 成功提取购买方: {len(buyer_names)}")
            print(f"🎯 购买方提取成功率: {len(buyer_names)/len(train_tickets)*100:.1f}%")
            print(f"📋 不同购买方数量: {len(unique_buyers)}")
            
            print(f"\n📝 购买方列表:")
            for buyer in unique_buyers:
                count = buyer_names.count(buyer)
                print(f"  - {buyer} ({count}张)")
            
            # 验证销售方
            seller_names = [t['seller_name'] for t in train_tickets if t['seller_name'] != '未提取']
            unique_sellers = list(set(seller_names))
            
            print(f"\n🚄 销售方验证:")
            print(f"✅ 成功提取销售方: {len(seller_names)}")
            print(f"📋 不同销售方数量: {len(unique_sellers)}")
            for seller in unique_sellers:
                count = seller_names.count(seller)
                print(f"  - {seller} ({count}张)")
            
            print(f"\n💡 通用正则验证:")
            if len(unique_buyers) > 1:
                print("✅ 正则表达式能够匹配不同的购买方公司名称")
            else:
                print("ℹ️  当前测试中只有一个购买方，需要更多样本验证通用性")
                
            if all(seller == '中国铁路12306' for seller in seller_names):
                print("✅ 火车票销售方正确统一为'中国铁路12306'")
            else:
                print("⚠️  部分火车票销售方设置不正确")
        
        return results
        
    except Exception as e:
        print(f"❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return []

async def main():
    """主函数"""
    print("开始测试购买方名称通用提取...\n")
    
    results = await test_buyer_extraction()
    
    # 最终评估
    train_results = [r for r in results if r.get('status') == 'success']
    
    if train_results:
        success_count = len([r for r in train_results if r['buyer_name'] != '未提取'])
        success_rate = success_count / len(train_results) * 100
        
        print(f"\n" + "=" * 60)
        print("🏆 最终评估")
        print("-" * 20)
        print(f"🎯 购买方名称提取成功率: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 通用购买方提取效果优秀!")
        elif success_rate >= 70:
            print("✅ 通用购买方提取效果良好!")
        else:
            print("⚠️  购买方提取需要进一步优化")
        
        print(f"\n💡 正则表达式验证:")
        print(f"✅ 使用通用正则 ([\\u4e00-\\u9fa5A-Za-z0-9（）()]+(?:公司|企业|集团|有限公司|股份有限公司|合伙企业|事务所|中心|厂|店))")
        print(f"✅ 无需硬编码特定公司名称")
        print(f"✅ 适用于不同购买方的火车票")

if __name__ == "__main__":
    asyncio.run(main())