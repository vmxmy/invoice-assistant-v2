#!/usr/bin/env python3
"""
测试本地PDF发票处理和自动分类
"""

import asyncio
import json
from pathlib import Path
from datetime import datetime, date
from uuid import UUID
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_context
from app.services.ocr.service import OCRService
from app.services.invoice_classification_service import InvoiceClassificationService
from app.models.category import PrimaryCategory


async def process_pdf_files(files: List[Path], session: AsyncSession) -> Dict[str, Any]:
    """处理多个PDF文件并进行分类"""
    results = []
    
    # 创建服务实例
    ocr_service = OCRService()
    classification_service = InvoiceClassificationService()
    
    print(f"\n处理 {len(files)} 个PDF文件...")
    print("="*60)
    
    for pdf_file in files:
        print(f"\n处理文件: {pdf_file.name}")
        
        try:
            # 1. OCR提取
            async with ocr_service:
                ocr_result = await ocr_service.extract_invoice_data(str(pdf_file))
            
            if ocr_result.get('status') != 'success':
                results.append({
                    "file": pdf_file.name,
                    "status": "ocr_failed",
                    "error": ocr_result.get('error', '未知错误')
                })
                continue
            
            # 2. 提取关键信息
            invoice_info = {
                "invoice_number": ocr_result.get('invoice_number'),
                "invoice_type": ocr_result.get('invoice_type'),
                "amount": float(ocr_result.get('total_amount', 0) or 0),
                "seller": ocr_result.get('seller_name'),
                "primary_category": None,
                "secondary_category": None,
                "confidence": 0.0,
                "rule_type": None
            }
            
            # 3. 自动分类
            structured_data = ocr_result.get('structured_data')
            if structured_data:
                # 需要将字典转换为StructuredInvoiceData对象
                from app.services.ocr.models import StructuredInvoiceData, InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
                
                # 从字典构建结构化数据对象
                main_info_dict = structured_data.get('main_info', {})
                seller_info_dict = structured_data.get('seller_info', {})
                buyer_info_dict = structured_data.get('buyer_info', {})
                summary_dict = structured_data.get('summary', {})
                
                structured_invoice_data = StructuredInvoiceData(
                    main_info=InvoiceMainInfo(
                        invoice_number=main_info_dict.get('invoice_number', ''),
                        invoice_code=main_info_dict.get('invoice_code'),
                        invoice_type=main_info_dict.get('invoice_type', '电子发票'),
                        invoice_date=main_info_dict.get('invoice_date')
                    ),
                    seller_info=InvoicePartyInfo(
                        name=seller_info_dict.get('name'),
                        tax_id=seller_info_dict.get('tax_id')
                    ),
                    buyer_info=InvoicePartyInfo(
                        name=buyer_info_dict.get('name'),
                        tax_id=buyer_info_dict.get('tax_id')
                    ),
                    summary=InvoiceSummary(
                        amount=float(summary_dict.get('amount', 0) or 0),
                        tax_amount=float(summary_dict.get('tax_amount', 0) or 0),
                        total_amount=float(summary_dict.get('total_amount', 0) or 0),
                        amount_in_words=summary_dict.get('amount_in_words')
                    ),
                    items=structured_data.get('items', [])
                )
                
                classification_result = await classification_service.classify_invoice(
                    structured_invoice_data,
                    session
                )
                
                if classification_result:
                    # 从metadata中获取分类名称
                    metadata = classification_result.metadata or {}
                    invoice_info.update({
                        "primary_category": metadata.get('primary_category_name'),
                        "secondary_category": metadata.get('secondary_category_name'),
                        "confidence": classification_result.confidence,
                        "rule_type": classification_result.rule_type
                    })
            
            invoice_info["status"] = "success"
            results.append(invoice_info)
            
            # 打印结果
            print(f"  发票号: {invoice_info['invoice_number']}")
            print(f"  类型: {invoice_info['invoice_type']}")
            print(f"  金额: ¥{invoice_info['amount']:.2f}")
            print(f"  销售方: {invoice_info['seller'] or '未知'}")
            print(f"  分类: {invoice_info['primary_category'] or '其他'}/{invoice_info['secondary_category'] or 'None'}")
            print(f"  置信度: {invoice_info['confidence']:.2f}")
            print(f"  规则: {invoice_info['rule_type'] or 'default'}")
            
        except Exception as e:
            print(f"  ❌ 错误: {e}")
            results.append({
                "file": pdf_file.name,
                "status": "error",
                "error": str(e)
            })
    
    # 统计结果
    success_count = len([r for r in results if r.get('status') == 'success'])
    
    # 统计分类分布
    classification_stats = {}
    type_stats = {}
    
    for result in results:
        if result.get('status') == 'success':
            # 统计分类
            primary = result.get('primary_category', '其他')
            secondary = result.get('secondary_category')
            category_key = f"{primary}/{secondary}" if secondary else primary
            classification_stats[category_key] = classification_stats.get(category_key, 0) + 1
            
            # 统计类型
            invoice_type = result.get('invoice_type', '未知')
            type_stats[invoice_type] = type_stats.get(invoice_type, 0) + 1
    
    return {
        "test_time": datetime.now().isoformat(),
        "total_files": len(files),
        "success_count": success_count,
        "classification_stats": classification_stats,
        "type_stats": type_stats,
        "results": results
    }


async def main():
    """主测试函数"""
    # 获取downloads目录下的PDF文件
    downloads_dir = Path("downloads")
    pdf_files = list(downloads_dir.glob("*.pdf"))[:10]  # 限制最多10个文件
    
    if not pdf_files:
        print("未找到PDF文件")
        return
    
    print(f"找到 {len(pdf_files)} 个PDF文件")
    
    # 获取数据库会话
    async with get_db_context() as session:
        # 处理文件
        results = await process_pdf_files(pdf_files, session)
        
        # 保存结果
        output_file = f"classification_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)
        
        print(f"\n\n测试结果已保存到: {output_file}")
        
        # 打印统计
        print("\n" + "="*60)
        print("测试统计:")
        print(f"  总文件数: {results['total_files']}")
        print(f"  成功处理: {results['success_count']}")
        print(f"  成功率: {results['success_count']/results['total_files']*100:.1f}%")
        
        print("\n分类分布:")
        for category, count in results['classification_stats'].items():
            print(f"  {category}: {count}")
        
        print("\n发票类型分布:")
        for invoice_type, count in results['type_stats'].items():
            print(f"  {invoice_type}: {count}")


if __name__ == "__main__":
    asyncio.run(main())