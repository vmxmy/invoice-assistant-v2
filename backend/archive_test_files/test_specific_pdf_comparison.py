#!/usr/bin/env python3
"""
详细对比特定PDF文件的提取结果
"""

import sys
from pathlib import Path
import subprocess
import fitz  # PyMuPDF

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def extract_with_pdftotext(pdf_path):
    """使用pdftotext提取文本"""
    try:
        cmd = ["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_path), "-"]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        if result.returncode == 0:
            return result.stdout
        else:
            return f"ERROR: {result.stderr}"
    except Exception as e:
        return f"ERROR: {str(e)}"

def extract_with_pymupdf(pdf_path):
    """使用PyMuPDF提取文本"""
    try:
        doc = fitz.open(str(pdf_path))
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        return f"ERROR: {str(e)}"

def extract_with_pymupdf_layout(pdf_path):
    """使用PyMuPDF提取文本（保持布局）"""
    try:
        doc = fitz.open(str(pdf_path))
        text = ""
        for page in doc:
            text += page.get_text("text", sort=True)  # 尝试保持文本顺序
        doc.close()
        return text
    except Exception as e:
        return f"ERROR: {str(e)}"

def test_specific_file(file_name):
    """测试特定文件"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    pdf_path = downloads_dir / file_name
    
    if not pdf_path.exists():
        print(f"❌ 文件不存在: {pdf_path}")
        return
    
    print(f"🔍 详细分析文件: {file_name}")
    print(f"=" * 80)
    
    # 提取文本
    pdftotext_result = extract_with_pdftotext(pdf_path)
    pymupdf_result = extract_with_pymupdf(pdf_path)
    pymupdf_layout_result = extract_with_pymupdf_layout(pdf_path)
    
    print(f"📄 pdftotext 结果:")
    print(f"-" * 40)
    lines = pdftotext_result.split('\n')
    for i, line in enumerate(lines[:20]):  # 显示前20行
        if line.strip():
            print(f"{i+1:3d}: {repr(line)}")
    
    print(f"\n📄 PyMuPDF 默认结果:")
    print(f"-" * 40)
    lines = pymupdf_result.split('\n')
    for i, line in enumerate(lines[:20]):  # 显示前20行
        if line.strip():
            print(f"{i+1:3d}: {repr(line)}")
    
    print(f"\n📄 PyMuPDF 布局保持结果:")
    print(f"-" * 40)
    lines = pymupdf_layout_result.split('\n')
    for i, line in enumerate(lines[:20]):  # 显示前20行
        if line.strip():
            print(f"{i+1:3d}: {repr(line)}")
    
    # 检查特定问题
    print(f"\n🔍 问题检测:")
    print(f"-" * 40)
    
    # Unicode问题
    unicode_chars = ['⼦', '⼀', '⼋', '⼊', '⼆']
    for method, text in [("pdftotext", pdftotext_result), ("PyMuPDF", pymupdf_result)]:
        found_unicode = [char for char in unicode_chars if char in text]
        if found_unicode:
            print(f"   {method} Unicode问题: 发现 {found_unicode}")
        else:
            print(f"   {method} Unicode问题: 无")
    
    # 空格问题
    space_patterns = ['发 票 号 码', '购 买 方', '销 售 方', '开 票 日 期']
    for method, text in [("pdftotext", pdftotext_result), ("PyMuPDF", pymupdf_result)]:
        found_spaces = [pattern for pattern in space_patterns if pattern in text]
        if found_spaces:
            print(f"   {method} 空格问题: 发现 {found_spaces}")
        else:
            print(f"   {method} 空格问题: 无")
    
    # 关键字段提取对比
    print(f"\n📊 关键字段提取对比:")
    print(f"-" * 40)
    
    import re
    
    for method, text in [("pdftotext", pdftotext_result), ("PyMuPDF", pymupdf_result)]:
        print(f"\n{method}:")
        
        # 发票号码
        invoice_numbers = re.findall(r'\d{20}', text)
        print(f"   发票号码: {invoice_numbers[0] if invoice_numbers else '未找到'}")
        
        # 日期
        dates = re.findall(r'\d{4}年\d{1,2}月\d{1,2}日', text)
        print(f"   日期: {dates if dates else '未找到'}")
        
        # 金额
        amounts = re.findall(r'[¥￥]\s*[\d,]+\.?\d*', text)
        print(f"   金额: {amounts if amounts else '未找到'}")
        
        # 购买方
        buyer_patterns = [
            r'购买方[：:]([^\n\s]+)',
            r'购.*?买.*?方[：:]([^\n]+)',
            r'购\s*买\s*方[：:]([^\n]+)'
        ]
        for pattern in buyer_patterns:
            matches = re.findall(pattern, text)
            if matches:
                print(f"   购买方: {matches[0].strip()}")
                break
        else:
            print(f"   购买方: 未找到")
        
        # 销售方
        seller_patterns = [
            r'销售方[：:]([^\n\s]+)',
            r'销.*?售.*?方[：:]([^\n]+)',
            r'销\s*售\s*方[：:]([^\n]+)'
        ]
        for pattern in seller_patterns:
            matches = re.findall(pattern, text)
            if matches:
                print(f"   销售方: {matches[0].strip()}")
                break
        else:
            print(f"   销售方: 未找到")

def main():
    """主函数"""
    # 测试已知有问题的文件
    problem_files = [
        "25442000000101203423.pdf",  # Unicode问题
        "25432000000031789815.pdf"   # 空格问题
    ]
    
    for file_name in problem_files:
        test_specific_file(file_name)
        print(f"\n" + "="*80 + "\n")

if __name__ == "__main__":
    main()