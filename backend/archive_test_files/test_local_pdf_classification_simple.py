#!/usr/bin/env python3
"""
测试本地PDF发票的OCR解析和分类（简化版本，不保存数据库）
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime
import json

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import async_session_maker
from app.services.ocr.service import OCRService
from app.services.invoice_classification_service import InvoiceClassificationService
from app.services.ocr.models import InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary, StructuredInvoiceData


async def process_single_pdf(pdf_path: Path, ocr_service: OCRService, classification_service: InvoiceClassificationService, session):
    """处理单个PDF文件"""
    print(f"\n{'='*60}")
    print(f"处理文件: {pdf_path.name}")
    print(f"{'='*60}")
    
    try:
        # 1. OCR解析
        print("\n📄 开始OCR解析...")
        ocr_result = await ocr_service.extract_invoice_data(str(pdf_path))
        
        if ocr_result.get('status') == 'success':
            structured_data = ocr_result.get('structured_data')
            print(f"✓ OCR解析成功")
            
            # 从字典格式重建结构化数据对象
            main_info = InvoiceMainInfo(
                invoice_number=structured_data.get('main_info', {}).get('invoice_number', ''),
                invoice_code=structured_data.get('main_info', {}).get('invoice_code'),
                invoice_type=structured_data.get('main_info', {}).get('invoice_type', '电子发票'),
                invoice_date=structured_data.get('main_info', {}).get('invoice_date')
            )
            
            seller_info = InvoicePartyInfo(
                name=structured_data.get('seller_info', {}).get('name'),
                tax_id=structured_data.get('seller_info', {}).get('tax_id')
            )
            
            buyer_info = InvoicePartyInfo(
                name=structured_data.get('buyer_info', {}).get('name'),
                tax_id=structured_data.get('buyer_info', {}).get('tax_id')
            )
            
            summary = InvoiceSummary(
                amount=structured_data.get('summary', {}).get('amount', 0),
                tax_amount=structured_data.get('summary', {}).get('tax_amount'),
                total_amount=structured_data.get('summary', {}).get('total_amount', 0)
            )
            
            # 重建完整的结构化数据对象
            structured_invoice = StructuredInvoiceData(
                main_info=main_info,
                seller_info=seller_info,
                buyer_info=buyer_info,
                summary=summary,
                items=structured_data.get('items', []),
                issuer_person=structured_data.get('issuer_person')
            )
            
            print(f"  - 发票号码: {main_info.invoice_number}")
            print(f"  - 开票日期: {main_info.invoice_date}")
            print(f"  - 发票类型: {main_info.invoice_type}")
            print(f"  - 销售方: {seller_info.name or '未知'}")
            print(f"  - 金额: ¥{summary.total_amount}")
            
            # 2. 自动分类
            print("\n🏷️ 开始自动分类...")
            classification_result = await classification_service.classify_invoice(structured_invoice, session)
            
            if classification_result:
                print(f"✓ 分类成功:")
                print(f"  - 一级分类: {classification_result.primary_category_code} ({classification_result.metadata.get('primary_category_name')})")
                print(f"  - 二级分类: {classification_result.secondary_category_code} ({classification_result.metadata.get('secondary_category_name')}) " if classification_result.secondary_category_code else "  - 二级分类: 无")
                print(f"  - 置信度: {classification_result.confidence:.2f}")
                print(f"  - 规则类型: {classification_result.rule_type}")
                print(f"  - 匹配原因: {classification_result.reason}")
                
                return {
                    "file": pdf_path.name,
                    "status": "success",
                    "invoice_number": main_info.invoice_number,
                    "invoice_type": main_info.invoice_type,
                    "amount": float(summary.total_amount),
                    "seller": seller_info.name,
                    "primary_category": classification_result.metadata.get('primary_category_name'),
                    "secondary_category": classification_result.metadata.get('secondary_category_name'),
                    "confidence": classification_result.confidence,
                    "rule_type": classification_result.rule_type
                }
            else:
                print("❌ 分类失败: 无法匹配任何规则")
                return {
                    "file": pdf_path.name,
                    "status": "classification_failed",
                    "invoice_number": main_info.invoice_number,
                    "invoice_type": main_info.invoice_type,
                    "error": "无法分类"
                }
        else:
            print(f"❌ OCR解析失败: {ocr_result.get('error', '未知错误')}")
            return {
                "file": pdf_path.name,
                "status": "ocr_failed",
                "error": ocr_result.get('error', '未知错误')
            }
            
    except Exception as e:
        print(f"❌ 处理失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "file": pdf_path.name,
            "status": "error",
            "error": str(e)
        }


async def main():
    """主函数"""
    print("🚀 本地PDF发票处理测试（简化版）")
    print(f"使用 invoice2data 进行OCR解析")
    
    # 获取所有PDF文件
    downloads_dir = Path("downloads")
    pdf_files = list(downloads_dir.glob("*.pdf"))
    
    if not pdf_files:
        print("❌ downloads目录下没有找到PDF文件")
        return
    
    print(f"\n找到 {len(pdf_files)} 个PDF文件")
    
    # 创建服务实例
    ocr_service = OCRService()
    classification_service = InvoiceClassificationService()
    
    # 处理结果统计
    results = []
    success_count = 0
    classification_stats = {}
    
    # 由于分类服务需要数据库会话，我们只创建一个会话用于查询
    async with async_session_maker() as session:
        # 处理每个PDF
        for pdf_path in pdf_files[:10]:  # 限制处理前10个文件
            result = await process_single_pdf(
                pdf_path,
                ocr_service,
                classification_service,
                session
            )
            results.append(result)
            
            if result["status"] == "success":
                success_count += 1
                # 统计分类分布
                category_key = f"{result.get('primary_category', '未知')}/{result.get('secondary_category', '无')}"
                classification_stats[category_key] = classification_stats.get(category_key, 0) + 1
    
    # 打印统计结果
    print(f"\n{'='*80}")
    print("📊 处理结果统计")
    print(f"{'='*80}")
    print(f"总文件数: {len(results)}")
    print(f"成功数: {success_count}")
    print(f"失败数: {len(results) - success_count}")
    print(f"成功率: {(success_count / len(results) * 100):.1f}%")
    
    # 分类统计
    print("\n📈 分类分布:")
    for category, count in sorted(classification_stats.items()):
        print(f"  - {category}: {count} 个")
    
    # 按发票类型统计
    print("\n📑 发票类型分布:")
    type_stats = {}
    for r in results:
        if r.get("invoice_type"):
            type_stats[r["invoice_type"]] = type_stats.get(r["invoice_type"], 0) + 1
    
    for inv_type, count in sorted(type_stats.items()):
        print(f"  - {inv_type}: {count} 个")
    
    # 保存详细结果
    output_file = f"local_pdf_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "test_time": str(datetime.now()),
            "total_files": len(results),
            "success_count": success_count,
            "classification_stats": classification_stats,
            "type_stats": type_stats,
            "results": results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 详细结果已保存到: {output_file}")
    
    # 打印失败的文件
    failures = [r for r in results if r["status"] != "success"]
    if failures:
        print("\n❌ 失败的文件:")
        for f in failures:
            print(f"  - {f['file']}: {f.get('error', '未知错误')}")
    
    # 打印分类置信度较低的文件
    low_confidence = [r for r in results if r["status"] == "success" and r.get("confidence", 0) < 0.5]
    if low_confidence:
        print("\n⚠️ 分类置信度较低的文件 (< 0.5):")
        for lc in low_confidence:
            print(f"  - {lc['file']}: {lc.get('primary_category')}/{lc.get('secondary_category')} (置信度: {lc.get('confidence', 0):.2f})")


if __name__ == "__main__":
    asyncio.run(main())