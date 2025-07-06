#!/usr/bin/env python3
"""
测试火车票OCR服务完整流程
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.service import OCRService

async def test_train_ticket_ocr():
    """测试火车票OCR服务"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25439165660000008536.pdf"
    
    print("🚄 测试火车票OCR服务完整流程")
    print("=" * 80)
    
    # 创建OCR服务实例
    async with OCRService() as ocr_service:
        # 1. 测试提取发票数据
        print("\n1. 测试extract_invoice_data（兼容格式）:")
        print("-" * 60)
        
        result = await ocr_service.extract_invoice_data(pdf_path)
        
        if result['status'] == 'success':
            print("✅ 提取成功!")
            print(f"\n提取结果:")
            for key, value in result.items():
                if key not in ['raw_data', 'structured_data']:
                    print(f"   {key}: {value}")
            
            # 检查结构化数据
            if 'structured_data' in result and result['structured_data']:
                print(f"\n结构化数据:")
                structured = result['structured_data']
                
                # 主要信息
                if 'main_info' in structured:
                    print(f"   主要信息:")
                    for k, v in structured['main_info'].items():
                        print(f"      {k}: {v}")
                
                # 买方信息
                if 'buyer_info' in structured:
                    print(f"   买方信息:")
                    for k, v in structured['buyer_info'].items():
                        if v:  # 只打印非空值
                            print(f"      {k}: {v}")
                
                # 卖方信息
                if 'seller_info' in structured:
                    print(f"   卖方信息:")
                    for k, v in structured['seller_info'].items():
                        if v:  # 只打印非空值
                            print(f"      {k}: {v}")
                
                # 汇总信息
                if 'summary' in structured:
                    print(f"   汇总信息:")
                    for k, v in structured['summary'].items():
                        if v:  # 只打印非空值
                            print(f"      {k}: {v}")
            
            # 检查顶层字段（向后兼容）
            print(f"\n向后兼容字段:")
            compat_fields = ['invoice_number', 'invoice_date', 'seller_name', 'buyer_name', 'total_amount']
            for field in compat_fields:
                if field in result:
                    print(f"   {field}: {result[field]}")
        else:
            print(f"❌ 提取失败: {result.get('error', '未知错误')}")
        
        # 2. 测试健康检查
        print("\n\n2. 测试健康检查:")
        print("-" * 60)
        
        health = await ocr_service.health_check()
        print(f"状态: {health['status']}")
        print(f"服务: {health['service']}")
        print(f"加载的模板数: {health.get('templates_loaded', 0)}")
        
        if 'available_templates' in health:
            print(f"可用模板:")
            for template in health['available_templates']:
                print(f"   - {template}")

if __name__ == "__main__":
    asyncio.run(test_train_ticket_ocr())