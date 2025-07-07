#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
详细测试VAT模板 - 分析每个文件的提取情况
"""
import os
import json
# import pdftotext  # 可选依赖
from datetime import datetime, date
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def extract_pdf_text(pdf_path):
    """提取PDF文本用于调试"""
    # 暂时跳过文本提取
    return None

def test_single_pdf(pdf_path, templates):
    """测试单个PDF文件"""
    filename = os.path.basename(pdf_path)
    print(f"\n{'='*80}")
    print(f"测试文件: {filename}")
    print(f"{'='*80}")
    
    # 1. 提取文本查看
    text = extract_pdf_text(pdf_path)
    if text:
        print("\n文本预览（前500字符）:")
        print(text[:500])
        print("...")
    
    # 2. 使用invoice2data提取
    try:
        result = extract_data(pdf_path, templates=templates)
        
        if result:
            print("\n✅ 提取成功!")
            print(json.dumps(result, ensure_ascii=False, indent=2, cls=DateTimeEncoder))
            return True, result
        else:
            print("\n❌ 提取失败 - 未匹配任何模板")
            return False, None
            
    except Exception as e:
        print(f"\n❌ 提取出错: {e}")
        return False, None

def main():
    """主函数"""
    template_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates"
    
    # 加载所有模板
    templates = read_templates(template_dir)
    print(f"加载了 {len(templates)} 个模板")
    
    pdf_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底市娄星区萝卜餐饮店-1018.00-25432000000029373425.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底星奕酒店管理有限公司-507.00-25432000000029033553.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-11-娄底市金盾印章有限公司-655.00-25432000000031411143.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-13-娄底市中税通财税咨询有限公司-500.00-25432000000032177192.pdf"
    ]
    
    # 统计结果
    results = []
    success_count = 0
    
    for pdf_path in pdf_files:
        if not os.path.exists(pdf_path):
            print(f"\n⚠️ 文件不存在: {pdf_path}")
            continue
            
        success, data = test_single_pdf(pdf_path, templates)
        
        if success:
            success_count += 1
            # 记录使用的模板
            template_name = data.get('desc', '').replace('Invoice from ', '') if data else 'Unknown'
            results.append({
                'file': os.path.basename(pdf_path),
                'success': True,
                'template': template_name,
                'data': data
            })
        else:
            results.append({
                'file': os.path.basename(pdf_path),
                'success': False,
                'template': None,
                'data': None
            })
    
    # 输出总结
    print(f"\n\n{'='*80}")
    print("测试总结")
    print(f"{'='*80}")
    print(f"总文件数: {len(pdf_files)}")
    print(f"成功提取: {success_count}")
    print(f"失败数量: {len(pdf_files) - success_count}")
    print(f"成功率: {success_count/len(pdf_files)*100:.1f}%")
    
    # 按模板分组统计
    template_stats = {}
    for r in results:
        if r['success']:
            template = r['template']
            if template not in template_stats:
                template_stats[template] = 0
            template_stats[template] += 1
    
    print("\n模板使用统计:")
    for template, count in template_stats.items():
        print(f"- {template}: {count} 个文件")
    
    # 保存结果
    output_file = f"vat_detailed_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total': len(pdf_files),
                'success': success_count,
                'failed': len(pdf_files) - success_count,
                'success_rate': f"{success_count/len(pdf_files)*100:.1f}%"
            },
            'template_stats': template_stats,
            'details': results
        }, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    
    print(f"\n详细结果已保存到: {output_file}")

if __name__ == "__main__":
    main()