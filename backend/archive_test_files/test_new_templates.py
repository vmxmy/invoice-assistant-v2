#!/usr/bin/env python3
"""
测试新的发票模板
"""

import re
from pathlib import Path
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from invoice2data.input import pdftotext
import json

# 测试正则表达式
def test_regex_patterns():
    """测试正则表达式模式"""
    # 测试文本
    test_line = "购 名称： 杭州趣链科技有限公司                           销 名称：湖南曾小厨餐饮管理有限公司贤童店"
    
    print("测试文本:")
    print(repr(test_line))
    print("\n测试正则表达式:")
    
    # 测试同一行匹配模式
    pattern = r'购\s*名称[：:](.+?)销\s*名称[：:](.+?)$'
    match = re.search(pattern, test_line)
    if match:
        print(f"\n同一行模式匹配成功:")
        print(f"  购买方: '{match.group(1).strip()}'")
        print(f"  销售方: '{match.group(2).strip()}'")
    else:
        print("\n同一行模式匹配失败")

# 主函数
def main():
    # 先测试正则表达式
    test_regex_patterns()
    
    print("\n" + "="*60)
    print("测试invoice2data模板")
    print("="*60)
    
    # 加载新模板
    templates_dir = Path("app/services/ocr/templates")
    templates = read_templates(str(templates_dir))
    print(f"\n加载了 {len(templates)} 个模板")
    
    # 测试PDF文件
    downloads_dir = Path("downloads")
    pdf_files = list(downloads_dir.glob("*.pdf"))[:3]
    
    for pdf_file in pdf_files:
        print(f"\n\n文件: {pdf_file.name}")
        print("-"*60)
        
        # 提取文本查看格式
        text = pdftotext.to_text(str(pdf_file))
        lines = text.split('\n')
        
        # 显示包含"名称"的行
        print("\n包含'名称'的行:")
        for i, line in enumerate(lines[:20]):
            if '名称' in line:
                print(f"  Line {i}: {repr(line)}")
        
        # 使用invoice2data提取
        result = extract_data(str(pdf_file), templates=templates)
        
        if result:
            print(f"\n提取结果:")
            # 处理特殊的buyer_seller_line字段
            if 'buyer_seller_line' in result:
                buyer_seller = result['buyer_seller_line']
                if isinstance(buyer_seller, tuple) and len(buyer_seller) == 2:
                    print(f"  购买方: {buyer_seller[0].strip()}")
                    print(f"  销售方: {buyer_seller[1].strip()}")
                    # 将其转换为标准字段
                    result['buyer_name'] = buyer_seller[0].strip()
                    result['seller_name'] = buyer_seller[1].strip()
                result.pop('buyer_seller_line', None)
            
            # 显示其他字段
            for key, value in result.items():
                if key not in ['desc', 'currency', 'issuer']:
                    print(f"  {key}: {value}")
        else:
            print("\n未能提取数据")

if __name__ == "__main__":
    main()