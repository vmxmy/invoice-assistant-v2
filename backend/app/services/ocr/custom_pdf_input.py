"""
自定义PDF输入模块 - 在文本提取时进行预处理
用于invoice2data的input_module参数
"""

import logging
from pathlib import Path
from typing import Optional
import pdfplumber
import unicodedata
import re

from .text_preprocessor import InvoiceTextPreprocessor

logger = logging.getLogger(__name__)


def to_text(path: str) -> str:
    """
    提取PDF文本并进行预处理
    
    这是invoice2data要求的接口函数
    
    Args:
        path: PDF文件路径
        
    Returns:
        str: 预处理后的文本
    """
    try:
        # 使用pdfplumber提取文本（对中文支持更好）
        text = _extract_with_pdfplumber(path)
        
        # 应用预处理
        text = _preprocess_text(text)
        
        return text
    except Exception as e:
        # 如果pdfplumber失败，尝试使用pdfminer
        try:
            from pdfminer.high_level import extract_text as pdfminer_extract
            text = pdfminer_extract(path)
            return _preprocess_text(text)
        except Exception:
            # 最后尝试pdftotext
            try:
                import pdftotext
                text = pdftotext.to_text(path)
                return _preprocess_text(text)
            except Exception:
                raise Exception(f"无法从PDF提取文本: {path}")


def _extract_with_pdfplumber(path: str) -> str:
    """使用pdfplumber提取文本"""
    text_parts = []
    
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    
    return '\n'.join(text_parts)


def _preprocess_text(text: str) -> str:
    """
    预处理文本，解决编码和空格问题
    
    Args:
        text: 原始文本
        
    Returns:
        str: 预处理后的文本
    """
    if not text:
        return text
    
    # 1. 处理Unicode变体字符
    text = _normalize_unicode_variants(text)
    
    # 2. 使用现有的文本预处理器
    text = InvoiceTextPreprocessor.normalize_text(text)
    
    # 3. 特殊处理：保护某些结构不被破坏
    text = _protect_structures(text)
    
    return text


def _normalize_unicode_variants(text: str) -> str:
    """
    规范化Unicode变体字符
    处理类似 ⼦→子 的问题
    """
    # Unicode正规化（将组合字符转换为预组合形式）
    text = unicodedata.normalize('NFKC', text)
    
    # 特殊字符映射表（仅包含常见的）
    char_mapping = {
        '⼦': '子',
        '⼀': '一',
        '⼆': '二',
        '⼋': '八',
        '⼊': '入',
        '⼏': '几',
        '⼗': '十',
        '⼝': '口',
        '⼤': '大',
        '⼩': '小',
        '⼭': '山',
        '⼯': '工',
        '⼰': '己',
        '⼲': '干',
        '⼴': '广',
        '⼿': '手',
        '⽂': '文',
        '⽇': '日',
        '⽉': '月',
        '⽊': '木',
        '⽔': '水',
        '⽕': '火',
        '⽜': '牛',
        '⽝': '犬',
        '⽟': '玉',
        '⽢': '甘',
        '⽣': '生',
        '⽤': '用',
        '⽥': '田',
        '⽩': '白',
        '⽪': '皮',
        '⽬': '目',
        '⽯': '石',
        '⽰': '示',
    }
    
    # 应用字符映射
    for old_char, new_char in char_mapping.items():
        text = text.replace(old_char, new_char)
    
    return text


def _protect_structures(text: str) -> str:
    """
    保护某些文本结构不被破坏
    例如：保持表格对齐、金额格式等
    """
    # 保护金额格式（避免千分位被破坏）
    # 例如：1,234.56 不应该被处理成 1 234.56
    text = re.sub(r'(\d),(\d{3})', r'\1,\2', text)
    
    # 保护日期格式中的分隔符
    text = re.sub(r'(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日', r'\1年\2月\3日', text)
    
    # 保护发票号码的完整性
    text = re.sub(r'(\d{5})\s+(\d{5})\s+(\d{5})\s+(\d{5})', r'\1\2\3\4', text)
    
    return text


# 保留原有函数以保持兼容性
def read_pdf_with_preprocessing(filename: str) -> Optional[str]:
    """
    读取PDF文件并进行预处理（兼容旧接口）
    
    Args:
        filename: PDF文件路径
        
    Returns:
        Optional[str]: 预处理后的文本内容
    """
    try:
        return to_text(filename)
    except Exception as e:
        logger.error(f"PDF预处理失败: {filename}, 错误: {e}")
        return None


# 为了兼容性，也提供其他可能被调用的函数
def extract_text(path: str) -> str:
    """别名函数"""
    return to_text(path)


def get_text(path: str) -> str:
    """别名函数"""
    return to_text(path)