#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
优化的换行移除解决方案 - 修复垂直布局文本提取问题
"""

import re

def preprocess_text_for_extraction(text):
    """
    预处理文本，移除换行符并优化为适合正则提取的格式
    """
    # 1. 移除换行符，用空格替换
    processed_text = text.replace('\n', ' ')
    
    # 2. 合并多个连续空格为单个空格
    processed_text = re.sub(r'\s+', ' ', processed_text)
    
    # 3. 在重要分隔符前后添加空格，便于正则匹配
    separators = ['购买方', '销售方', '名称：', '统一社会信用代码', '发票号码', '开票日期']
    for sep in separators:
        processed_text = processed_text.replace(sep, f' {sep} ')
    
    # 4. 再次清理多余空格
    processed_text = re.sub(r'\s+', ' ', processed_text).strip()
    
    return processed_text

def get_improved_regex_patterns():
    """
    获取改进的正则表达式模式，适配移除换行后的文本
    """
    return {
        # 购买方名称 - 更精确的边界条件
        'buyer_name': r'购买方.*?名称[:：]\s*([^销售方]+?)(?=\s+(?:统一社会信用代码|销售方|项目名称|规格型号|¥|\d+|$))',
        
        # 销售方名称 - 更精确的边界条件  
        'seller_name': r'销售方.*?名称[:：]\s*([^购买方]+?)(?=\s+(?:统一社会信用代码|项目名称|规格型号|¥|\d+|$))',
        
        # 购买方税号 - 18位标准格式
        'buyer_tax_id': r'购买方.*?统一社会信用代码[/纳税人识别号]*[:：]\s*([A-Z0-9]{18})',
        
        # 销售方税号
        'seller_tax_id': r'销售方.*?统一社会信用代码[/纳税人识别号]*[:：]\s*([A-Z0-9]{18})',
        
        # 发票号码
        'invoice_number': r'发票号码[:：]\s*(\d+)',
        
        # 开票日期
        'invoice_date': r'开票日期[:：]\s*(\d{4}年\d{1,2}月\d{1,2}日)',
        
        # 金额
        'amount': r'(?:价税合计.*?小写.*?[¥￥]\s*|合\s*计.*?[¥￥]\s*)([0-9,]+\.?\d*)',
    }

def extract_fields_with_newline_removal(text):
    """
    使用移除换行符的方法提取字段
    """
    # 预处理文本
    processed_text = preprocess_text_for_extraction(text)
    
    # 获取改进的正则模式
    patterns = get_improved_regex_patterns()
    
    # 提取字段
    results = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, processed_text, re.IGNORECASE)
        if match:
            value = match.group(1).strip()
            # 进一步清理提取的值
            value = re.sub(r'\s+', ' ', value)  # 压缩空格
            value = value.split()[0] if field.endswith('_tax_id') else value  # 税号只取第一个词
            results[field] = value
        else:
            results[field] = None
    
    return results

def create_updated_template_config():
    """
    创建更新的模板配置，集成换行移除功能
    """
    template_config = {
        "issuer": "中国标准电子发票项目修正版_优化版",
        "priority": 120,
        "keywords": ["电子", "普通发票"],
        "fields": {
            # 使用改进的正则模式
            "invoice_number": {
                "parser": "regex",
                "regex": r"发票号码[:：]\\s*(\\d+)"
            },
            "date": {
                "parser": "regex", 
                "regex": r"开票日期[:：]\\s*(\\d{4}年\\d{1,2}月\\d{1,2}日)",
                "type": "date"
            },
            "amount": {
                "parser": "regex",
                "regex": r"(?:价税合计.*?小写.*?[¥￥]\\s*|合\\s*计.*?[¥￥]\\s*)([0-9,]+\\.?\\d*)",
                "type": "float"
            },
            "buyer_name": {
                "parser": "regex",
                "regex": r"购买方.*?名称[:：]\\s*([^销售方]+?)(?=\\s+(?:统一社会信用代码|销售方|项目名称|规格型号|¥|\\d+|$))"
            },
            "seller_name": {
                "parser": "regex",
                "regex": r"销售方.*?名称[:：]\\s*([^购买方]+?)(?=\\s+(?:统一社会信用代码|项目名称|规格型号|¥|\\d+|$))"
            },
            "buyer_tax_id": {
                "parser": "regex", 
                "regex": r"购买方.*?统一社会信用代码[/纳税人识别号]*[:：]\\s*([A-Z0-9]{18})"
            },
            "seller_tax_id": {
                "parser": "regex",
                "regex": r"销售方.*?统一社会信用代码[/纳税人识别号]*[:：]\\s*([A-Z0-9]{18})"
            }
        },
        "options": {
            "currency": "CNY",
            "decimal_separator": ".",
            "date_formats": ["%Y年%m月%d日"],
            "remove_whitespace": False,  # 关键：不要移除空格，我们需要手动处理
            "remove_accents": False,
            "lowercase": False
        },
        # 添加预处理函数说明
        "preprocessing": {
            "method": "newline_removal",
            "description": "Remove newlines and normalize spacing to handle vertical layout"
        }
    }
    
    return template_config

if __name__ == "__main__":
    # 示例使用
    sample_text = """电子发票（普通发票）
发票号码：
开票日期：
购
买
方
信
息
统一社会信用代码/纳税人识别号：
名称：
25432000000022020617
2025年02月19日
杭州趣链科技有限公司
91330108MA27Y5XH5G"""
    
    print("原始文本:")
    print(sample_text)
    print("\n预处理后:")
    processed = preprocess_text_for_extraction(sample_text)
    print(processed)
    
    print("\n提取结果:")
    results = extract_fields_with_newline_removal(sample_text)
    for field, value in results.items():
        print(f"{field}: {value}")