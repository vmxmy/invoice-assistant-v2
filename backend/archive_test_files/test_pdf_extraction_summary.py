#!/usr/bin/env python3
"""
测试并总结PDF文本提取情况
"""

import sys
from pathlib import Path
import subprocess
import pdfplumber
from collections import defaultdict

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def analyze_pdf(pdf_path):
    """分析单个PDF"""
    results = {}
    
    # 使用pdftotext（invoice2data默认）
    try:
        cmd = ["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_path), "-"]
        out, err = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
        text = out.decode('utf-8')
        
        # 检测问题
        has_unicode = '⼦' in text or '⼀' in text or '⼋' in text
        has_space = '发 票 号 码' in text or '购 买 方' in text or '销 售 方' in text
        
        # 检测发票类型
        if '电子客票' in text or '12306' in text:
            invoice_type = '火车票'
        elif '增值税' in text and '发票' in text:
            invoice_type = '增值税发票'
        elif '普通发票' in text:
            invoice_type = '普通发票'
        else:
            invoice_type = '其他'
        
        results = {
            'success': True,
            'length': len(text),
            'has_unicode_issue': has_unicode,
            'has_space_issue': has_space,
            'invoice_type': invoice_type
        }
    except Exception as e:
        results = {'success': False, 'error': str(e)}
    
    return results


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
    
    print(f"📊 PDF文本提取分析报告")
    print(f"=" * 80)
    print(f"目录: {downloads_dir}")
    print(f"文件数: {len(pdf_files)}")
    print(f"\n")
    
    # 统计信息
    stats = {
        'total': len(pdf_files),
        'success': 0,
        'failed': 0,
        'unicode_issues': 0,
        'space_issues': 0,
        'types': defaultdict(int)
    }
    
    # 分析每个PDF
    problem_files = []
    
    for pdf_file in sorted(pdf_files):
        result = analyze_pdf(pdf_file)
        
        if result['success']:
            stats['success'] += 1
            stats['types'][result['invoice_type']] += 1
            
            if result['has_unicode_issue']:
                stats['unicode_issues'] += 1
                problem_files.append((pdf_file.name, 'Unicode问题'))
            
            if result['has_space_issue']:
                stats['space_issues'] += 1
                if not result['has_unicode_issue']:
                    problem_files.append((pdf_file.name, '空格问题'))
        else:
            stats['failed'] += 1
            problem_files.append((pdf_file.name, f"提取失败: {result['error']}"))
    
    # 打印统计结果
    print(f"📈 提取统计:")
    print(f"   成功: {stats['success']}/{stats['total']}")
    print(f"   失败: {stats['failed']}/{stats['total']}")
    print(f"\n")
    
    print(f"🏷️  发票类型分布:")
    for invoice_type, count in stats['types'].items():
        print(f"   {invoice_type}: {count}")
    print(f"\n")
    
    print(f"⚠️  问题统计:")
    print(f"   Unicode编码问题: {stats['unicode_issues']}")
    print(f"   空格问题: {stats['space_issues']}")
    print(f"\n")
    
    if problem_files:
        print(f"❌ 问题文件列表:")
        for filename, issue in problem_files[:10]:  # 只显示前10个
            print(f"   {filename}: {issue}")
        
        if len(problem_files) > 10:
            print(f"   ... 还有 {len(problem_files) - 10} 个文件")
    else:
        print(f"✅ 所有文件提取正常")
    
    # 分析Unicode问题的模式
    if stats['unicode_issues'] > 0:
        print(f"\n\n🔍 Unicode问题分析:")
        # 检查一个有问题的文件
        for pdf_file in sorted(pdf_files):
            result = analyze_pdf(pdf_file)
            if result['success'] and result['has_unicode_issue']:
                cmd = ["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_file), "-"]
                out, _ = subprocess.Popen(cmd, stdout=subprocess.PIPE).communicate()
                text = out.decode('utf-8')
                
                # 查找具体的Unicode问题字符
                unicode_chars = []
                char_map = {'⼦': '子', '⼀': '一', '⼆': '二', '⼋': '八', '⼊': '入'}
                for old, new in char_map.items():
                    if old in text:
                        unicode_chars.append(f"{old}→{new}")
                
                if unicode_chars:
                    print(f"   示例文件: {pdf_file.name}")
                    print(f"   发现的Unicode变体: {', '.join(unicode_chars[:5])}")
                break


if __name__ == "__main__":
    main()