#!/usr/bin/env python3
"""
测试PyMuPDF在invoice2data中的提取效果
对比PyMuPDF和pdftotext在invoice2data中的表现
"""

import sys
from pathlib import Path
import asyncio
import json

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.ocr.invoice2data_client import Invoice2DataClient
from app.services.ocr.config import OCRConfig
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

def test_pdftotext_vs_pymupdf(pdf_path, templates_dir):
    """对比pdftotext和PyMuPDF在invoice2data中的效果"""
    
    print(f"🔍 测试文件: {pdf_path.name}")
    print(f"=" * 80)
    
    # 加载模板
    custom_templates = read_templates(str(templates_dir))
    print(f"📋 加载了 {len(custom_templates)} 个模板")
    
    # 测试1: 使用pdftotext（默认）
    print(f"\n1. 🔧 pdftotext 提取结果:")
    print(f"-" * 40)
    try:
        result_pdftotext = extract_data(str(pdf_path), templates=custom_templates)
        if result_pdftotext:
            print(f"✅ 提取成功")
            for key, value in result_pdftotext.items():
                if key != 'template':  # 跳过模板信息
                    print(f"   {key}: {value}")
        else:
            print(f"❌ 提取失败 - 无结果")
    except Exception as e:
        print(f"❌ 提取失败 - 异常: {e}")
        result_pdftotext = None
    
    # 测试2: 使用PyMuPDF
    print(f"\n2. 🔧 PyMuPDF 提取结果:")
    print(f"-" * 40)
    try:
        from app.services.ocr import pymupdf_input
        result_pymupdf = extract_data(str(pdf_path), templates=custom_templates, input_module=pymupdf_input)
        if result_pymupdf:
            print(f"✅ 提取成功")
            for key, value in result_pymupdf.items():
                if key != 'template':  # 跳过模板信息
                    print(f"   {key}: {value}")
        else:
            print(f"❌ 提取失败 - 无结果")
    except Exception as e:
        print(f"❌ 提取失败 - 异常: {e}")
        result_pymupdf = None
    
    # 对比分析
    print(f"\n3. 📊 对比分析:")
    print(f"-" * 40)
    
    if result_pdftotext and result_pymupdf:
        # 都成功，比较结果
        same_fields = 0
        different_fields = 0
        
        all_keys = set(result_pdftotext.keys()) | set(result_pymupdf.keys())
        for key in all_keys:
            if key == 'template':
                continue
                
            val1 = result_pdftotext.get(key)
            val2 = result_pymupdf.get(key)
            
            if val1 == val2:
                same_fields += 1
            else:
                different_fields += 1
                print(f"   差异字段 {key}:")
                print(f"     pdftotext: {val1}")
                print(f"     PyMuPDF:   {val2}")
        
        print(f"   相同字段: {same_fields}")
        print(f"   不同字段: {different_fields}")
        
        if different_fields == 0:
            print(f"   ✅ 结果完全一致")
        else:
            print(f"   ⚠️ 存在差异，需要分析")
            
    elif result_pdftotext and not result_pymupdf:
        print(f"   ❌ PyMuPDF失败，pdftotext成功")
    elif not result_pdftotext and result_pymupdf:
        print(f"   ✅ PyMuPDF成功，pdftotext失败 - PyMuPDF更优")
    else:
        print(f"   ❌ 两个引擎都失败")
    
    return result_pdftotext, result_pymupdf

async def test_invoice2data_client(pdf_path):
    """测试Invoice2DataClient使用PyMuPDF的效果"""
    
    print(f"\n4. 🏭 Invoice2DataClient 测试:")
    print(f"-" * 40)
    
    try:
        # 创建配置
        config = OCRConfig()
        
        # 创建客户端
        client = Invoice2DataClient(config)
        
        # 提取数据
        result = await client.extract_invoice_data(str(pdf_path))
        
        if result['status'] == 'success':
            print(f"✅ 客户端提取成功")
            print(f"   置信度: {result.get('confidence', 'N/A')}")
            print(f"   提取方法: {result.get('extraction_method', 'N/A')}")
            
            # 显示结构化数据
            structured_data = result.get('structured_data')
            if structured_data:
                print(f"   发票号码: {structured_data.main_info.invoice_number}")
                print(f"   开票日期: {structured_data.main_info.invoice_date}")
                print(f"   买方名称: {structured_data.buyer_info.name}")
                print(f"   卖方名称: {structured_data.seller_info.name}")
                print(f"   金额: {structured_data.summary.amount}")
            
            return result
        else:
            print(f"❌ 客户端提取失败: {result.get('error', 'Unknown')}")
            return None
            
    except Exception as e:
        print(f"❌ 客户端异常: {e}")
        return None

async def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    templates_dir = Path(__file__).parent / "app/services/ocr/templates"
    
    if not downloads_dir.exists():
        print(f"❌ 目录不存在: {downloads_dir}")
        return
    
    if not templates_dir.exists():
        print(f"❌ 模板目录不存在: {templates_dir}")
        return
    
    # 获取测试文件
    test_files = [
        "25442000000101203423.pdf",  # Unicode问题文件
        "25432000000031789815.pdf",  # 空格问题文件
        "25359134169000052039.pdf"   # 普通火车票文件
    ]
    
    print(f"🚀 PyMuPDF vs pdftotext 在 invoice2data 中的对比测试")
    print(f"=" * 80)
    print(f"模板目录: {templates_dir}")
    print(f"测试文件: {len(test_files)} 个")
    
    for file_name in test_files:
        pdf_path = downloads_dir / file_name
        
        if not pdf_path.exists():
            print(f"⚠️ 跳过不存在的文件: {file_name}")
            continue
        
        print(f"\n" + "="*80)
        
        # 对比测试
        result_pdftotext, result_pymupdf = test_pdftotext_vs_pymupdf(pdf_path, templates_dir)
        
        # 客户端测试
        client_result = await test_invoice2data_client(pdf_path)
        
        print(f"\n" + "="*80)
    
    print(f"\n🎉 测试完成!")

if __name__ == "__main__":
    asyncio.run(main())