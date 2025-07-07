#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
单独测试广州寿司郎餐饮有限公司发票
"""
import os
import json
from datetime import datetime, date
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates
from invoice2data.input import pdftotext

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def test_sushiro_invoice():
    """测试寿司郎发票"""
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf"
    template_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates"
    
    print(f"测试文件: {os.path.basename(pdf_path)}")
    print(f"使用模板目录: {template_dir}")
    print("="*80)
    
    # 1. 先查看PDF文本内容
    print("\n1. 提取PDF文本内容:")
    try:
        # 使用invoice2data的pdftotext模块
        text = pdftotext.to_text(pdf_path)
        print(f"文本长度: {len(text)} 字符")
        print("\n前1000字符:")
        print(text[:1000])
        print("\n...")
        
        # 查找关键信息
        print("\n2. 查找关键信息:")
        keywords = ["发票", "电子", "增值税", "发票号码", "开票日期", "金额"]
        for kw in keywords:
            if kw in text:
                print(f"✓ 找到关键词: {kw}")
                # 找到关键词的上下文
                idx = text.find(kw)
                context_start = max(0, idx - 50)
                context_end = min(len(text), idx + 100)
                print(f"  上下文: ...{text[context_start:context_end]}...")
            else:
                print(f"✗ 未找到关键词: {kw}")
                
    except Exception as e:
        print(f"文本提取失败: {e}")
    
    # 2. 加载模板
    print("\n3. 加载模板:")
    templates = read_templates(template_dir)
    print(f"加载了 {len(templates)} 个模板")
    
    # 3. 尝试使用invoice2data提取
    print("\n4. 使用invoice2data提取:")
    try:
        result = extract_data(pdf_path, templates=templates)
        
        if result:
            print("\n✅ 提取成功!")
            print(json.dumps(result, ensure_ascii=False, indent=2, cls=DateTimeEncoder))
            
            # 显示使用的模板
            template_name = result.get('desc', '').replace('Invoice from ', '')
            print(f"\n使用的模板: {template_name}")
        else:
            print("\n❌ 提取失败 - 未匹配任何模板")
            
            # 尝试调试为什么没有匹配
            print("\n5. 调试信息:")
            print("检查模板关键词匹配情况...")
            
            # 手动检查每个模板
            for template in templates:
                template_name = template['issuer']
                keywords = template.get('keywords', [])
                print(f"\n模板: {template_name}")
                print(f"关键词: {keywords}")
                print(f"优先级: {template.get('priority', 0)}")
                
                # 检查关键词匹配
                matched_keywords = []
                for kw in keywords:
                    if kw in text:
                        matched_keywords.append(kw)
                
                if matched_keywords:
                    print(f"✓ 匹配的关键词: {matched_keywords}")
                else:
                    print("✗ 没有匹配的关键词")
                    
    except Exception as e:
        print(f"\n❌ 提取出错: {e}")
        import traceback
        traceback.print_exc()

def main():
    """主函数"""
    test_sushiro_invoice()

if __name__ == "__main__":
    main()