#!/usr/bin/env python3
"""
调试invoice2data，查看实际提取的文本内容
"""

import sys
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from pdfplumber import PDF

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def debug_pdf_text(pdf_path):
    """使用pdfplumber提取PDF文本"""
    print(f"\n{'='*60}")
    print(f"PDF文件: {pdf_path}")
    print(f"{'='*60}")
    
    # 使用pdfplumber提取文本
    try:
        with PDF.open(pdf_path) as pdf:
            print(f"\n总页数: {len(pdf.pages)}")
            
            for i, page in enumerate(pdf.pages):
                print(f"\n--- 第 {i+1} 页 ---")
                text = page.extract_text()
                if text:
                    # 显示前1000个字符
                    print(text[:1000])
                    
                    # 查找关键字段
                    print("\n=== 关键字段搜索 ===")
                    keywords = ["销售方", "销方", "销\s*名称", "名称", "统一社会信用代码", "纳税人识别号"]
                    for keyword in keywords:
                        import re
                        matches = re.findall(f"{keyword}.*", text, re.IGNORECASE)
                        if matches:
                            print(f"\n'{keyword}' 匹配:")
                            for match in matches[:3]:  # 只显示前3个匹配
                                print(f"  - {match[:100]}")
                else:
                    print("未提取到文本")
    except Exception as e:
        print(f"pdfplumber错误: {e}")
    
    print("\n" + "="*60)
    
    # 使用invoice2data提取
    print("\n=== Invoice2data 提取结果 ===")
    templates_dir = Path(__file__).parent / "app/services/ocr/templates"
    templates = read_templates(str(templates_dir))
    result = extract_data(pdf_path, templates=templates)
    
    if result:
        print(f"成功提取: {result}")
    else:
        print("Invoice2data未能提取数据")

def main():
    # 选择一个测试文件
    downloads_dir = Path("downloads")
    pdf_files = list(downloads_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("没有找到PDF文件")
        return
    
    # 测试前3个文件
    for pdf_file in pdf_files[:3]:
        debug_pdf_text(str(pdf_file))

if __name__ == "__main__":
    main()