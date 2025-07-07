#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试优化后的金额提取
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

def test_amount_fields():
    """测试金额字段提取"""
    template_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/app/services/ocr/templates"
    
    # 测试几个典型发票
    test_files = [
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-02-24-广州寿司郎餐饮有限公司-336.00-25442000000101203423.pdf",
            "expected_total": 336.00,
            "expected_pretax": 316.98,
            "expected_tax": 19.02
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-12-湖南曾小厨餐饮管理有限公司贤童店-80.00-25432000000031789815.pdf",
            "expected_total": 80.00,
            "expected_pretax": 79.21,
            "expected_tax": 0.79
        },
        {
            "path": "/Users/xumingyang/app/invoice_assist/downloads/报销/invoices_20250326171507/2025-03-03-湖南清泉华美达国际酒店有限公司-900.00-25432000000027470610.pdf",
            "expected_total": 900.00,
            "expected_pretax": 849.06,
            "expected_tax": 50.94
        }
    ]
    
    # 加载模板
    templates = read_templates(template_dir)
    print(f"加载了 {len(templates)} 个模板\n")
    
    print("金额提取测试:")
    print("="*80)
    
    all_correct = True
    
    for test_case in test_files:
        pdf_path = test_case["path"]
        filename = os.path.basename(pdf_path)
        
        print(f"\n文件: {filename}")
        
        try:
            result = extract_data(pdf_path, templates=templates)
            
            if result:
                # 提取金额字段
                amount = result.get('amount')
                amount_pretax = result.get('amount_pretax')
                tax_amount = result.get('tax_amount')
                
                print(f"  价税合计(amount): {amount}")
                print(f"  税前金额(amount_pretax): {amount_pretax}")
                print(f"  税额(tax_amount): {tax_amount}")
                
                # 验证结果
                if amount == test_case["expected_total"]:
                    print(f"  ✅ 总金额正确")
                else:
                    print(f"  ❌ 总金额错误，期望: {test_case['expected_total']}")
                    all_correct = False
                
                if amount_pretax == test_case["expected_pretax"]:
                    print(f"  ✅ 税前金额正确")
                else:
                    print(f"  ❌ 税前金额错误，期望: {test_case['expected_pretax']}")
                    all_correct = False
                    
                if tax_amount == test_case["expected_tax"]:
                    print(f"  ✅ 税额正确")
                else:
                    print(f"  ❌ 税额错误，期望: {test_case['expected_tax']}")
                    all_correct = False
                
                # 验证计算关系
                if amount_pretax and tax_amount and amount:
                    calculated_total = round(amount_pretax + tax_amount, 2)
                    if calculated_total == amount:
                        print(f"  ✅ 金额关系验证通过: {amount_pretax} + {tax_amount} = {amount}")
                    else:
                        print(f"  ❌ 金额关系验证失败: {amount_pretax} + {tax_amount} = {calculated_total} ≠ {amount}")
                
            else:
                print("  ❌ 提取失败")
                all_correct = False
                
        except Exception as e:
            print(f"  ❌ 错误: {e}")
            all_correct = False
    
    print(f"\n\n{'='*80}")
    if all_correct:
        print("✅ 所有金额提取测试通过！")
    else:
        print("❌ 部分金额提取测试失败")

if __name__ == "__main__":
    test_amount_fields()