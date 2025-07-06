#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
展示PDF的OCR输出完整内容
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def show_pdf_content():
    """展示PDF文件的完整OCR内容"""
    
    # 查找可用的PDF文件
    downloads_dir = Path("downloads")
    if not downloads_dir.exists():
        print("❌ downloads目录不存在")
        return
    
    pdf_files = list(downloads_dir.glob("*.pdf"))
    if not pdf_files:
        print("❌ 没有找到PDF文件")
        return
    
    # 选择第一个PDF文件
    pdf_file = pdf_files[0]
    print(f"📄 分析文件: {pdf_file}")
    print("=" * 80)
    
    try:
        # 1. 使用原生pdftotext提取
        print("🔍 1. 原生pdftotext输出:")
        print("-" * 40)
        
        from app.services.ocr.enhanced_pdftotext import _original_pdftotext
        raw_text = _original_pdftotext(str(pdf_file))
        print(f"原始文本长度: {len(raw_text)} 字符")
        print("原始文本内容:")
        print(repr(raw_text))  # 使用repr显示转义字符
        print()
        print("原始文本显示:")
        print(raw_text)
        print()
        
        # 2. 使用增强的pdftotext提取
        print("🔍 2. 增强pdftotext输出:")
        print("-" * 40)
        
        from app.services.ocr.enhanced_pdftotext import to_text
        enhanced_text = to_text(str(pdf_file))
        print(f"增强文本长度: {len(enhanced_text)} 字符")
        print("增强文本内容:")
        print(repr(enhanced_text))
        print()
        print("增强文本显示:")
        print(enhanced_text)
        print()
        
        # 3. 使用PyMuPDF提取
        print("🔍 3. PyMuPDF输出:")
        print("-" * 40)
        
        try:
            from app.services.ocr import pymupdf_input
            pymupdf_text = pymupdf_input.to_text(str(pdf_file))
            print(f"PyMuPDF文本长度: {len(pymupdf_text)} 字符")
            print("PyMuPDF文本内容:")
            print(repr(pymupdf_text))
            print()
            print("PyMuPDF文本显示:")
            print(pymupdf_text)
            print()
        except Exception as e:
            print(f"⚠️ PyMuPDF提取失败: {e}")
        
        # 4. 使用invoice2data处理
        print("🔍 4. Invoice2Data处理结果:")
        print("-" * 40)
        
        try:
            from app.services.ocr.invoice2data_client import Invoice2DataClient
            from app.services.ocr.config import OCRConfig
            
            # 创建配置
            config = OCRConfig()
            client = Invoice2DataClient(config)
            
            # 异步处理需要在事件循环中运行
            import asyncio
            result = asyncio.run(client.process_single_file(str(pdf_file)))
            
            print("Invoice2Data处理结果:")
            import json
            print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
            
        except Exception as e:
            print(f"⚠️ Invoice2Data处理失败: {e}")
            import traceback
            traceback.print_exc()
    
    except Exception as e:
        print(f"❌ 处理失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    show_pdf_content()