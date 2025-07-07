#!/usr/bin/env python3
"""
修复PyMuPDF表格提取问题并深度对比不同提取方法
"""

import sys
import fitz  # PyMuPDF
import pdfplumber
import pymupdf4llm
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import re

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def extract_with_pymupdf_tables_fixed(pdf_path: str) -> Dict[str, Any]:
    """修复的PyMuPDF表格提取"""
    doc = fitz.open(pdf_path)
    result = {
        'method': 'PyMuPDF Tables (Fixed)',
        'pages': []
    }
    
    for page_num in range(doc.page_count):
        page = doc[page_num]
        page_result = {
            'page_num': page_num,
            'tables': [],
            'text_outside_tables': page.get_text("text")
        }
        
        try:
            # 修复：正确使用find_tables()
            table_finder = page.find_tables()
            tables = list(table_finder)  # 转换为列表
            print(f"   页面 {page_num}: 发现 {len(tables)} 个表格")
            
            for table_idx, table in enumerate(tables):
                try:
                    table_data = table.extract()
                    if table_data:  # 确保有数据
                        page_result['tables'].append({
                            'table_index': table_idx,
                            'bbox': table.bbox,
                            'rows': len(table_data),
                            'cols': len(table_data[0]) if table_data else 0,
                            'data': table_data,
                            'sample_data': table_data[:3] if len(table_data) > 0 else []  # 前3行作为示例
                        })
                except Exception as e:
                    print(f"     表格 {table_idx} 提取失败: {e}")
                    
        except Exception as e:
            print(f"   页面 {page_num} 表格查找失败: {e}")
        
        result['pages'].append(page_result)
    
    doc.close()
    return result

def analyze_markdown_structure(markdown_text: str) -> Dict[str, Any]:
    """深度分析Markdown结构"""
    lines = markdown_text.split('\n')
    
    analysis = {
        'total_lines': len(lines),
        'structure': {
            'headers': [],
            'tables': [],
            'lists': [],
            'code_blocks': [],
            'emphasis': []
        },
        'invoice_fields': {}
    }
    
    # 分析结构元素
    in_table = False
    current_table = []
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # 标题
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            analysis['structure']['headers'].append({
                'level': level,
                'text': line.strip('#').strip(),
                'line_num': i
            })
        
        # 表格
        elif '|' in line and line.count('|') >= 2:
            if not in_table:
                in_table = True
                current_table = []
            current_table.append(line)
        else:
            if in_table and current_table:
                analysis['structure']['tables'].append({
                    'rows': len(current_table),
                    'start_line': i - len(current_table),
                    'data': current_table
                })
                current_table = []
                in_table = False
        
        # 列表
        if line.startswith('-') or line.startswith('*') or re.match(r'^\d+\.', line):
            analysis['structure']['lists'].append({
                'text': line,
                'line_num': i
            })
        
        # 代码块
        if line.startswith('```'):
            analysis['structure']['code_blocks'].append({
                'line_num': i,
                'text': line
            })
        
        # 强调文本
        if '**' in line or '*' in line:
            analysis['structure']['emphasis'].append({
                'text': line,
                'line_num': i
            })
    
    # 提取发票关键信息
    full_text = markdown_text
    
    # 发票号码
    invoice_num_match = re.search(r'发票号码[：:]\s*(\d+)', full_text)
    if invoice_num_match:
        analysis['invoice_fields']['invoice_number'] = invoice_num_match.group(1)
    
    # 开票日期
    date_match = re.search(r'开票日期[：:]\s*(\d{4}年\d{1,2}月\d{1,2}日)', full_text)
    if date_match:
        analysis['invoice_fields']['date'] = date_match.group(1)
    
    # 金额
    amount_matches = re.findall(r'[￥¥]\s*([0-9,]+\.?\d*)', full_text)
    if amount_matches:
        analysis['invoice_fields']['amounts'] = amount_matches
    
    # 公司名称
    company_matches = re.findall(r'名称[：:]([^｜|\n]+)', full_text)
    if company_matches:
        analysis['invoice_fields']['companies'] = [c.strip() for c in company_matches]
    
    return analysis

