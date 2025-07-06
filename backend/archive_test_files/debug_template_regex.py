#!/usr/bin/env python3
"""
调试模板regex匹配问题
"""

import sys
from pathlib import Path
import re

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def debug_regex_matching(pdf_path):
    """调试regex匹配问题"""
    
    print(f"🔍 调试文件: {pdf_path.name}")
    print(f"=" * 60)
    
    # 获取PyMuPDF提取的文本
    from app.services.ocr.pymupdf_input import to_text
    text = to_text(str(pdf_path))
    
    print(f"📄 文本长度: {len(text)}")
    print(f"前20行文本:")
    lines = text.split('\n')
    for i, line in enumerate(lines[:20]):
        if line.strip():
            print(f"  {i+1:2d}: {repr(line)}")
    
    print(f"\n🔍 关键字段调试:")
    print(f"-" * 40)
    
    # 测试发票号码regex
    print(f"1. 发票号码匹配测试:")
    
    # 当前模板regex
    current_regex = r'发票号码:\s*(\d+)'
    matches = re.findall(current_regex, text)
    print(f"   当前regex: {current_regex}")
    print(f"   匹配结果: {matches}")
    
    # 改进的regex - 支持中文冒号
    improved_regex = r'发票号码[：:]\s*(\d+)'
    matches = re.findall(improved_regex, text)
    print(f"   改进regex: {improved_regex}")
    print(f"   匹配结果: {matches}")
    
    # 更宽松的regex
    loose_regex = r'发票号码[：:].*?(\d{15,25})'
    matches = re.findall(loose_regex, text)
    print(f"   宽松regex: {loose_regex}")
    print(f"   匹配结果: {matches}")
    
    # 测试开票日期regex
    print(f"\n2. 开票日期匹配测试:")
    
    # 当前模板regex
    current_regex = r'开票日期:\s*(\d{4}年\d{1,2}月\d{1,2}日)'
    matches = re.findall(current_regex, text)
    print(f"   当前regex: {current_regex}")
    print(f"   匹配结果: {matches}")
    
    # 改进的regex
    improved_regex = r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)'
    matches = re.findall(improved_regex, text)
    print(f"   改进regex: {improved_regex}")
    print(f"   匹配结果: {matches}")
    
    # 测试购买方信息
    print(f"\n3. 购买方信息匹配测试:")
    
    # 当前模板regex
    current_regex = r'购\s+名称：\s*([^\s]+(?:\s+[^\s]+)*?)(?=\s{3,}销)'
    matches = re.findall(current_regex, text)
    print(f"   当前regex: {current_regex}")
    print(f"   匹配结果: {matches}")
    
    # 改进的regex - 适配PyMuPDF格式
    improved_regex = r'购.*?名称[：:]\s*([^\n\s]+(?:\s+[^\n\s]+)*?)(?=\s+销)'
    matches = re.findall(improved_regex, text)
    print(f"   改进regex: {improved_regex}")
    print(f"   匹配结果: {matches}")
    
    # 简化regex
    simple_regex = r'购.*?名称[：:]\s*([^销\n]+?)(?=\s+销)'
    matches = re.findall(simple_regex, text)
    print(f"   简化regex: {simple_regex}")
    print(f"   匹配结果: {matches}")
    
    # 测试金额匹配
    print(f"\n4. 金额匹配测试:")
    
    # 当前模板regex
    current_regex = r'价税合计.*?[（(]\s*小写\s*[）)]\s*¥\s*([0-9,]+\.?\d*)'
    matches = re.findall(current_regex, text)
    print(f"   当前regex: {current_regex}")
    print(f"   匹配结果: {matches}")
    
    # 简化regex
    simple_regex = r'[（(]\s*小写\s*[）)]\s*¥\s*([0-9,]+\.?\d*)'
    matches = re.findall(simple_regex, text)
    print(f"   简化regex: {simple_regex}")
    print(f"   匹配结果: {matches}")
    
    # 更宽松的金额regex
    loose_regex = r'¥\s*([0-9,]+\.?\d+)'
    matches = re.findall(loose_regex, text)
    print(f"   宽松regex: {loose_regex}")
    print(f"   匹配结果: {matches[:3]}...")  # 只显示前3个

def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    
    # 测试普通发票文件
    test_files = [
        "25442000000101203423.pdf",  # Unicode问题文件
        "25432000000031789815.pdf"   # 空格问题文件
    ]
    
    for file_name in test_files:
        pdf_path = downloads_dir / file_name
        
        if not pdf_path.exists():
            print(f"⚠️ 跳过不存在的文件: {file_name}")
            continue
        
        debug_regex_matching(pdf_path)
        print(f"\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()