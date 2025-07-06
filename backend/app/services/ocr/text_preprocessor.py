#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
文本预处理器 - 处理PyMuPDF垂直布局问题
"""

import re

class TextPreprocessor:
    """文本预处理器，解决PyMuPDF垂直布局文本提取问题"""
    
    def __init__(self):
        self.separators = [
            '购买方', '销售方', '买方', '卖方',
            '名称：', '名称:', 
            '统一社会信用代码', '纳税人识别号',
            '发票号码', '开票日期', '价税合计'
        ]
    
    def preprocess_for_invoice_extraction(self, text):
        """
        为发票信息提取预处理文本
        主要解决PyMuPDF垂直布局导致的字段分离问题
        """
        if not text:
            return text
            
        # 1. 移除换行符，用空格替换
        processed = text.replace('\n', ' ')
        
        # 2. 合并多个连续空格和制表符
        processed = re.sub(r'[\s\t]+', ' ', processed)
        
        # 3. 在重要分隔符前后添加空格，确保正则匹配边界清晰
        for separator in self.separators:
            # 在分隔符前后添加空格
            processed = re.sub(f'({re.escape(separator)})', r' \1 ', processed)
        
        # 4. 处理中文冒号和英文冒号的统一
        processed = processed.replace('：', ': ')
        
        # 5. 再次清理多余空格
        processed = re.sub(r'\s+', ' ', processed).strip()
        
        return processed
    
    def preprocess_for_train_ticket(self, text):
        """为火车票格式特别优化的预处理"""
        if not text:
            return text
            
        # 火车票格式通常字段名和值在相邻行，直接移除换行即可
        processed = text.replace('\n', ' ')
        processed = re.sub(r'\s+', ' ', processed).strip()
        
        return processed
    
    def should_preprocess(self, text):
        """
        判断是否需要预处理
        检查文本是否存在垂直布局问题
        """
        if not text:
            return False
            
        # 检查是否存在典型的垂直布局模式
        vertical_patterns = [
            r'购\s+买\s+方',  # "购 买 方" 
            r'销\s+售\s+方',  # "销 售 方"
            r'名称[:：]\s*\n',  # 名称后直接换行
            r'统一社会信用代码[:：]\s*\n'  # 税号字段后换行
        ]
        
        for pattern in vertical_patterns:
            if re.search(pattern, text):
                return True
                
        return False

# 全局预处理器实例
text_preprocessor = TextPreprocessor()

def preprocess_pdf_text(text, invoice_type="standard"):
    """
    预处理PDF提取的文本
    
    Args:
        text: 原始PDF文本
        invoice_type: 发票类型 ("standard", "train_ticket", "airline")
    
    Returns:
        预处理后的文本
    """
    if not text_preprocessor.should_preprocess(text):
        return text
        
    if invoice_type == "train_ticket":
        return text_preprocessor.preprocess_for_train_ticket(text)
    else:
        return text_preprocessor.preprocess_for_invoice_extraction(text)

def remove_colon_newlines(text):
    """
    移除所有格式冒号后的换行符
    这是解决PyMuPDF垂直布局问题的核心方法
    """
    if not text:
        return text
    
    # 支持所有冒号格式
    colon_variants = ['：', ':', '∶', '﹕', '︰']
    
    for colon in colon_variants:
        # 移除冒号后的换行符和多余空格，保留一个空格
        text = re.sub(f'{re.escape(colon)}\\s*\\n+\\s*', f'{colon} ', text)
        
        # 压缩冒号后的多个空格为一个
        text = re.sub(f'{re.escape(colon)}\\s+', f'{colon} ', text)
    
    return text


class InvoiceTextPreprocessor:
    """发票文本预处理器，用于invoice2data客户端"""
    
    @staticmethod
    def preprocess_for_extraction(data):
        """预处理发票数据"""
        if isinstance(data, dict):
            return data
        return data