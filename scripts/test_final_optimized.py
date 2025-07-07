#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
最终优化版本测试
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
    
    print("发票提取结果:")
    print("="*100)
    print(f"{'文件名':<50} {'发票号码':<22} {'日期':<12} {'总金额':<10} {'税前':<10} {'税额':<10}")
    print("-"*100)
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)[:50]
        
        try:
            result = extract_data(pdf_path, templates=templates)
            
            if result:
                success_count += 1
                
                # 提取关键信息
                invoice_num = result.get('invoice_number', 'N/A')
                date = result.get('date')
                if isinstance(date, (datetime, date)):
                    date = date.strftime('%Y-%m-%d')
                amount = result.get('amount', 0)
                amount_pretax = result.get('amount_pretax', 0)
                tax_amount = result.get('tax_amount', 0)
                
                print(f"{filename:<50} {invoice_num:<22} {date:<12} ¥{amount:<9.2f} ¥{amount_pretax:<9.2f} ¥{tax_amount:<9.2f}")
                
                results.append({
                    'file': filename,
                    'success': True,
                    'data': {
                        'invoice_number': invoice_num,
                        'date': date,
                        'buyer_name': result.get('buyer_name'),
                        'seller_name': result.get('seller_name'),
                        'amount': amount,
                        'amount_pretax': amount_pretax,
                        'tax_amount': tax_amount,
                        'service_type': result.get('service_type'),
                        'issuer_person': result.get('issuer_person')
                    }
                })
            else:
                print(f"{filename:<50} {'提取失败':<22}")
                results.append({
                    'file': filename,
                    'success': False
                })
                
        except Exception as e:
            print(f"{filename:<50} {'错误: ' + str(e)[:20]:<22}")
            results.append({
                'file': filename,
                'success': False,
                'error': str(e)
            })
    
    # 汇总
    print(f"\n{'='*100}")
    print(f"汇总: {success_count}/{len(pdf_files)} 成功 ({success_count/len(pdf_files)*100:.0f}%)")
    
    # 保存结果
    output = f"final_optimized_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total': len(pdf_files),
                'success': success_count,
                'success_rate': f"{success_count/len(pdf_files)*100:.0f}%",
                'template_used': 'china_vat_special_invoice_v2.yml'
            },
            'results': results
        }, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    
    print(f"\n结果已保存到: {output}")

if __name__ == "__main__":
    main()