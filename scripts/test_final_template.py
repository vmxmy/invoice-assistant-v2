#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试最终优化的模板
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
    print(f"加载了 {len(templates)} 个模板")
    
    # 查看模板优先级
    print("\n模板优先级:")
    for t in sorted(templates, key=lambda x: x.get('priority', 0), reverse=True):
        print(f"- {t.get('issuer', 'Unknown')}: 优先级 {t.get('priority', 0)}")
    
    print(f"\n开始测试 {len(pdf_files)} 个PDF文件:")
    print("="*80)
    
    # 测试结果
    results = []
    success_count = 0
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        print(f"\n处理: {filename}")
        
        try:
            result = extract_data(pdf_path, templates=templates)
            
            if result:
                success_count += 1
                template_used = result.get('desc', '').replace('Invoice from ', '')
                
                # 提取关键信息
                invoice_num = result.get('invoice_number', 'N/A')
                date = result.get('date')
                if isinstance(date, (datetime, date)):
                    date = date.strftime('%Y-%m-%d')
                buyer = result.get('buyer_name', 'N/A')
                seller = result.get('seller_name', 'N/A')
                amount = result.get('amount', 0)
                if isinstance(amount, list):
                    amount = amount[-1] if amount else 0
                
                print(f"✅ 成功 - 使用模板: {template_used}")
                print(f"   发票号码: {invoice_num}")
                print(f"   日期: {date}")
                print(f"   购买方: {buyer}")
                print(f"   销售方: {seller}")
                print(f"   金额: ¥{amount}")
                
                results.append({
                    'file': filename,
                    'success': True,
                    'template': template_used,
                    'data': result
                })
            else:
                print(f"❌ 失败 - 未匹配任何模板")
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
    print(f"\n\n{'='*80}")
    print(f"测试汇总:")
    print(f"{'='*80}")
    print(f"总文件数: {len(pdf_files)}")
    print(f"成功提取: {success_count}")
    print(f"成功率: {success_count/len(pdf_files)*100:.1f}%")
    
    # 保存结果
    output = f"final_template_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output, 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total': len(pdf_files),
                'success': success_count,
                'success_rate': f"{success_count/len(pdf_files)*100:.1f}%"
            },
            'results': results
        }, f, ensure_ascii=False, indent=2, cls=DateTimeEncoder)
    
    print(f"\n结果已保存到: {output}")

if __name__ == "__main__":
    main()