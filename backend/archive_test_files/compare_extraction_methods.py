#!/usr/bin/env python3
"""
对比不同PDF提取方法：
1. PyMuPDF表格提取
2. PyMuPDF4LLM Markdown提取  
3. pdfplumber表格提取
4. 现有的PyMuPDF文本提取
"""

import sys
import fitz  # PyMuPDF
import pdfplumber
import pymupdf4llm
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
from pprint import pprint

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

def extract_with_pymupdf_tables(pdf_path: str) -> Dict[str, Any]:
    """使用PyMuPDF提取表格"""
    doc = fitz.open(pdf_path)
    result = {
        'method': 'PyMuPDF Tables',
        'pages': []
    }
    
    for page_num in range(doc.page_count):
        page = doc[page_num]
        page_result = {
            'page_num': page_num,
            'tables': [],
            'text_outside_tables': page.get_text("text")
        }
        
        # 查找表格
        tables = page.find_tables()
        print(f"   页面 {page_num}: 发现 {len(tables)} 个表格")
        
        for table_idx, table in enumerate(tables):
            try:
                table_data = table.extract()
                page_result['tables'].append({
                    'table_index': table_idx,
                    'bbox': table.bbox,
                    'rows': len(table_data),
                    'cols': len(table_data[0]) if table_data else 0,
                    'data': table_data
                })
            except Exception as e:
                print(f"     表格 {table_idx} 提取失败: {e}")
        
        result['pages'].append(page_result)
    
    doc.close()
    return result

def extract_with_pymupdf4llm(pdf_path: str) -> Dict[str, Any]:
    """使用PyMuPDF4LLM提取Markdown"""
    result = {
        'method': 'PyMuPDF4LLM Markdown',
        'markdown': '',
        'error': None
    }
    
    try:
        # 提取为Markdown
        md_text = pymupdf4llm.to_markdown(pdf_path, write_images=False)
        result['markdown'] = md_text
        result['length'] = len(md_text)
        
        # 分析Markdown结构
        lines = md_text.split('\n')
        result['analysis'] = {
            'total_lines': len(lines),
            'table_lines': len([l for l in lines if '|' in l]),
            'header_lines': len([l for l in lines if l.startswith('#')]),
            'list_lines': len([l for l in lines if l.startswith('-') or l.startswith('*')]),
            'bold_text_count': md_text.count('**'),
            'italic_text_count': md_text.count('*') - md_text.count('**') * 2
        }
        
    except Exception as e:
        result['error'] = str(e)
    
    return result

