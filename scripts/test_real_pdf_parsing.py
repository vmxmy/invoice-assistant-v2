#!/usr/bin/env python3
"""
真实PDF发票解析测试

使用真实的Mineru API测试PDF发票解析功能
"""

import asyncio
import sys
import json
from pathlib import Path
from datetime import datetime
import os

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr import OCRService, OCRConfig
from app.services.ocr.exceptions import OCRError
from app.core.config import Settings


def load_env_config():
    """从环境变量加载配置"""
    # 加载.env文件
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value.strip('"')
    
    return {
        'api_token': os.getenv('MINERU_API_TOKEN'),
        'base_url': os.getenv('MINERU_API_BASE_URL', 'https://mineru.net')
    }


def select_test_pdf():
    """选择要测试的PDF文件"""
    print("🔍 搜索可用的PDF发票文件...")
    
    # 搜索PDF文件
    search_paths = [
        "/Users/xumingyang/app/invoice_assist/renamed_invoices",
        "/Users/xumingyang/app/invoice_assist/downloads",
        "/Users/xumingyang/app/invoice_assist/uploads",
        "/Users/xumingyang/app/invoice_assist/v2/backend/uploads"
    ]
    
    pdf_files = []
    for search_path in search_paths:
        path = Path(search_path)
        if path.exists():
            pdf_files.extend(list(path.glob("*.pdf")))
    
    if not pdf_files:
        print("❌ 未找到PDF文件")
        return None
    
    print(f"📁 找到 {len(pdf_files)} 个PDF文件:")
    for i, pdf_file in enumerate(pdf_files[:10]):  # 只显示前10个
        file_size = pdf_file.stat().st_size / 1024  # KB
        print(f"   {i+1}. {pdf_file.name} ({file_size:.1f} KB)")
    
    if len(pdf_files) > 10:
        print(f"   ... 还有 {len(pdf_files) - 10} 个文件")
    
    # 选择第一个文件作为测试文件
    selected_file = pdf_files[0]
    print(f"\n✅ 自动选择测试文件: {selected_file.name}")
    return selected_file


