#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试使用china_vat_special_invoice.yml模板处理发票
"""
import os
import sys
import json
from datetime import datetime
from pathlib import Path

# 添加项目路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ocr import Invoice2DataClient
import pdftotext

def test_single_invoice(pdf_path, template_path):
    """测试单个发票"""
    print(f"\n{'='*80}")
    print(f"处理文件: {os.path.basename(pdf_path)}")
    print(f"{'='*80}")
    
    # 1. 提取文本
    pdf_extractor = EnhancedPDFToText()
    raw_text = pdf_extractor.extract(pdf_path)
    
    if not raw_text:
        print("错误: 无法提取PDF文本")
        return None
    
    print(f"\n原始文本长度: {len(raw_text)} 字符")
    print(f"前500字符:\n{raw_text[:500]}...")
    
    # 2. 预处理文本
    preprocessor = TextPreprocessor()
    processed_text = preprocessor.preprocess(raw_text)
    
    print(f"\n预处理后文本长度: {len(processed_text)} 字符")
    
    # 3. 使用invoice2data提取
    client = Invoice2DataClient()
    
    # 只使用指定的模板
    template_dir = os.path.dirname(template_path)
    template_name = os.path.basename(template_path)
    
    # 临时创建只包含指定模板的目录
    temp_template_dir = "/tmp/test_vat_template"
    os.makedirs(temp_template_dir, exist_ok=True)
    
    # 复制模板文件
    import shutil
    shutil.copy2(template_path, os.path.join(temp_template_dir, template_name))
    
    # 使用临时模板目录
    result = client.extract_from_text(processed_text, template_dirs=[temp_template_dir])
    
    # 清理临时目录
    shutil.rmtree(temp_template_dir)
    
    if result:
        print("\n提取结果:")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("\n未能提取任何信息")
    
    return result

def main():
    """主函数"""
    # 模板路径
    template_path = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates/china_vat_special_invoice.yml"
    
    # PDF文件列表
    pdf_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底市娄星区萝卜餐饮店-1018.00-25432000000029373425.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底星奕酒店管理有限公司-507.00-25432000000029033553.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-11-娄底市金盾印章有限公司-655.00-25432000000031411143.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-13-娄底市中税通财税咨询有限公司-500.00-25432000000032177192.pdf"
    ]
    
    # 检查模板文件
    if not os.path.exists(template_path):
        print(f"错误: 模板文件不存在 - {template_path}")
        return
    
    print(f"使用模板: {template_path}")
    
    # 测试结果汇总
    results = []
    success_count = 0
    
    for pdf_path in pdf_files:
        if not os.path.exists(pdf_path):
            print(f"\n警告: PDF文件不存在 - {pdf_path}")
            continue
        
        result = test_single_invoice(pdf_path, template_path)
        
        if result:
            success_count += 1
            results.append({
                'file': os.path.basename(pdf_path),
                'success': True,
                'data': result
            })
        else:
            results.append({
                'file': os.path.basename(pdf_path),
                'success': False,
                'data': None
            })
    
    # 输出汇总结果
    print(f"\n\n{'='*80}")
    print("测试汇总")
    print(f"{'='*80}")
    print(f"总文件数: {len(pdf_files)}")
    print(f"成功提取: {success_count}")
    print(f"失败数量: {len(pdf_files) - success_count}")
    print(f"成功率: {success_count/len(pdf_files)*100:.1f}%")
    
    # 保存详细结果
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"vat_template_test_results_{timestamp}.json"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'template': template_path,
            'timestamp': timestamp,
            'summary': {
                'total': len(pdf_files),
                'success': success_count,
                'failed': len(pdf_files) - success_count,
                'success_rate': f"{success_count/len(pdf_files)*100:.1f}%"
            },
            'results': results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细结果已保存到: {output_file}")

if __name__ == "__main__":
    main()