def extract_with_pdfplumber(pdf_path: str) -> Dict[str, Any]:
    """使用pdfplumber提取表格"""
    result = {
        'method': 'pdfplumber',
        'pages': []
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            page_result = {
                'page_num': page_num,
                'tables': [],
                'text': page.extract_text()
            }
            
            # 提取表格
            tables = page.extract_tables()
            print(f"   页面 {page_num}: 发现 {len(tables)} 个表格")
            
            for table_idx, table in enumerate(tables):
                if table:
                    page_result['tables'].append({
                        'table_index': table_idx,
                        'rows': len(table),
                        'cols': len(table[0]) if table else 0,
                        'data': table
                    })
            
            result['pages'].append(page_result)
    
    return result

def extract_with_current_pymupdf(pdf_path: str) -> Dict[str, Any]:
    """使用当前的PyMuPDF文本提取方法"""
    from app.services.ocr.pymupdf_input import to_text
    
    result = {
        'method': 'Current PyMuPDF Text',
        'text': '',
        'error': None
    }
    
    try:
        text = to_text(pdf_path)
        result['text'] = text
        result['length'] = len(text)
        result['lines'] = len(text.split('\n'))
    except Exception as e:
        result['error'] = str(e)
    
    return result

def analyze_invoice_extraction(results: Dict[str, Any], file_name: str) -> Dict[str, Any]:
    """分析各种方法的发票信息提取效果"""
    analysis = {
        'file_name': file_name,
        'method_comparison': {},
        'field_extraction': {}
    }
    
    # 定义要提取的关键字段
    key_fields = {
        'invoice_number': ['发票号码', '号码'],
        'date': ['开票日期', '日期'],
        'amount': ['价税合计', '合计', '金额', '¥'],
        'buyer': ['购买方', '买方'],
        'seller': ['销售方', '卖方'],
        'tax_id': ['统一社会信用代码', '纳税人识别号']
    }
    
    for method_name, method_result in results.items():
        method_analysis = {
            'data_available': False,
            'structure_quality': 'unknown',
            'field_detection': {}
        }
        
        # 获取文本内容
        text_content = ""
        if method_name == 'pymupdf_tables':
            if method_result.get('pages'):
                text_content = method_result['pages'][0].get('text_outside_tables', '')
                method_analysis['data_available'] = True
                # 检查表格质量
                tables = method_result['pages'][0].get('tables', [])
                if tables:
                    method_analysis['structure_quality'] = 'good' if len(tables) > 0 else 'poor'
                    method_analysis['table_count'] = len(tables)
        
        elif method_name == 'pymupdf4llm':
            if not method_result.get('error'):
                text_content = method_result.get('markdown', '')
                method_analysis['data_available'] = True
                analysis_data = method_result.get('analysis', {})
                if analysis_data.get('table_lines', 0) > 0:
                    method_analysis['structure_quality'] = 'excellent'
                elif analysis_data.get('header_lines', 0) > 0:
                    method_analysis['structure_quality'] = 'good'
                else:
                    method_analysis['structure_quality'] = 'fair'
        
        elif method_name == 'pdfplumber':
            if method_result.get('pages'):
                text_content = method_result['pages'][0].get('text', '')
                method_analysis['data_available'] = True
                tables = method_result['pages'][0].get('tables', [])
                if tables:
                    method_analysis['structure_quality'] = 'good'
                    method_analysis['table_count'] = len(tables)
        
        elif method_name == 'current_pymupdf':
            if not method_result.get('error'):
                text_content = method_result.get('text', '')
                method_analysis['data_available'] = True
                method_analysis['structure_quality'] = 'basic'
        
        # 检测关键字段
        for field_name, keywords in key_fields.items():
            detected = any(keyword in text_content for keyword in keywords)
            method_analysis['field_detection'][field_name] = detected
        
        # 计算字段检测率
        detected_count = sum(method_analysis['field_detection'].values())
        method_analysis['field_detection_rate'] = detected_count / len(key_fields)
        
        analysis['method_comparison'][method_name] = method_analysis
    
    return analysis

def main():
    """主函数"""
    downloads_dir = Path("/Users/xumingyang/app/invoice_assist/downloads")
    
    # 测试文件
    test_files = [
        "25442000000101203423.pdf",  # 餐饮发票
        "25432000000031789815.pdf",  # 餐饮发票
        "25359134169000052039.pdf"   # 火车票
    ]
    
    print("🔍 PDF提取方法对比测试")
    print("=" * 60)
    print("测试方法:")
    print("1. PyMuPDF表格提取")
    print("2. PyMuPDF4LLM Markdown提取")
    print("3. pdfplumber表格提取")
    print("4. 当前PyMuPDF文本提取")
    
    all_analyses = []
    
    for file_name in test_files:
        pdf_path = downloads_dir / file_name
        
        if not pdf_path.exists():
            print(f"⚠️ 跳过不存在的文件: {file_name}")
            continue
        
        print(f"\n" + "=" * 60)
        print(f"📄 测试文件: {file_name}")
        print("=" * 60)
        
        results = {}
        
        # 1. PyMuPDF表格提取
        print("\n1️⃣ PyMuPDF表格提取:")
        try:
            results['pymupdf_tables'] = extract_with_pymupdf_tables(str(pdf_path))
            print("   ✅ 提取成功")
        except Exception as e:
            print(f"   ❌ 提取失败: {e}")
            results['pymupdf_tables'] = {'error': str(e)}
        
        # 2. PyMuPDF4LLM Markdown提取
        print("\n2️⃣ PyMuPDF4LLM Markdown提取:")
        try:
            results['pymupdf4llm'] = extract_with_pymupdf4llm(str(pdf_path))
            if results['pymupdf4llm'].get('error'):
                print(f"   ❌ 提取失败: {results['pymupdf4llm']['error']}")
            else:
                print(f"   ✅ 提取成功，Markdown长度: {results['pymupdf4llm']['length']}")
                analysis = results['pymupdf4llm']['analysis']
                print(f"   📊 结构分析: 表格行{analysis['table_lines']}, 标题{analysis['header_lines']}")
        except Exception as e:
            print(f"   ❌ 提取失败: {e}")
            results['pymupdf4llm'] = {'error': str(e)}
        
        # 3. pdfplumber表格提取
        print("\n3️⃣ pdfplumber表格提取:")
        try:
            results['pdfplumber'] = extract_with_pdfplumber(str(pdf_path))
            print("   ✅ 提取成功")
        except Exception as e:
            print(f"   ❌ 提取失败: {e}")
            results['pdfplumber'] = {'error': str(e)}
        
        # 4. 当前PyMuPDF文本提取
        print("\n4️⃣ 当前PyMuPDF文本提取:")
        try:
            results['current_pymupdf'] = extract_with_current_pymupdf(str(pdf_path))
            if results['current_pymupdf'].get('error'):
                print(f"   ❌ 提取失败: {results['current_pymupdf']['error']}")
            else:
                print(f"   ✅ 提取成功，文本长度: {results['current_pymupdf']['length']}")
        except Exception as e:
            print(f"   ❌ 提取失败: {e}")
            results['current_pymupdf'] = {'error': str(e)}
        
        # 分析对比结果
        print(f"\n📊 提取效果分析:")
        analysis = analyze_invoice_extraction(results, file_name)
        
        for method, method_analysis in analysis['method_comparison'].items():
            if method_analysis['data_available']:
                rate = method_analysis['field_detection_rate']
                quality = method_analysis.get('structure_quality', 'unknown')
                print(f"   {method}: 字段检测率 {rate:.1%}, 结构质量 {quality}")
                if 'table_count' in method_analysis:
                    print(f"     表格数量: {method_analysis['table_count']}")
            else:
                print(f"   {method}: 数据提取失败")
        
        all_analyses.append(analysis)
        
        # 显示部分提取内容示例
        print(f"\n📝 内容示例 (前200字符):")
        for method_name, method_result in results.items():
            if method_name == 'pymupdf4llm' and not method_result.get('error'):
                content = method_result.get('markdown', '')[:200]
                print(f"   {method_name}: {content}...")
            elif method_name == 'current_pymupdf' and not method_result.get('error'):
                content = method_result.get('text', '')[:200]
                print(f"   {method_name}: {content}...")
    
    # 综合分析
    print(f"\n" + "🎯" * 20)
    print("📈 综合分析结果")
    print("=" * 60)
    
    if all_analyses:
        # 计算平均字段检测率
        method_names = list(all_analyses[0]['method_comparison'].keys())
        
        for method in method_names:
            rates = []
            available_count = 0
            
            for analysis in all_analyses:
                method_data = analysis['method_comparison'].get(method, {})
                if method_data.get('data_available'):
                    rates.append(method_data['field_detection_rate'])
                    available_count += 1
            
            if rates:
                avg_rate = sum(rates) / len(rates)
                print(f"{method}: 平均字段检测率 {avg_rate:.1%} ({available_count}/{len(all_analyses)} 文件成功)")
            else:
                print(f"{method}: 所有文件提取失败")
    
    print("\n🔍 方法特点对比:")
    print("- PyMuPDF表格: 擅长结构化表格数据提取")
    print("- PyMuPDF4LLM: 保留格式的Markdown输出，适合LLM处理")
    print("- pdfplumber: 传统表格提取，兼容性好")
    print("- 当前PyMuPDF: 经过优化的文本提取，适合模板匹配")

if __name__ == "__main__":
    main()