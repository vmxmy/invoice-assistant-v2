#!/usr/bin/env python3
"""分析PDF文件内容，提取共同关键词"""
import fitz  # PyMuPDF
import re
from pathlib import Path
from collections import Counter

def extract_text_from_pdf(pdf_path):
    """使用PyMuPDF提取PDF文本"""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text
    except Exception as e:
        print(f"读取PDF失败 {pdf_path}: {e}")
        return ""

def extract_keywords(text):
    """提取关键词和模式"""
    keywords = {
        "发票类型": [],
        "铁路相关": [],
        "车次格式": [],
        "特殊标识": [],
        "金额相关": [],
        "日期格式": [],
        "其他关键词": []
    }
    
    # 查找发票类型
    invoice_types = re.findall(r'(电子发票|铁路电子客票|火车票|客运票|全国铁路客运发票|铁路客票|电子客票)', text)
    keywords["发票类型"].extend(invoice_types)
    
    # 查找铁路相关词汇
    railway_words = re.findall(r'(铁路|火车|动车|高铁|列车|车次|座位|硬座|软座|硬卧|软卧|无座|站台|候车|检票|乘车|客运|运输)', text)
    keywords["铁路相关"].extend(railway_words)
    
    # 查找车次格式
    train_numbers = re.findall(r'[GDZTKCY]\d{1,4}', text)
    keywords["车次格式"].extend(train_numbers)
    
    # 查找特殊标识
    special_marks = re.findall(r'(限乘当日当次车|请妥善保管|报销凭证|换乘|中转|始发|终到|经由|区间)', text)
    keywords["特殊标识"].extend(special_marks)
    
    # 查找金额相关
    amounts = re.findall(r'(票价|金额|价格|费用|￥|¥|元)', text)
    keywords["金额相关"].extend(amounts)
    
    # 查找日期格式
    dates = re.findall(r'\d{4}[-年]\d{1,2}[-月]\d{1,2}[日]?', text)
    keywords["日期格式"].extend(dates[:3])  # 只保留前3个示例
    
    # 查找其他可能的关键词
    other_keywords = re.findall(r'(国家税务总局|12306|中国铁路|铁路总公司|售票|取票|退票|改签)', text)
    keywords["其他关键词"].extend(other_keywords)
    
    return keywords

def analyze_pdfs():
    """分析PDF文件"""
    failed_pdfs = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-35.50-25359134169000052039.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-57.50-25429165818000508973.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-556.00-25429165818000508972.pdf"
    ]
    
    success_pdfs = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局厦门市税务局-123.00-25949134178000153214.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-19-国家税务总局-186.50-25959165876000012546.pdf"
    ]
    
    print("=== 分析失败的PDF文件 ===\n")
    failed_keywords_all = []
    
    for i, pdf_path in enumerate(failed_pdfs, 1):
        print(f"\n--- 失败文件 {i}: {Path(pdf_path).name} ---")
        text = extract_text_from_pdf(pdf_path)
        print(f"文本长度: {len(text)} 字符")
        
        if text:
            # 打印前500个字符
            print("\n文本预览（前500字符）:")
            print("-" * 50)
            print(text[:500].replace('\n', ' '))
            print("-" * 50)
            
            keywords = extract_keywords(text)
            for category, items in keywords.items():
                if items:
                    print(f"\n{category}: {list(set(items))}")
            
            failed_keywords_all.append(keywords)
    
    print("\n\n=== 分析成功的PDF文件 ===\n")
    success_keywords_all = []
    
    for i, pdf_path in enumerate(success_pdfs, 1):
        print(f"\n--- 成功文件 {i}: {Path(pdf_path).name} ---")
        text = extract_text_from_pdf(pdf_path)
        print(f"文本长度: {len(text)} 字符")
        
        if text:
            # 打印前500个字符
            print("\n文本预览（前500字符）:")
            print("-" * 50)
            print(text[:500].replace('\n', ' '))
            print("-" * 50)
            
            keywords = extract_keywords(text)
            for category, items in keywords.items():
                if items:
                    print(f"\n{category}: {list(set(items))}")
            
            success_keywords_all.append(keywords)
    
    # 分析共同关键词
    print("\n\n=== 失败文件的共同关键词分析 ===")
    
    # 收集所有失败文件的关键词
    failed_common = {}
    for category in ["发票类型", "铁路相关", "特殊标识", "其他关键词"]:
        all_words = []
        for kw_dict in failed_keywords_all:
            all_words.extend(kw_dict.get(category, []))
        
        if all_words:
            # 统计词频
            word_count = Counter(all_words)
            # 找出在至少2个失败文件中出现的词
            common_words = [word for word, count in word_count.items() if count >= 2]
            if common_words:
                failed_common[category] = common_words
                print(f"\n{category}（至少出现2次）: {common_words}")
    
    # 对比成功文件缺少的关键词
    print("\n\n=== 成功文件缺少但失败文件有的关键词 ===")
    
    # 收集成功文件的所有关键词
    success_all_keywords = set()
    for kw_dict in success_keywords_all:
        for items in kw_dict.values():
            success_all_keywords.update(items)
    
    # 收集失败文件的所有关键词
    failed_all_keywords = set()
    for kw_dict in failed_keywords_all:
        for items in kw_dict.values():
            failed_all_keywords.update(items)
    
    unique_to_failed = failed_all_keywords - success_all_keywords
    if unique_to_failed:
        print(f"\n失败文件特有的关键词: {list(unique_to_failed)}")
    
    # 推荐的keywords配置
    print("\n\n=== 推荐的keywords配置 ===")
    print("建议在china_railway_ticket.yml中添加以下关键词：")
    print("keywords:")
    
    # 基于分析结果推荐关键词
    recommended_keywords = set()
    
    # 从失败文件的共同关键词中提取
    for category, words in failed_common.items():
        recommended_keywords.update(words)
    
    # 添加一些常见的铁路票据关键词
    recommended_keywords.update([
        "铁路电子客票",
        "电子客票",
        "火车票",
        "铁路客票",
        "全国铁路",
        "客运发票",
        "限乘当日当次车",
        "12306"
    ])
    
    for keyword in sorted(recommended_keywords):
        if keyword and len(keyword) > 1:  # 过滤掉空字符串和单字符
            print(f"  - '{keyword}'")

if __name__ == "__main__":
    analyze_pdfs()