def extract_structured_data_from_tables(tables_data: List[Dict]) -> Dict[str, Any]:
    """从表格数据中提取结构化信息"""
    structured = {
        'buyer_info': {},
        'seller_info': {},
        'invoice_items': [],
        'summary': {}
    }
    
    for table in tables_data:
        if not table.get('data'):
            continue
            
        table_data = table['data']
        
        # 分析表格内容类型
        table_text = ' '.join([' '.join(row) if row else '' for row in table_data])
        
        # 购买方/销售方信息表格
        if '购买方' in table_text or '销售方' in table_text:
            for row in table_data:
                if not row:
                    continue
                row_text = ' '.join(str(cell) if cell else '' for cell in row)
                
                # 提取名称
                if '名称' in row_text:
                    name_match = re.search(r'名称[：:]([^统一社会信用代码｜|\n]+)', row_text)
                    if name_match:
                        name = name_match.group(1).strip()
                        if '购买方' in table_text:
                            structured['buyer_info']['name'] = name
                        elif '销售方' in table_text:
                            structured['seller_info']['name'] = name
                
                # 提取税号
                if '统一社会信用代码' in row_text or '纳税人识别号' in row_text:
                    tax_id_match = re.search(r'[：:]([A-Z0-9]{15,18})', row_text)
                    if tax_id_match:
                        tax_id = tax_id_match.group(1)
                        if '购买方' in table_text:
                            structured['buyer_info']['tax_id'] = tax_id
                        elif '销售方' in table_text:
                            structured['seller_info']['tax_id'] = tax_id
        
        # 发票明细表格
        elif any('货物' in str(cell) or '服务' in str(cell) or '规格' in str(cell) for row in table_data for cell in (row or []) if cell):
            # 跳过表头，提取明细行
            for i, row in enumerate(table_data[1:], 1):  # 跳过第一行表头
                if row and any(cell and str(cell).strip() for cell in row):
                    item = {
                        'index': i,
                        'description': str(row[0]) if len(row) > 0 and row[0] else '',
                        'specification': str(row[1]) if len(row) > 1 and row[1] else '',
                        'unit': str(row[2]) if len(row) > 2 and row[2] else '',
                        'quantity': str(row[3]) if len(row) > 3 and row[3] else '',
                        'price': str(row[4]) if len(row) > 4 and row[4] else '',
                        'amount': str(row[5]) if len(row) > 5 and row[5] else ''
                    }
                    structured['invoice_items'].append(item)
    
    return structured

