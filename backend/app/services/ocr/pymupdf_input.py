"""
PyMuPDF输入模块 - 替代pdftotext作为invoice2data的输入引擎
解决空格分割问题，提供更好的文本提取质量
"""

import fitz  # PyMuPDF
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

def to_text(path: str, area_details: Optional[Dict[str, Any]] = None) -> str:
    """
    使用PyMuPDF提取PDF文本
    
    Args:
        path: PDF文件路径
        area_details: 区域详细信息（暂未使用，保持与invoice2data兼容）
        
    Returns:
        str: 提取的文本内容
        
    Raises:
        Exception: 文件读取或处理失败
    """
    try:
        # 验证文件存在
        pdf_path = Path(path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF文件不存在: {path}")
        
        # 使用PyMuPDF打开PDF
        doc = fitz.open(str(pdf_path))
        
        if doc.page_count == 0:
            raise ValueError(f"PDF文件没有页面: {path}")
        
        # 提取所有页面的文本
        text_parts = []
        
        for page_num in range(doc.page_count):
            page = doc[page_num]
            
            # 使用布局保持模式提取文本
            # sort=True 保持文本的阅读顺序
            page_text = page.get_text("text", sort=True)
            
            if page_text.strip():  # 只添加非空页面
                text_parts.append(page_text)
        
        doc.close()
        
        # 合并所有页面的文本
        full_text = "\n".join(text_parts)
        
        # 基本的文本后处理
        processed_text = _post_process_text(full_text)
        
        logger.debug(f"PyMuPDF成功提取文本，长度: {len(processed_text)}")
        
        return processed_text
        
    except Exception as e:
        logger.error(f"PyMuPDF提取文本失败: {path}, 错误: {e}")
        raise Exception(f"PyMuPDF文本提取失败: {str(e)}")

def _post_process_text(text: str) -> str:
    """
    对提取的文本进行后处理
    
    Args:
        text: 原始提取的文本
        
    Returns:
        str: 处理后的文本
    """
    if not text:
        return ""
    
    # 1. Unicode变体字符修复
    unicode_map = {
        '⼦': '子',
        '⼀': '一', 
        '⼆': '二',
        '⼋': '八',
        '⼊': '入',
        '⼗': '十',
        '⼈': '人',
        '⼤': '大',
        '⼩': '小',
        '⼭': '山',
        '⼯': '工',
        '⼴': '广',
        '⼝': '口',
        '⼟': '土'
    }
    
    for old_char, new_char in unicode_map.items():
        text = text.replace(old_char, new_char)
    
    # 2. 修复关键字段的空格问题
    # 这些修复基于常见的OCR空格错误
    keyword_fixes = {
        '发 票 号 码': '发票号码',
        '开 票 日 期': '开票日期', 
        '购 买 方': '购买方',
        '销 售 方': '销售方',
        '价 税 合 计': '价税合计',
        '统 一 社 会 信 用 代 码': '统一社会信用代码',
        '纳 税 人 识 别 号': '纳税人识别号',
        '电 子 发 票': '电子发票',
        '普 通 发 票': '普通发票',
        '增 值 税': '增值税',
        '专 用 发 票': '专用发票'
    }
    
    for broken_keyword, fixed_keyword in keyword_fixes.items():
        text = text.replace(broken_keyword, fixed_keyword)
    
    # 3. 清理多余的空行
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # 保留有意义的行
        if line.strip():
            cleaned_lines.append(line)
        # 保留一个空行作为段落分隔
        elif cleaned_lines and cleaned_lines[-1] != '':
            cleaned_lines.append('')
    
    return '\n'.join(cleaned_lines)

def get_engine_info() -> Dict[str, Any]:
    """
    获取引擎信息
    
    Returns:
        Dict: 引擎信息
    """
    return {
        'name': 'PyMuPDF',
        'version': fitz.version[0],
        'features': [
            'Unicode变体字符修复',
            '空格分割问题修复', 
            '布局保持',
            '多页面支持',
            '文本后处理'
        ],
        'advantages': [
            '解决空格分割问题',
            '更好的中文支持',
            '更快的处理速度',
            '更稳定的输出格式'
        ]
    }

# 为了与pdftotext兼容，提供相同的函数签名
def pdftotext(path: str, layout: bool = True, encoding: str = 'utf-8') -> str:
    """
    兼容pdftotext的函数签名
    
    Args:
        path: PDF文件路径
        layout: 是否保持布局（始终为True）
        encoding: 编码（始终为utf-8）
        
    Returns:
        str: 提取的文本
    """
    return to_text(path)

if __name__ == "__main__":
    # 测试代码
    import sys
    
    if len(sys.argv) != 2:
        print("用法: python pymupdf_input.py <pdf_file_path>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    
    try:
        text = to_text(pdf_file)
        print("=" * 80)
        print(f"PyMuPDF提取结果 ({pdf_file}):")
        print("=" * 80)
        print(text)
        print("=" * 80)
        print(f"文本长度: {len(text)} 字符")
        
        # 显示引擎信息
        info = get_engine_info()
        print(f"\n引擎信息: {info['name']} v{info['version']}")
        print(f"特性: {', '.join(info['features'])}")
        
    except Exception as e:
        print(f"❌ 错误: {e}")
        sys.exit(1)