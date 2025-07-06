#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
调试冒号结构 - 深入分析PyMuPDF提取的实际文本结构
"""

import pymupdf
import re
from pathlib import Path

def analyze_colon_context(text, window=50):
    """分析冒号周围的上下文"""
    colon_patterns = ['：', ':', '∶', '﹕', '︰']
    
    contexts = []
    for colon in colon_patterns:
        for match in re.finditer(re.escape(colon), text):
            start = max(0, match.start() - window)
            end = min(len(text), match.end() + window)
            context = text[start:end]
            contexts.append({
                'colon': colon,
                'position': match.start(),
                'context': context,
                'context_repr': repr(context)
            })
    
    return contexts

def debug_pdf_structure():
    """调试PDF文本的实际结构"""
    
    test_file = "downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    if not Path(test_file).exists():
        print(f"文件不存在: {test_file}")
        return
    
    print(f"=== 调试文件: {Path(test_file).name} ===")
    
    try:
        doc = pymupdf.open(test_file)
        page = doc[0]
        
        # 获取原始文本
        original_text = page.get_text()
        
        print("=== 原始文本结构分析 ===")
        print(f"文本长度: {len(original_text)}")
        
        # 查找所有冒号及其上下文
        colon_contexts = analyze_colon_context(original_text, window=30)
        
        print(f"\n找到 {len(colon_contexts)} 个冒号:")
        for i, ctx in enumerate(colon_contexts[:10]):  # 只显示前10个
            print(f"{i+1}. 冒号'{ctx['colon']}'在位置{ctx['position']}:")
            print(f"   上下文: {ctx['context_repr']}")
        
        # 特别关注名称和税号字段
        key_patterns = [
            (r'名称[：:].{0,50}', "名称字段"),
            (r'统一社会信用代码[：:].{0,50}', "税号字段"),
            (r'发票号码[：:].{0,30}', "发票号码字段"),
            (r'开票日期[：:].{0,30}', "开票日期字段")
        ]
        
        print(f"\n=== 关键字段分析 ===")
        for pattern, desc in key_patterns:
            matches = re.findall(pattern, original_text)
            print(f"{desc}: 找到{len(matches)}个匹配")
            for j, match in enumerate(matches[:3]):  # 显示前3个
                print(f"  {j+1}: {repr(match)}")
        
        # 查看文本的实际行结构
        lines = original_text.split('\n')
        print(f"\n=== 文本行结构 ===")
        print(f"总行数: {len(lines)}")
        
        # 查找包含关键词的行
        key_lines = []
        for i, line in enumerate(lines):
            if any(keyword in line for keyword in ['名称', '统一社会信用代码', '发票号码', '开票日期']):
                key_lines.append((i, line))
        
        print(f"包含关键词的行:")
        for line_num, line_content in key_lines[:10]:
            print(f"  行{line_num}: {repr(line_content)}")
        
        # 尝试应用冒号换行移除
        def remove_colon_newlines(text):
            # 移除所有格式冒号后的换行
            for colon in ['：', ':', '∶', '﹕', '︰']:
                text = re.sub(f'{re.escape(colon)}\\s*\\n+\\s*', f'{colon} ', text)
            return text
        
        processed_text = remove_colon_newlines(original_text)
        
        print(f"\n=== 处理后效果对比 ===")
        print("处理后的关键字段:")
        for pattern, desc in key_patterns:
            matches = re.findall(pattern, processed_text)
            print(f"{desc}: 找到{len(matches)}个匹配")
            for j, match in enumerate(matches[:3]):
                print(f"  {j+1}: {repr(match)}")
        
        # 检查实际的公司名称和税号在文本中的位置
        company_name = "杭州趣链科技有限公司"
        tax_id = "91330108MA27Y5XH5G"
        
        print(f"\n=== 目标数据定位 ===")
        
        company_pos = original_text.find(company_name)
        if company_pos >= 0:
            start = max(0, company_pos - 50)
            end = min(len(original_text), company_pos + len(company_name) + 50)
            context = original_text[start:end]
            print(f"公司名称上下文: {repr(context)}")
        
        tax_pos = original_text.find(tax_id)
        if tax_pos >= 0:
            start = max(0, tax_pos - 50)
            end = min(len(original_text), tax_pos + len(tax_id) + 50)
            context = original_text[start:end]
            print(f"税号上下文: {repr(context)}")
        
        doc.close()
        
    except Exception as e:
        print(f"处理失败: {e}")

if __name__ == "__main__":
    debug_pdf_structure()