async def test_real_api_parsing(pdf_file_path):
    """测试真实API解析"""
    print(f"\n🚀 开始测试真实API解析...")
    print(f"📄 测试文件: {pdf_file_path}")
    
    # 加载配置
    env_config = load_env_config()
    
    if not env_config['api_token']:
        print("❌ 未找到MINERU_API_TOKEN，切换到Mock模式")
        config = OCRConfig(
            api_token="mock_token", 
            mock_mode=True
        )
    else:
        print(f"🔑 使用真实API Token: {env_config['api_token'][:20]}...")
        config = OCRConfig(
            api_token=env_config['api_token'],
            base_url=env_config['base_url'],
            mock_mode=False
        )
    
    service = OCRService(config)
    
    try:
        start_time = datetime.now()
        print(f"⏰ 开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        async with service:
            # 测试新版API
            print("📊 调用extract_invoice_data_v2...")
            result = await service.extract_invoice_data_v2(str(pdf_file_path))
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        print(f"⏰ 结束时间: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"⚡ 处理耗时: {processing_time:.2f}秒")
        
        return result
        
    except Exception as e:
        print(f"❌ API调用失败: {e}")
        return None


def print_detailed_result(result):
    """打印详细的解析结果"""
    if not result:
        print("❌ 无解析结果")
        return
    
    print("\n" + "="*80)
    print("📋 完整解析结果")
    print("="*80)
    
    # 基本信息
    print(f"🔄 状态: {result.status}")
    print(f"🎯 置信度: {result.confidence:.3f}")
    print(f"🔧 提取方法: {result.extraction_method}")
    print(f"⚡ 处理时间: {result.processing_time:.2f}秒" if result.processing_time else "N/A")
    
    if result.error:
        print(f"❌ 错误信息: {result.error}")
    
    if result.batch_id:
        print(f"📦 批次ID: {result.batch_id}")
    
    if result.raw_text:
        print(f"\n📝 原始文本预览:")
        print("-" * 40)
        preview = result.raw_text[:500] + "..." if len(result.raw_text) > 500 else result.raw_text
        print(preview)
    
    # 结构化数据
    if result.structured_data:
        print(f"\n🏗️ 结构化发票数据:")
        print("-" * 40)
        
        # 主要信息
        main_info = result.structured_data.main_info
        print(f"📄 发票号码: {main_info.invoice_number}")
        print(f"📄 发票代码: {main_info.invoice_code}")
        print(f"📄 发票类型: {main_info.invoice_type}")
        print(f"📅 开票日期: {main_info.invoice_date}")
        
        # 销售方信息
        seller = result.structured_data.seller_info
        print(f"\n🏢 销售方信息:")
        print(f"   公司名称: {seller.name}")
        print(f"   税号: {seller.tax_id}")
        print(f"   地址: {seller.address}")
        print(f"   电话: {seller.phone}")
        
        # 购买方信息
        buyer = result.structured_data.buyer_info
        print(f"\n🏛️ 购买方信息:")
        print(f"   公司名称: {buyer.name}")
        print(f"   税号: {buyer.tax_id}")
        print(f"   地址: {buyer.address}")
        print(f"   电话: {buyer.phone}")
        
        # 金额信息
        summary = result.structured_data.summary
        print(f"\n💰 金额信息:")
        print(f"   合计金额: ¥{summary.amount}")
        print(f"   合计税额: ¥{summary.tax_amount}")
        print(f"   价税合计: ¥{summary.total_amount}")
        print(f"   大写金额: {summary.amount_in_words}")
        
        # 明细项目
        if result.structured_data.items:
            print(f"\n📊 发票明细 ({len(result.structured_data.items)}项):")
            for i, item in enumerate(result.structured_data.items[:5]):  # 只显示前5项
                print(f"   {i+1}. {item.get('name', 'N/A')} - ¥{item.get('amount', 'N/A')}")
            if len(result.structured_data.items) > 5:
                print(f"   ... 还有 {len(result.structured_data.items) - 5} 项")
    
    print("="*80)


def save_result_to_file(result, pdf_file_path):
    """保存结果到JSON文件"""
    if not result:
        return
    
    output_dir = Path("ocr_test_results")
    output_dir.mkdir(exist_ok=True)
    
    # 生成输出文件名
    pdf_name = Path(pdf_file_path).stem
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"{pdf_name}_{timestamp}.json"
    
    # 转换结果为字典
    result_dict = {
        "test_info": {
            "pdf_file": str(pdf_file_path),
            "test_time": datetime.now().isoformat(),
            "extraction_method": result.extraction_method
        },
        "basic_info": {
            "status": result.status,
            "confidence": result.confidence,
            "processing_time": result.processing_time,
            "error": result.error,
            "batch_id": result.batch_id
        },
        "raw_text": result.raw_text,
        "structured_data": None
    }
    
    # 添加结构化数据
    if result.structured_data:
        try:
            # 使用Pydantic的dict()方法
            result_dict["structured_data"] = result.structured_data.dict()
        except:
            # 如果失败，尝试手动转换
            result_dict["structured_data"] = {
                "main_info": {
                    "invoice_number": result.structured_data.main_info.invoice_number,
                    "invoice_code": result.structured_data.main_info.invoice_code,
                    "invoice_type": result.structured_data.main_info.invoice_type,
                    "invoice_date": str(result.structured_data.main_info.invoice_date) if result.structured_data.main_info.invoice_date else None
                },
                "seller_info": {
                    "name": result.structured_data.seller_info.name,
                    "tax_id": result.structured_data.seller_info.tax_id,
                    "address": result.structured_data.seller_info.address,
                    "phone": result.structured_data.seller_info.phone
                },
                "buyer_info": {
                    "name": result.structured_data.buyer_info.name,
                    "tax_id": result.structured_data.buyer_info.tax_id,
                    "address": result.structured_data.buyer_info.address,
                    "phone": result.structured_data.buyer_info.phone
                },
                "summary": {
                    "amount": str(result.structured_data.summary.amount),
                    "tax_amount": str(result.structured_data.summary.tax_amount),
                    "total_amount": str(result.structured_data.summary.total_amount),
                    "amount_in_words": result.structured_data.summary.amount_in_words
                },
                "items": result.structured_data.items
            }
    
    # 保存到文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result_dict, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n💾 解析结果已保存到: {output_file}")


async def main():
    """主函数"""
    print("🎯 真实PDF发票解析测试")
    print("=" * 50)
    
    # 选择测试文件
    pdf_file = select_test_pdf()
    if not pdf_file:
        return 1
    
    # 执行解析测试
    result = await test_real_api_parsing(pdf_file)
    
    if result:
        # 打印详细结果
        print_detailed_result(result)
        
        # 保存结果
        save_result_to_file(result, pdf_file)
        
        print(f"\n🎉 测试完成！")
        if result.status == "success":
            print("✅ PDF解析成功")
            return 0
        else:
            print("⚠️ PDF解析有错误")
            return 1
    else:
        print("❌ 测试失败")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)