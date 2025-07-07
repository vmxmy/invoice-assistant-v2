#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
使用修改后的模板测试所有发票
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
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"处理: {filename}")
        
        try:
            result = extract_data(pdf_path, templates=templates)
            
            if result:
                success_count += 1
                print(f"✅ 成功 - {result.get('seller_name', 'Unknown')} - ¥{result.get('amount', [0])[-1] if isinstance(result.get('amount'), list) else result.get('amount', 0)}")
                results.append({
                    'file': filename,
                    'success': True,
                    'seller': result.get('seller_name'),
                    'amount': result.get('amount'),
                    'invoice_number': result.get('invoice_number')
                })
            else:
                print(f"❌ 失败 - 未匹配模板")
                results.append({
                    'file': filename,
                    'success': False
                })
                
        except Exception as e:
            print(f"❌ 错误 - {str(e)}")
            results.append({
                'file': filename,
                'success': False,
                'error': str(e)
            })
    
    # 汇总
    print(f"\n{'='*80}")
    print(f"测试汇总: {success_count}/{len(pdf_files)} 成功 ({success_count/len(pdf_files)*100:.1f}%)")
    print(f"{'='*80}")
    
    # 失败的文件
    failed = [r for r in results if not r['success']]
    if failed:
        print("\n失败的文件:")
        for f in failed:
            print(f"- {f['file']}")
            if 'error' in f:
                print(f"  错误: {f['error']}")
    
    # 保存结果
    output = f"final_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total': len(pdf_files),
                'success': success_count,
                'failed': len(failed),
                'success_rate': f"{success_count/len(pdf_files)*100:.1f}%"
            },
            'results': results
        }, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    
    print(f"\n结果已保存到: {output}")

if __name__ == "__main__":
    main()