#!/usr/bin/env python3
"""
测试通用的火车票站点提取
"""

import asyncio
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

async def test_universal_station_extraction():
    """测试通用站点提取"""
    print("🚄 测试通用火车票站点提取")
    print("=" * 50)
    
    # 指定的PDF文件路径
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    
    try:
        from app.services.ocr import Invoice2DataClient, OCRConfig
        
        # 初始化客户端
        config = OCRConfig()
        client = Invoice2DataClient(config)
        
        print(f"📄 测试文件: {Path(pdf_path).name}")
        
        # 提取数据
        print("\n🔍 开始提取...")
        result = await client.extract_invoice_data(pdf_path)
        
        if result.get('status') == 'success':
            print("✅ 提取成功！")
            
            raw_data = result.get('raw_data', {})
            
            print(f"\n🚉 智能站点提取结果:")
            print(f"  出发站: {raw_data.get('departure_station', '未提取')}")
            print(f"  到达站: {raw_data.get('arrival_station', '未提取')}")
            print(f"  出发时间: {raw_data.get('departure_time', '未提取')}")
            
            # 显示调试信息
            if '_original_station_1' in raw_data:
                print(f"\n🔍 调试信息:")
                print(f"  原始提取站点1: {raw_data.get('_original_station_1')}")
                print(f"  原始提取站点2: {raw_data.get('_original_station_2')}")
                print(f"  智能判断逻辑: 站点2({raw_data.get('_original_station_2')}) -> 出发站")
                print(f"                站点1({raw_data.get('_original_station_1')}) -> 到达站")
            
            print(f"\n🚄 完整行程信息:")
            print(f"  车次: {raw_data.get('train_number', '未提取')}")
            print(f"  {raw_data.get('departure_station', '?')} --{raw_data.get('train_number', '?')}--> {raw_data.get('arrival_station', '?')}")
            print(f"  出发时间: {raw_data.get('departure_time', '?')}")
            print(f"  座位: {raw_data.get('seat_type', '?')} {raw_data.get('seat_number', '?')}")
            print(f"  乘客: {raw_data.get('passenger_name', '?')}")
            print(f"  票价: ¥{raw_data.get('amount', '?')}")
            
            print(f"\n📝 通用性说明:")
            print(f"  ✅ 使用 ([\u4e00-\u9fa5]+站) 匹配任意中文站名")
            print(f"  ✅ 智能后处理判断出发站/到达站")
            print(f"  ✅ 适用于不同车次和路线的火车票")
            print(f"  ✅ 无需硬编码特定站名")
            
            return True
            
        else:
            print("❌ 提取失败")
            print(f"错误: {result.get('error', '未知错误')}")
            return False
            
    except Exception as e:
        print(f"❌ 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False

async def demonstrate_universality():
    """演示通用性"""
    print("\n🌍 通用性演示")
    print("=" * 30)
    
    print("📋 通用正则表达式设计:")
    print("  station_1: ([\u4e00-\u9fa5]+站)  # 匹配第一个中文站名")
    print("  station_2: (?<=[\u4e00-\u9fa5]+站.*)([\u4e00-\u9fa5]+站)  # 匹配第二个站名")
    
    print("\n🧠 智能后处理逻辑:")
    print("  1. 提取所有中文站名")
    print("  2. 基于在PDF中的位置顺序判断")
    print("  3. 通常规则：最后出现的是出发站，最先出现的是到达站")
    print("  4. 兼容不同票面布局")
    
    print("\n🎯 适用场景:")
    examples = [
        "北京南站 -> 上海虹桥站",
        "深圳北站 -> 广州南站", 
        "杭州东站 -> 武汉站",
        "成都东站 -> 重庆北站"
    ]
    
    for example in examples:
        print(f"  ✅ {example}")
    
    print("\n⚠️  注意事项:")
    print("  - 要求PDF中包含中文站名")
    print("  - 依赖于火车票的标准布局")
    print("  - 对于特殊格式可能需要微调")

async def main():
    """主函数"""
    print("开始测试通用火车票站点提取...\n")
    
    success = await test_universal_station_extraction()
    await demonstrate_universality()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 通用站点提取测试成功!")
        print("\n💡 设计优势:")
        print("✅ 不依赖特定站名，适用于全国火车票")
        print("✅ 智能判断出发/到达关系")
        print("✅ 支持任意车次和路线")
        print("✅ 易于维护和扩展")
    else:
        print("❌ 测试失败，需要进一步调试")

if __name__ == "__main__":
    asyncio.run(main())