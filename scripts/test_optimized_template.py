#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试优化后的VAT模板
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

def main():
    """主函数"""
    template_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates"
    
    pdf_files = [
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底市娄星区萝卜餐饮店-1018.00-25432000000029373425.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-06-娄底星奕酒店管理有限公司-507.00-25432000000029033553.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-11-娄底市金盾印章有限公司-655.00-25432000000031411143.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
        "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-13-娄底市中税通财税咨询有限公司-500.00-25432000000032177192.pdf"
    ]
    
    # 加载模板
    templates = read_templates(template_dir)
    print(f"加载了 {len(templates)} 个模板\n")
    
    # 测试结果
    results = []
    success_count = 0
    failed_files = []
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"处理: {filename}")
        
        try:
            result = extract_data(pdf_path, templates=templates)
            
            if result:
                success_count += 1
                amount = result.get('amount', 0)
                if isinstance(amount, list):
                    amount = amount[-1] if amount else 0
                print(f"✅ 成功 - {result.get('seller_name', 'Unknown')} - ¥{amount}")
                
                # 检查关键字段
                missing_fields = []
                if not result.get('invoice_number'):
                    missing_fields.append('invoice_number')
                if not result.get('date'):
                    missing_fields.append('date')
                if not result.get('buyer_name'):
                    missing_fields.append('buyer_name')
                if not result.get('seller_name'):
                    missing_fields.append('seller_name')
                
                if missing_fields:
                    print(f"  ⚠️ 缺失字段: {', '.join(missing_fields)}")
                
                results.append({
                    'file': filename,
                    'success': True,
                    'data': result,
                    'missing_fields': missing_fields
                })
            else:
                print(f"❌ 失败 - 未匹配模板")
                failed_files.append(filename)
                results.append({
                    'file': filename,
                    'success': False
                })
                
        except Exception as e:
            print(f"❌ 错误 - {str(e)}")
            failed_files.append(filename)
            results.append({
                'file': filename,
                'success': False,
                'error': str(e)
            })
    
    # 汇总
    print(f"\n{'='*80}")
    print(f"测试汇总:")
    print(f"{'='*80}")
    print(f"总文件数: {len(pdf_files)}")
    print(f"成功提取: {success_count}")
    print(f"失败数量: {len(failed_files)}")
    print(f"成功率: {success_count/len(pdf_files)*100:.1f}%")
    
    if failed_files:
        print(f"\n失败的文件:")
        for f in failed_files:
            print(f"- {f}")
    
    # 保存结果
    output = f"optimized_template_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total': len(pdf_files),
                'success': success_count,
                'failed': len(failed_files),
                'success_rate': f"{success_count/len(pdf_files)*100:.1f}%"
            },
            'failed_files': failed_files,
            'results': results
        }, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    
    print(f"\n结果已保存到: {output}")

if __name__ == "__main__":
    main()