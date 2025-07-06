#!/usr/bin/env python3
"""
检查PDF文本提取问题
"""

import sys
from pathlib import Path
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams
from pdfminer.converter import TextConverter
from pdfminer.pdfdocument import PDFDocument
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage
from pdfminer.converter import PDFPageAggregator
from pdfminer.layout import LTTextContainer
import io

def extract_text_multiple_methods(pdf_path: str):
    """使用多种方法提取PDF文本"""
    print(f"分析PDF文件: {pdf_path}")
    print("=" * 60)
    
    # 方法1: pdfminer默认方法
    try:
        text1 = extract_text(pdf_path)
        print(f"方法1 (pdfminer默认): 长度={len(text1)}")
        if text1:
            print(f"预览: {text1[:200]}...")
        print()
    except Exception as e:
        print(f"方法1失败: {e}")
        text1 = ""
    
    # 方法2: pdfminer with LAParams
    try:
        laparams = LAParams(
            word_margin=0.1,
            char_margin=2.0,
            line_margin=0.5,
            boxes_flow=0.5
        )
        text2 = extract_text(pdf_path, laparams=laparams)
        print(f"方法2 (pdfminer+LAParams): 长度={len(text2)}")
        if text2:
            print(f"预览: {text2[:200]}...")
        print()
    except Exception as e:
        print(f"方法2失败: {e}")
        text2 = ""
    
    # 方法3: 使用invoice2data的文本提取方法
    try:
        from invoice2data.extract.text import extract_text as i2d_extract_text
        text3 = i2d_extract_text(pdf_path)
        print(f"方法3 (invoice2data): 长度={len(text3)}")
        if text3:
            print(f"预览: {text3[:200]}...")
        print()
    except Exception as e:
        print(f"方法3失败: {e}")
        text3 = ""
    
    # 方法4: PyPDF2 (if available)
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text4 = ""
            for page in reader.pages:
                text4 += page.extract_text()
        print(f"方法4 (PyPDF2): 长度={len(text4)}")
        if text4:
            print(f"预览: {text4[:200]}...")
        print()
    except ImportError:
        print("方法4: PyPDF2未安装")
        text4 = ""
    except Exception as e:
        print(f"方法4失败: {e}")
        text4 = ""
    
    return {
        'pdfminer_default': text1,
        'pdfminer_laparams': text2,
        'invoice2data': text3,
        'pypdf2': text4
    }

def main():
    # 选择一个失败的PDF文件进行分析
    test_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/25439165666000019624.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/25439122799000011090.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/25439165660000008536_1.pdf"
    ]
    
    for pdf_file in test_files:
        if Path(pdf_file).exists():
            results = extract_text_multiple_methods(pdf_file)
            
            # 分析哪种方法效果最好
            best_method = max(results.items(), key=lambda x: len(x[1]))
            print(f"最佳方法: {best_method[0]} (长度: {len(best_method[1])})")
            
            # 如果有文本内容，分析金额模式
            if best_method[1]:
                import re
                amounts = re.findall(r'[¥￥]([\d,]+\.?\d*)', best_method[1])
                print(f"发现金额: {amounts}")
            
            print("\n" + "=" * 80 + "\n")
        else:
            print(f"文件不存在: {pdf_file}")

if __name__ == "__main__":
    main()