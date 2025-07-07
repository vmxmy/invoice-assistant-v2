#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
简单测试使用china_vat_special_invoice.yml模板处理发票
"""
import os
import json
from datetime import datetime, date
from invoice2data import extract_data
from invoice2data.extract.loader import read_templates

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def test_invoice_with_template(pdf_path, template_path):
    """使用指定模板测试单个发票"""
    print(f"\n{'='*80}")
    print(f"文件: {os.path.basename(pdf_path)}")
    print(f"{'='*80}")
    
    # 加载模板
    templates = read_templates(os.path.dirname(template_path))
    
    # 提取数据
    result = extract_data(pdf_path, templates=templates)
    
    if result:
        print("提取成功:")
        print(json.dumps(result, ensure_ascii=False, indent=2, cls=DateTimeEncoder))
    else:
        print("提取失败")
    
    return result

def main():
    """主函数"""
    template_path = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates/china_vat_special_invoice.yml"
    
    pdf_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底市娄星区萝卜餐饮店-1018.00-25432000000029373425.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底星奕酒店管理有限公司-507.00-25432000000029033553.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-11-娄底市金盾印章有限公司-655.00-25432000000031411143.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-13-娄底市中税通财税咨询有限公司-500.00-25432000000032177192.pdf"
    ]
    
    results = []
    success = 0
    
    for pdf in pdf_files:
        if os.path.exists(pdf):
            result = test_invoice_with_template(pdf, template_path)
            if result:
                success += 1
                results.append({'file': os.path.basename(pdf), 'success': True, 'data': result})
            else:
                results.append({'file': os.path.basename(pdf), 'success': False})
    
    print(f"\n\n{'='*80}")
    print(f"测试汇总: {success}/{len(pdf_files)} 成功 ({success/len(pdf_files)*100:.1f}%)")
    print(f"{'='*80}")
    
    # 保存结果
    output = f"vat_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    print(f"\n结果已保存到: {output}")

if __name__ == "__main__":
    main()