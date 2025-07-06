#!/usr/bin/env python3
"""
对比PyMuPDF和pdftotext的文本提取效果
"""

import sys
from pathlib import Path
import subprocess
import fitz  # PyMuPDF
from collections import defaultdict
import difflib

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

def analyze_text_differences(text1, text2, title1="Text1", title2="Text2"):
    """分析两个文本的差异"""
    lines1 = text1.splitlines()
    lines2 = text2.splitlines()
    
    # 基本统计
    stats = {
        f'{title1}_lines': len(lines1),
        f'{title2}_lines': len(lines2),
        f'{title1}_chars': len(text1),
        f'{title2}_chars': len(text2),
        f'{title1}_words': len(text1.split()),
        f'{title2}_words': len(text2.split())
    }
    
    # 检查特定问题
    issues = {
        f'{title1}_unicode_issues': '⼦' in text1 or '⼀' in text1 or '⼋' in text1,
        f'{title2}_unicode_issues': '⼦' in text2 or '⼀' in text2 or '⼋' in text2,
        f'{title1}_space_issues': '发 票 号 码' in text1 or '购 买 方' in text1,
        f'{title2}_space_issues': '发 票 号 码' in text2 or '购 买 方' in text2
    }
    
    # 计算相似度
    similarity = difflib.SequenceMatcher(None, text1, text2).ratio()
    
    return stats, issues, similarity

def find_key_information(text):
    """查找关键信息"""
    import re
    
    info = {}
    
    # 发票号码
    invoice_numbers = re.findall(r'\d{20}', text)
    if invoice_numbers:
        info['invoice_number'] = invoice_numbers[0]
    
    # 日期
    dates = re.findall(r'\d{4}年\d{1,2}月\d{1,2}日', text)
    if dates:
        info['date'] = dates[0]
    
    # 金额
    amounts = re.findall(r'[¥￥]\s*[\d,]+\.?\d*', text)
    if amounts:
        info['amount'] = amounts[0]
    
    # 检测发票类型
    if '电子客票' in text or '12306' in text:
        info['type'] = '火车票'
    elif '增值税' in text and '发票' in text:
        info['type'] = '增值税发票'
    elif '普通发票' in text:
        info['type'] = '普通发票'
    else:
        info['type'] = '其他'
    
    return info

