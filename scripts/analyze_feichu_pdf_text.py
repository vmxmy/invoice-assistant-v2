#!/usr/bin/env python3
"""
分析飞猪航空发票PDF文本
"""

import fitz  # PyMuPDF
from pathlib import Path

def analyze_pdf_text():
    """分析PDF文本内容"""
    
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326164322/2025-03-26-阿斯兰航空服务（上海）有限公司-192.00-25317000000510550926.pdf"
    
    if not Path(pdf_path).exists():
        print(f"❌ 文件不存在: {pdf_path}")
        return
    
    print("📄 分析飞猪航空发票PDF文本")
    print("=" * 80)
    
    # 打开PDF
    doc = fitz.open(pdf_path)
    
    for page_num, page in enumerate(doc):
        print(f"\n📄 第 {page_num + 1} 页:")
        print("-" * 40)
        
        # 获取文本
        text = page.get_text()
        lines = text.split('\n')
        
        # 显示每一行
        for i, line in enumerate(lines):
            if line.strip():  # 只显示非空行
                print(f"{i+1:3d}: {line}")
        
        # 查找关键信息
        print(f"\n🔍 关键信息分析:")
        print("-" * 40)
        
        # 查找购买方和销售方
        for i, line in enumerate(lines):
            if '购买方' in line or '名称' in line or '销售方' in line:
                print(f"Line {i+1}: {line}")
                # 显示前后几行
                for j in range(max(0, i-2), min(len(lines), i+3)):
                    if j != i:
                        print(f"  {j+1}: {lines[j]}")
                print()
        
        # 查找税号
        print(f"\n💼 税号查找:")
        for i, line in enumerate(lines):
            if '税人识别号' in line or '税号' in line or len(line) == 18 and line.replace('0', '').isalnum():
                print(f"Line {i+1}: {line}")
                # 显示前后行
                if i > 0:
                    print(f"  前行: {lines[i-1]}")
                if i < len(lines) - 1:
                    print(f"  后行: {lines[i+1]}")
                print()
    
    doc.close()
    
    print("\n💡 分析建议:")
    print("-" * 40)
    print("1. 检查购买方和销售方名称的正则表达式")
    print("2. 确认税号的位置和格式")
    print("3. 优化提取逻辑以适应实际PDF布局")

if __name__ == "__main__":
    analyze_pdf_text()