def comprehensive_comparison(pdf_path: str) -> Dict[str, Any]:
    """综合对比分析"""
    print(f"\n🔬 深度分析: {Path(pdf_path).name}")
    print("=" * 50)
    
    results = {
        'file_name': Path(pdf_path).name,
        'methods': {}
    }
    
    # 1. 修复后的PyMuPDF表格提取
    print("1️⃣ PyMuPDF表格提取 (修复版):")
    try:
        pymupdf_result = extract_with_pymupdf_tables_fixed(pdf_path)
        results['methods']['pymupdf_tables'] = pymupdf_result
        
        if pymupdf_result['pages'] and pymupdf_result['pages'][0]['tables']:
            table_count = len(pymupdf_result['pages'][0]['tables'])
            print(f"   ✅ 成功提取 {table_count} 个表格")
            
            # 提取结构化数据
            structured_data = extract_structured_data_from_tables(pymupdf_result['pages'][0]['tables'])
            results['methods']['pymupdf_tables']['structured_data'] = structured_data
            
            # 显示表格样本
            for i, table in enumerate(pymupdf_result['pages'][0]['tables'][:2]):  # 显示前2个表格
                print(f"   表格 {i}: {table['rows']}行 x {table['cols']}列")
                if table.get('sample_data'):
                    print(f"     样本数据: {table['sample_data'][0] if table['sample_data'] else 'N/A'}")
        else:
            print("   ⚠️ 未发现表格结构")
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        results['methods']['pymupdf_tables'] = {'error': str(e)}
    
    # 2. PyMuPDF4LLM深度分析
    print("\n2️⃣ PyMuPDF4LLM深度分析:")
    try:
        md_text = pymupdf4llm.to_markdown(pdf_path, write_images=False)
        md_analysis = analyze_markdown_structure(md_text)
        
        results['methods']['pymupdf4llm'] = {
            'markdown': md_text,
            'analysis': md_analysis
        }
        
        print(f"   ✅ Markdown长度: {len(md_text)}")
        print(f"   📊 结构分析:")
        print(f"     - 标题: {len(md_analysis['structure']['headers'])}个")
        print(f"     - 表格: {len(md_analysis['structure']['tables'])}个") 
        print(f"     - 列表: {len(md_analysis['structure']['lists'])}个")
        print(f"   🔍 发票字段:")
        for field, value in md_analysis['invoice_fields'].items():
            print(f"     - {field}: {value}")
            
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        results['methods']['pymupdf4llm'] = {'error': str(e)}
    
    # 3. pdfplumber详细分析
    print("\n3️⃣ pdfplumber详细分析:")
    try:
        with pdfplumber.open(pdf_path) as pdf:
            page = pdf.pages[0]
            
            # 提取文本和表格
            text = page.extract_text()
            tables = page.extract_tables()
            
            # 分析表格质量
            table_quality = []
            for i, table in enumerate(tables):
                if table:
                    non_empty_cells = sum(1 for row in table for cell in (row or []) if cell and str(cell).strip())
                    total_cells = sum(len(row) if row else 0 for row in table)
                    density = non_empty_cells / total_cells if total_cells > 0 else 0
                    
                    table_quality.append({
                        'index': i,
                        'rows': len(table),
                        'cols': len(table[0]) if table and table[0] else 0,
                        'density': density,
                        'sample': table[0] if table else None
                    })
            
            results['methods']['pdfplumber'] = {
                'text_length': len(text),
                'table_count': len(tables),
                'table_quality': table_quality,
                'tables': tables
            }
            
            print(f"   ✅ 文本长度: {len(text)}")
            print(f"   📊 表格分析:")
            for quality in table_quality:
                print(f"     表格{quality['index']}: {quality['rows']}x{quality['cols']}, 密度{quality['density']:.1%}")
                
    except Exception as e:
        print(f"   ❌ 失败: {e}")
        results['methods']['pdfplumber'] = {'error': str(e)}
    
    return results

def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    
    # 测试文件
    test_files = [
        "25442000000101203423.pdf",  # 餐饮发票
        "25432000000031789815.pdf",  # 餐饮发票
        "25359134169000052039.pdf"   # 火车票
    ]
    
    print("🔬 深度PDF提取方法对比分析")
    print("=" * 60)
    
    all_results = []
    
    for file_name in test_files:
        pdf_path = downloads_dir / file_name
        
        if not pdf_path.exists():
            print(f"⚠️ 跳过不存在的文件: {file_name}")
            continue
        
        result = comprehensive_comparison(str(pdf_path))
        all_results.append(result)
    
    # 总结分析
    print(f"\n🎯 总结分析")
    print("=" * 60)
    
    # 统计各方法的成功率
    method_stats = {}
    for result in all_results:
        for method_name, method_data in result['methods'].items():
            if method_name not in method_stats:
                method_stats[method_name] = {'success': 0, 'total': 0}
            
            method_stats[method_name]['total'] += 1
            if 'error' not in method_data:
                method_stats[method_name]['success'] += 1
    
    print("📊 方法成功率:")
    for method, stats in method_stats.items():
        rate = stats['success'] / stats['total'] * 100
        print(f"   {method}: {stats['success']}/{stats['total']} ({rate:.1f}%)")
    
    print("\n🏆 推荐策略:")
    print("1. PyMuPDF4LLM: 最适合LLM后处理，保留完整结构信息")
    print("2. 当前PyMuPDF: 适合传统模板匹配，已优化中文处理")  
    print("3. pdfplumber: 表格提取稳定，适合结构化数据")
    print("4. PyMuPDF表格: 在简单表格场景下有优势")

if __name__ == "__main__":
    main()