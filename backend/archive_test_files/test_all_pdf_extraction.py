#!/usr/bin/env python3
"""
测试downloads目录下所有PDF的文本提取
"""

import sys
from pathlib import Path
import subprocess
import pdfplumber
from pdfminer.high_level import extract_text as pdfminer_extract

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def test_pdf_extraction(pdf_path):
    """测试单个PDF的多种提取方法"""
    print(f"\n{'='*80}")
    print(f"📄 文件: {pdf_path.name}")
    print(f"{'='*80}")
    
    results = {}
    
    # 1. pdftotext命令（invoice2data默认）
    try:
        cmd = ["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_path), "-"]
        out, err = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
        text = out.decode('utf-8')
        results['pdftotext'] = {
            'success': True,
            'length': len(text),
            'preview': text[:200].replace('\n', '\\n'),
            'has_unicode_issue': '⼦' in text or '⼀' in text,
            'has_space_issue': '发 票 号 码' in text or '购 买 方' in text
        }
    except Exception as e:
        results['pdftotext'] = {'success': False, 'error': str(e)}
    
    # 2. pdfplumber
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
        results['pdfplumber'] = {
            'success': True,
            'length': len(text),
            'preview': text[:200].replace('\n', '\\n'),
            'has_unicode_issue': '⼦' in text or '⼀' in text,
            'has_space_issue': '发 票 号 码' in text or '购 买 方' in text
        }
    except Exception as e:
        results['pdfplumber'] = {'success': False, 'error': str(e)}
    
    # 3. pdfminer
    try:
        text = pdfminer_extract(str(pdf_path))
        results['pdfminer'] = {
            'success': True,
            'length': len(text),
            'preview': text[:200].replace('\n', '\\n'),
            'has_unicode_issue': '⼦' in text or '⼀' in text,
            'has_space_issue': '发 票 号 码' in text or '购 买 方' in text
        }
    except Exception as e:
        results['pdfminer'] = {'success': False, 'error': str(e)}
    
    # 打印结果
    for method, result in results.items():
        print(f"\n🔧 {method}:")
        if result['success']:
            print(f"   ✅ 成功提取，文本长度: {result['length']}")
            print(f"   预览: {result['preview']}")
            if result.get('has_unicode_issue'):
                print(f"   ⚠️  发现Unicode变体字符")
            if result.get('has_space_issue'):
                print(f"   ⚠️  发现空格问题")
        else:
            print(f"   ❌ 失败: {result['error']}")
    
    # 查找关键信息
    if any(r['success'] for r in results.values()):
        print(f"\n📍 关键信息检测:")
        # 使用第一个成功的方法的文本
        for method, result in results.items():
            if result['success']:
                text = None
                if method == 'pdftotext':
                    cmd = ["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_path), "-"]
                    out, _ = subprocess.Popen(cmd, stdout=subprocess.PIPE).communicate()
                    text = out.decode('utf-8')
                elif method == 'pdfplumber':
                    with pdfplumber.open(pdf_path) as pdf:
                        text = '\n'.join(page.extract_text() or '' for page in pdf.pages)
                elif method == 'pdfminer':
                    text = pdfminer_extract(str(pdf_path))
                
                if text:
                    # 检测发票类型
                    if '电子客票' in text or '12306' in text:
                        print(f"   🚄 火车票")
                    elif '增值税' in text or '普通发票' in text:
                        print(f"   🧾 增值税发票")
                    elif '餐饮' in text or '住宿' in text:
                        print(f"   🍽️  服务业发票")
                    
                    # 查找发票号码（各种格式）
                    import re
                    invoice_numbers = re.findall(r'\d{20}', text)
                    if invoice_numbers:
                        print(f"   发票号码: {invoice_numbers[0]}")
                    
                    # 查找日期
                    dates = re.findall(r'\d{4}年\d{1,2}月\d{1,2}日', text)
                    if dates:
                        print(f"   日期: {dates[0]}")
                    
                    # 查找金额
                    amounts = re.findall(r'[¥￥]\s*[\d,]+\.?\d*', text)
                    if amounts:
                        print(f"   金额: {amounts[0]}")
                break


def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    
    if not downloads_dir.exists():
        print(f"❌ 目录不存在: {downloads_dir}")
        return
    
    # 获取所有PDF文件
    pdf_files = list(downloads_dir.glob("*.pdf"))
    
    if not pdf_files:
        print(f"❌ 在 {downloads_dir} 中没有找到PDF文件")
        return
    
    print(f"🔍 在 {downloads_dir} 中找到 {len(pdf_files)} 个PDF文件")
    print("开始测试文本提取...\n")
    
    # 测试每个PDF
    for pdf_file in sorted(pdf_files):
        test_pdf_extraction(pdf_file)
    
    print(f"\n\n📊 测试完成")
    print(f"总共测试了 {len(pdf_files)} 个PDF文件")


if __name__ == "__main__":
    main()