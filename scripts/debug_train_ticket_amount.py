#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
调试火车票金额提取问题
"""

import re
import fitz

def debug_train_ticket_amount():
    """调试火车票金额提取"""
    
    # 测试文件
    test_file = "downloads/25359134169000052039.pdf"
    
    # 提取文本
    doc = fitz.open(test_file)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    
    print("火车票金额提取调试")
    print("="*60)
    print(f"测试文件: {test_file}")
    print("-"*60)
    
    # 显示完整文本
    print("完整PDF文本:")
    lines = text.split('\n')
    for i, line in enumerate(lines, 1):
        print(f"{i:2d}: {repr(line)}")
    
    print("\n" + "="*60)
    
    # 当前的金额提取模式
    current_patterns = [
        r'价税合计.*?[¥￥]\s*([\d,]+\.?\d*)',
        r'合计.*?[¥￥]\s*([\d,]+\.?\d*)', 
        r'[¥￥]\s*([\d,]+\.?\d*)(?=.*价税合计)',
        r'小写[）)]\s*[¥￥]\s*([\d,]+\.?\d*)',
        r'票价[:：]\s*[¥￥]?\s*([\d,]+\.?\d*)',
    ]
    
    print("测试当前模式:")
    for i, pattern in enumerate(current_patterns, 1):
        print(f"\n模式 {i}: {pattern}")
        matches = re.findall(pattern, text, re.DOTALL)
        if matches:
            print(f"  ✅ 匹配到: {matches}")
        else:
            print(f"  ❌ 无匹配")
    
    # 尝试新的模式
    new_patterns = [
        r'￥\s*([\d,]+\.?\d*)',  # 简单的￥符号后跟数字
        r'[¥￥]\s*([\d,]+\.?\d*)',  # 任意￥符号后跟数字
        r'(\d+\.\d{2})',  # 任意小数点后两位的数字
        r'票价[:：]?\s*[¥￥]?\s*([\d,]+\.?\d*)',  # 票价可选冒号
        r'[¥￥](\d+\.\d{2})',  # ￥紧跟数字
    ]
    
    print("\n测试新模式:")
    for i, pattern in enumerate(new_patterns, 1):
        print(f"\n新模式 {i}: {pattern}")
        matches = re.findall(pattern, text, re.DOTALL)
        if matches:
            print(f"  ✅ 匹配到: {matches}")
            # 尝试转换为float
            for match in matches:
                try:
                    amount = float(match.replace(',', ''))
                    print(f"    转换为数字: {amount}")
                except:
                    print(f"    无法转换: {match}")
        else:
            print(f"  ❌ 无匹配")
    
    # 分析文本结构
    print("\n文本结构分析:")
    print("-"*40)
    
    # 查找￥符号及其位置
    yuan_positions = []
    for i, char in enumerate(text):
        if char in '¥￥':
            start = max(0, i-10)
            end = min(len(text), i+20)
            context = text[start:end].replace('\n', '\\n')
            yuan_positions.append((i, context))
    
    print(f"找到 {len(yuan_positions)} 个￥符号:")
    for pos, context in yuan_positions:
        print(f"  位置 {pos}: ...{context}...")
    
    # 查找数字模式
    print(f"\n查找数字模式:")
    number_patterns = [
        r'\d+\.\d{2}',  # 小数点后两位
        r'\d+\.\d+',    # 任意小数
        r'\d+',         # 整数
    ]
    
    for pattern in number_patterns:
        matches = re.findall(pattern, text)
        print(f"  模式 {pattern}: {matches}")

def test_improved_amount_extraction():
    """测试改进的金额提取"""
    
    def improved_extract_amount(text):
        """改进的金额提取函数"""
        patterns = [
            r'价税合计.*?[¥￥]\s*([\d,]+\.?\d*)',
            r'合计.*?[¥￥]\s*([\d,]+\.?\d*)',
            r'[¥￥]\s*([\d,]+\.?\d*)(?=.*价税合计)',
            r'小写[）)]\s*[¥￥]\s*([\d,]+\.?\d*)',
            r'票价[:：]?\s*[¥￥]?\s*([\d,]+\.?\d*)',  # 改进：冒号可选
            # 新增模式
            r'[¥￥]\s*([\d,]+\.?\d*)',  # 任意￥后的数字
            r'(\d+\.\d{2})(?=\s*$)',   # 行末的小数
            r'[¥￥]([\d,]+\.?\d*)',    # ￥紧跟数字
        ]
        
        amounts = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.DOTALL)
            for match in matches:
                try:
                    amount = float(match.replace(',', ''))
                    if amount > 0:
                        amounts.append(amount)
                except:
                    pass
        
        return max(amounts) if amounts else None
    
    # 测试几个火车票文件
    test_files = [
        "downloads/25359134169000052039.pdf",
        "downloads/25429165848000790553.pdf", 
        "downloads/25439122799000011090.pdf",
    ]
    
    print("\n测试改进的金额提取:")
    print("="*60)
    
    for test_file in test_files:
        print(f"\n测试文件: {test_file}")
        try:
            doc = fitz.open(test_file)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            
            amount = improved_extract_amount(text)
            print(f"  提取金额: {amount}")
            
            # 显示关键信息
            lines = text.split('\n')
            for line in lines:
                if '￥' in line or '¥' in line:
                    print(f"  金额行: {line.strip()}")
                    
        except Exception as e:
            print(f"  ❌ 错误: {e}")

if __name__ == "__main__":
    debug_train_ticket_amount()
    test_improved_amount_extraction()