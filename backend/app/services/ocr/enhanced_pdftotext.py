"""
增强的pdftotext包装器 - 在原生函数基础上增加预处理
"""

import subprocess
import shutil
import unicodedata
import re
from typing import Optional, Dict
from .text_preprocessor import InvoiceTextPreprocessor


def to_text(path: str, area_details: Dict = None) -> str:
    """
    增强的pdftotext包装器，兼容invoice2data的接口
    在原生pdftotext基础上增加编码修正和空格清理
    
    Parameters
    ----------
    path : str
        PDF文件路径
    area_details : dict
        区域提取参数（与原生pdftotext相同）
        
    Returns
    -------
    str
        预处理后的文本
    """
    # 首先调用原生pdftotext
    raw_text = _original_pdftotext(path, area_details)
    
    # 应用预处理
    processed_text = _preprocess_pdftotext_output(raw_text)
    
    return processed_text


def _original_pdftotext(path: str, area_details: Dict = None) -> str:
    """原生pdftotext功能（从invoice2data复制）"""
    if shutil.which('pdftotext'):
        cmd = ["pdftotext", "-layout", "-enc", "UTF-8"]
        if area_details is not None:
            # An area was specified
            # Validate the required keys were provided
            assert 'f' in area_details, 'Area f details missing'
            assert 'l' in area_details, 'Area l details missing'
            assert 'r' in area_details, 'Area r details missing'
            assert 'x' in area_details, 'Area x details missing'
            assert 'y' in area_details, 'Area y details missing'
            assert 'W' in area_details, 'Area W details missing'
            assert 'H' in area_details, 'Area H details missing'
            # Convert all of the values to strings
            for key in area_details.keys():
                area_details[key] = str(area_details[key])
            cmd += [
                '-f', area_details['f'],
                '-l', area_details['l'],
                '-r', area_details['r'],
                '-x', area_details['x'],
                '-y', area_details['y'],
                '-W', area_details['W'],
                '-H', area_details['H'],
            ]
        cmd += [path, "-"]
        # Run the extraction
        out, err = subprocess.Popen(cmd, stdout=subprocess.PIPE).communicate()
        return out.decode('utf-8')
    else:
        raise EnvironmentError(
            "pdftotext not installed. Can be downloaded from https://poppler.freedesktop.org/"
        )


def _preprocess_pdftotext_output(text: str) -> str:
    """
    针对pdftotext输出的特殊预处理
    保留布局信息的同时修复编码和关键词
    """
    if not text:
        return text
    
    # 1. 处理Unicode变体字符
    text = _normalize_unicode_variants(text)
    
    # 2. 修复关键词中的空格（但保留布局空格）
    text = _fix_pdftotext_keywords(text)
    
    # 3. 规范化标点符号
    text = _normalize_punctuation(text)
    
    return text


def _normalize_unicode_variants(text: str) -> str:
    """规范化Unicode变体字符"""
    # Unicode正规化
    text = unicodedata.normalize('NFKC', text)
    
    # 常见变体字符映射
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
    
    for old_char, new_char in char_mapping.items():
        text = text.replace(old_char, new_char)
    
    return text


def _fix_pdftotext_keywords(text: str) -> str:
    """
    修复pdftotext输出中的关键词空格问题
    注意：pdftotext使用-layout选项，会保留很多空格用于布局
    我们只修复关键词内部的空格
    """
    # 针对pdftotext特定的关键词修复
    keyword_patterns = [
        # 发票监制章相关
        (r'统\s*一\s*发\s*票\s*监\s*制', '统一发票监制'),
        (r'省\s+税\s+务\s*局', '省税务局'),
        
        # 字段标题（保留冒号后的空格）
        (r'发\s*票\s*号\s*码\s*：', '发票号码：'),
        (r'开\s*票\s*日\s*期\s*：', '开票日期：'),
        (r'价\s*税\s*合\s*计', '价税合计'),
        
        # 买卖方信息（需要特殊处理）
        (r'买\s+名\s*称\s*：', '买名称：'),
        (r'售\s+名\s*称\s*：', '售名称：'),
        
        # 其他常见词组
        (r'电\s*子\s*发\s*票', '电子发票'),
        (r'普\s*通\s*发\s*票', '普通发票'),
        (r'统\s*一\s*社\s*会\s*信\s*用\s*代\s*码', '统一社会信用代码'),
        (r'纳\s*税\s*人\s*识\s*别\s*号', '纳税人识别号'),
    ]
    
    for pattern, replacement in keyword_patterns:
        text = re.sub(pattern, replacement, text)
    
    return text


def _normalize_punctuation(text: str) -> str:
    """标准化标点符号"""
    # 统一冒号
    text = re.sub(r'[：∶﹕︓]', '：', text)
    # 统一货币符号
    text = re.sub(r'[￥¥]', '¥', text)
    # 统一括号
    text = re.sub(r'[（﹙]', '(', text)
    text = re.sub(r'[）﹚]', ')', text)
    return text