def test_single_pdf(pdf_path):
    """测试单个PDF文件"""
    print(f"\n{'='*80}")
    print(f"📄 测试文件: {pdf_path.name}")
    print(f"{'='*80}")
    
    # 提取文本
    pdftotext_result = extract_with_pdftotext(pdf_path)
    pymupdf_result = extract_with_pymupdf(pdf_path)
    
    # 检查是否有错误
    if pdftotext_result.startswith("ERROR"):
        print(f"❌ pdftotext失败: {pdftotext_result}")
        return None
    
    if pymupdf_result.startswith("ERROR"):
        print(f"❌ PyMuPDF失败: {pymupdf_result}")
        return None
    
    # 分析差异
    stats, issues, similarity = analyze_text_differences(
        pdftotext_result, pymupdf_result, "pdftotext", "PyMuPDF"
    )
    
    # 查找关键信息
    pdftotext_info = find_key_information(pdftotext_result)
    pymupdf_info = find_key_information(pymupdf_result)
    
    # 打印结果
    print(f"📊 基本统计:")
    print(f"   pdftotext: {stats['pdftotext_lines']}行, {stats['pdftotext_chars']}字符, {stats['pdftotext_words']}词")
    print(f"   PyMuPDF:   {stats['PyMuPDF_lines']}行, {stats['PyMuPDF_chars']}字符, {stats['PyMuPDF_words']}词")
    print(f"   文本相似度: {similarity:.3f}")
    
    print(f"\n⚠️  问题检测:")
    print(f"   pdftotext Unicode问题: {'是' if issues['pdftotext_unicode_issues'] else '否'}")
    print(f"   PyMuPDF Unicode问题:   {'是' if issues['PyMuPDF_unicode_issues'] else '否'}")
    print(f"   pdftotext 空格问题:    {'是' if issues['pdftotext_space_issues'] else '否'}")
    print(f"   PyMuPDF 空格问题:      {'是' if issues['PyMuPDF_space_issues'] else '否'}")
    
    print(f"\n🔍 关键信息提取对比:")
    print(f"   发票类型:")
    print(f"     pdftotext: {pdftotext_info.get('type', '未识别')}")
    print(f"     PyMuPDF:   {pymupdf_info.get('type', '未识别')}")
    
    if 'invoice_number' in pdftotext_info or 'invoice_number' in pymupdf_info:
        print(f"   发票号码:")
        print(f"     pdftotext: {pdftotext_info.get('invoice_number', '未提取')}")
        print(f"     PyMuPDF:   {pymupdf_info.get('invoice_number', '未提取')}")
    
    if 'date' in pdftotext_info or 'date' in pymupdf_info:
        print(f"   开票日期:")
        print(f"     pdftotext: {pdftotext_info.get('date', '未提取')}")
        print(f"     PyMuPDF:   {pymupdf_info.get('date', '未提取')}")
    
    if 'amount' in pdftotext_info or 'amount' in pymupdf_info:
        print(f"   金额:")
        print(f"     pdftotext: {pdftotext_info.get('amount', '未提取')}")
        print(f"     PyMuPDF:   {pymupdf_info.get('amount', '未提取')}")
    
    # 如果相似度较低，显示详细差异
    if similarity < 0.9:
        print(f"\n🔍 文本差异分析 (相似度: {similarity:.3f}):")
        print(f"   两个引擎提取的文本存在较大差异，建议详细检查")
        
        # 显示前5行的对比
        pdftotext_lines = pdftotext_result.split('\n')[:5]
        pymupdf_lines = pymupdf_result.split('\n')[:5]
        
        print(f"\n   前5行对比:")
        print(f"   pdftotext:")
        for i, line in enumerate(pdftotext_lines):
            if line.strip():
                print(f"     {i+1}: {repr(line)}")
        
        print(f"\n   PyMuPDF:")
        for i, line in enumerate(pymupdf_lines):
            if line.strip():
                print(f"     {i+1}: {repr(line)}")
    
    return {
        'file': pdf_path.name,
        'stats': stats,
        'issues': issues,
        'similarity': similarity,
        'pdftotext_info': pdftotext_info,
        'pymupdf_info': pymupdf_info
    }

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
    
    print(f"🔬 PyMuPDF vs pdftotext 文本提取对比测试")
    print(f"=" * 80)
    print(f"测试目录: {downloads_dir}")
    print(f"PDF文件数: {len(pdf_files)}")
    
    # 测试每个PDF
    results = []
    for pdf_file in sorted(pdf_files)[:5]:  # 先测试前5个文件
        result = test_single_pdf(pdf_file)
        if result:
            results.append(result)
    
    # 汇总分析
    print(f"\n\n📈 汇总分析")
    print(f"=" * 80)
    
    if results:
        # 统计问题文件
        pdftotext_unicode_issues = sum(1 for r in results if r['issues']['pdftotext_unicode_issues'])
        pymupdf_unicode_issues = sum(1 for r in results if r['issues']['PyMuPDF_unicode_issues'])
        pdftotext_space_issues = sum(1 for r in results if r['issues']['pdftotext_space_issues'])
        pymupdf_space_issues = sum(1 for r in results if r['issues']['PyMuPDF_space_issues'])
        
        print(f"📊 问题统计 (测试了{len(results)}个文件):")
        print(f"   Unicode编码问题:")
        print(f"     pdftotext: {pdftotext_unicode_issues} 个文件")
        print(f"     PyMuPDF:   {pymupdf_unicode_issues} 个文件")
        print(f"   空格分割问题:")
        print(f"     pdftotext: {pdftotext_space_issues} 个文件")
        print(f"     PyMuPDF:   {pymupdf_space_issues} 个文件")
        
        # 平均相似度
        avg_similarity = sum(r['similarity'] for r in results) / len(results)
        print(f"\n📈 平均文本相似度: {avg_similarity:.3f}")
        
        # 关键信息提取成功率对比
        pdftotext_extractions = sum(1 for r in results if r['pdftotext_info'].get('invoice_number'))
        pymupdf_extractions = sum(1 for r in results if r['pymupdf_info'].get('invoice_number'))
        
        print(f"\n🎯 关键信息提取成功率:")
        print(f"   发票号码提取:")
        print(f"     pdftotext: {pdftotext_extractions}/{len(results)} ({pdftotext_extractions/len(results)*100:.1f}%)")
        print(f"     PyMuPDF:   {pymupdf_extractions}/{len(results)} ({pymupdf_extractions/len(results)*100:.1f}%)")
        
        # 推荐
        print(f"\n💡 推荐:")
        if pymupdf_unicode_issues < pdftotext_unicode_issues:
            print(f"   ✅ PyMuPDF在Unicode处理方面更优")
        if pymupdf_space_issues < pdftotext_space_issues:
            print(f"   ✅ PyMuPDF在空格处理方面更优")
        if avg_similarity > 0.95:
            print(f"   ℹ️  两个引擎的文本提取结果高度相似")
        elif avg_similarity < 0.9:
            print(f"   ⚠️  两个引擎的文本提取结果存在显著差异，需要详细分析")

if __name__ == "__main__":
    main()