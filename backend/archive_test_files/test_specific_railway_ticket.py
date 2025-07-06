#!/usr/bin/env python3
"""
测试特定的火车票文件
"""

import asyncio
from pathlib import Path
from app.services.ocr.service import OCRService
import json

async def test_railway_ticket():
    """测试火车票数据提取"""
    
    # 创建OCR服务
    ocr_service = OCRService()
    
    # 火车票文件
    pdf_file = Path("downloads/25439165660000008536.pdf")
    
    if not pdf_file.exists():
        # 尝试带 _1 后缀的文件
        pdf_file = Path("downloads/25439165660000008536_1.pdf")
    
    if not pdf_file.exists():
        print(f"文件不存在: {pdf_file}")
        return
    
    print(f"测试火车票文件: {pdf_file.name}")
    print("="*60)
    
    try:
        # 先查看PDF的文本内容
        from invoice2data.input import pdftotext
        text = pdftotext.to_text(str(pdf_file))
        print("\nPDF文本内容（前1500字符）:")
        print(text[:1500])
        print("\n" + "="*60 + "\n")
        
        # 测试OCR提取
        async with ocr_service:
            result = await ocr_service.extract_invoice_data(str(pdf_file))
        
        print("OCR提取结果:")
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        
        if result.get('status') == 'success':
            print("\n✓ 提取成功！")
            
            # 显示关键信息
            print(f"\n基本信息：")
            print(f"  发票类型: {result.get('invoice_type')}")
            print(f"  发票号码: {result.get('invoice_number')}")
            print(f"  开票日期: {result.get('invoice_date')}")
            print(f"  金额: ¥{result.get('amount', 0)}")
            print(f"  销售方: {result.get('seller_name')}")
            
            # 显示原始提取数据
            raw_data = result.get('raw_data', {})
            if raw_data:
                print(f"\n原始提取数据：")
                for key, value in raw_data.items():
                    if value and key not in ['currency', 'desc', 'issuer']:
                        print(f"  {key}: {value}")
        else:
            print(f"\n× 提取失败: {result.get('error')}")
            
    except Exception as e:
        print(f"处理错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_railway_ticket())