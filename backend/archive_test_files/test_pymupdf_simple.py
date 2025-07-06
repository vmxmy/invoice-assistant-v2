#!/usr/bin/env python3
"""
简化的PyMuPDF测试 - 专注于文本提取对比
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

def compare_engines(pdf_path, templates_dir):
    """对比两个引擎的提取效果"""
    
    print(f"🔍 测试文件: {pdf_path.name}")
    print(f"=" * 60)
    
    # 加载模板
    custom_templates = read_templates(str(templates_dir))
    
    # 测试PyMuPDF
    try:
        from app.services.ocr import pymupdf_input
        result = extract_data(str(pdf_path), templates=custom_templates, input_module=pymupdf_input)
        
        if result:
            print(f"✅ PyMuPDF提取成功:")
            for key, value in result.items():
                if key != 'template':
                    print(f"   {key}: {value}")
        else:
            print(f"❌ PyMuPDF提取失败")
        
        return True
        
    except Exception as e:
        print(f"❌ PyMuPDF异常: {e}")
        return False

def test_text_extraction(pdf_path):
    """测试文本提取质量"""
    print(f"\n📄 文本提取对比:")
    print(f"-" * 40)
    
    # PyMuPDF文本提取
    try:
        from app.services.ocr.pymupdf_input import to_text
        pymupdf_text = to_text(str(pdf_path))
        
        print(f"PyMuPDF文本长度: {len(pymupdf_text)}")
        
        # 检查关键问题
        has_unicode_issue = '⼦' in pymupdf_text
        has_space_issue = '发 票 号 码' in pymupdf_text or '开 票 日 期' in pymupdf_text
        
        print(f"Unicode问题: {'❌ 存在' if has_unicode_issue else '✅ 已修复'}")
        print(f"空格问题: {'❌ 存在' if has_space_issue else '✅ 已修复'}")
        
        # 显示前几行
        lines = pymupdf_text.split('\n')[:10]
        print(f"\n前10行文本:")
        for i, line in enumerate(lines):
            if line.strip():
                print(f"  {i+1}: {line[:80]}...")
        
        return pymupdf_text
        
    except Exception as e:
        print(f"❌ 文本提取失败: {e}")
        return None

def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    templates_dir = Path(__file__).parent / "app/services/ocr/templates"
    
    # 测试文件
    test_files = [
        "25442000000101203423.pdf",  # Unicode问题文件
        "25432000000031789815.pdf",  # 空格问题文件
        "25359134169000052039.pdf"   # 火车票文件
    ]
    
    print(f"🚀 PyMuPDF提取效果测试")
    print(f"=" * 60)
    
    success_count = 0
    total_count = 0
    
    for file_name in test_files:
        pdf_path = downloads_dir / file_name
        
        if not pdf_path.exists():
            print(f"⚠️ 跳过不存在的文件: {file_name}")
            continue
        
        total_count += 1
        print(f"\n" + "="*60)
        
        # 文本提取测试
        text = test_text_extraction(pdf_path)
        
        if text:
            # invoice2data提取测试
            if compare_engines(pdf_path, templates_dir):
                success_count += 1
    
    print(f"\n" + "="*60)
    print(f"🎉 测试完成!")
    print(f"成功率: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")

if __name__ == "__main__":
    main()