#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试 remove_whitespace 选项的影响
"""
import re

def test_whitespace_removal():
    # 模拟发票文本
    test_texts = [
        "发票号码： 25432000000031789815",
        "发 票 号 码 ： 25432000000031789815",
        "购买方名称：杭州趣链科技有限公司       销售方名称：广州寿司郎餐饮有限公司",
        "价税合计（ 小写） ¥336.00",
        "*餐饮服务*餐饮服务                     316.98       6%                    19.02"
    ]
    
    print("测试 remove_whitespace 的影响:")
    print("="*80)
    
    for text in test_texts:
        print(f"\n原始文本: '{text}'")
        
        # 模拟 remove_whitespace=True
        text_no_space = re.sub(" +", "", text)
        print(f"去除空格后: '{text_no_space}'")
        
        # 测试正则匹配
        print("\n正则匹配测试:")
        
        # 1. 发票号码
        if "发票号码" in text_no_space:
            # 原始正则（不支持无空格）
            match1 = re.search(r'发票号码[：:]\s*(\d+)', text_no_space)
            print(f"  原始正则: {'✓ 匹配' if match1 else '✗ 不匹配'}")
            
            # 无空格正则
            match2 = re.search(r'发票号码[：:](\d+)', text_no_space)
            print(f"  无空格正则: {'✓ 匹配' if match2 else '✗ 不匹配'}")
        
        # 2. 金额
        if "¥" in text_no_space:
            match = re.search(r'[¥￥]([0-9,]+\.?\d*)', text_no_space)
            if match:
                print(f"  金额提取: {match.group(1)}")
        
        # 3. 购买方/销售方
        if "购买方名称" in text_no_space:
            # 问题：去除空格后，购买方和销售方会连在一起
            match = re.search(r'购买方名称[：:]([^销]+)销售方名称', text_no_space)
            if match:
                print(f"  购买方: '{match.group(1)}'")
            else:
                print(f"  购买方: 提取困难（与销售方连在一起）")

    print("\n\n分析总结:")
    print("-"*80)
    print("remove_whitespace=true 的影响：")
    print("1. 优点：")
    print("   - 解决字符间空格问题（如'发 票 号 码'变成'发票号码'）")
    print("   - 简化正则表达式（不需要\s*）")
    print("   - 提高匹配成功率")
    print("\n2. 缺点：")
    print("   - 公司名称可能与其他字段连在一起，难以区分边界")
    print("   - 丢失了原始格式信息")
    print("   - 正则表达式需要重新设计，不能依赖空格作为分隔符")
    print("\n3. 建议：")
    print("   - 保持 remove_whitespace=false")
    print("   - 使用 replace 规则针对性修复字符间空格")
    print("   - 这样既解决了问题，又保留了文本结构")

if __name__ == "__main__":
    test_whitespace_removal()