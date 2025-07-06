#!/usr/bin/env python3
"""
测试本地PDF发票的完整流程：上传、解析、分类
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime, date
import json

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.database import async_session_maker
from app.services.ocr.service import OCRService
from app.services.invoice_classification_service import InvoiceClassificationService
from app.models.invoice import Invoice, InvoiceStatus, ProcessingStatus
from app.models.category import PrimaryCategory, SecondaryCategory
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import aiofiles


# 测试用户ID（需要确保该用户存在）
TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"


async def ensure_test_user(session: AsyncSession):
    """确保测试用户存在"""
    from app.models.profile import Profile
    
    # 检查用户是否存在
    stmt = select(Profile).where(Profile.auth_user_id == TEST_USER_ID)
    result = await session.execute(stmt)
    profile = result.scalar_one_or_none()
    
    if not profile:
        # 创建测试用户
        profile = Profile(
            auth_user_id=TEST_USER_ID,
            display_name="测试用户",
            email_config={"primary_email": "test@example.com"}
        )
        session.add(profile)
        await session.commit()
        print(f"✓ 创建测试用户: {TEST_USER_ID}")
    else:
        print(f"✓ 使用现有测试用户: {profile.display_name}")
    
    return profile


async def process_single_pdf(pdf_path: Path, ocr_service: OCRService, classification_service: InvoiceClassificationService, session: AsyncSession):
    """处理单个PDF文件"""
    print(f"\n{'='*60}")
    print(f"处理文件: {pdf_path.name}")
    print(f"{'='*60}")
    
    try:
        # 1. 读取文件内容
        async with aiofiles.open(pdf_path, 'rb') as f:
            file_content = await f.read()
        
        print(f"✓ 文件大小: {len(file_content):,} bytes")
        
        # 2. OCR解析
        print("\n📄 开始OCR解析...")
        ocr_result = await ocr_service.extract_invoice_data(str(pdf_path))
        
        if ocr_result.get('status') == 'success':
            structured_data = ocr_result.get('structured_data')
            print(f"✓ OCR解析成功")
            
            # 从字典格式重建结构化数据对象
            from app.services.ocr.models import InvoiceMainInfo, InvoicePartyInfo, InvoiceSummary
            
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
            from app.services.ocr.models import StructuredInvoiceData
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
            print(f"  - 销售方: {seller_info.name or '未知'}")
            print(f"  - 金额: ¥{summary.total_amount}")
            
            # 3. 自动分类
            print("\n🏷️ 开始自动分类...")
            classification_result = await classification_service.classify_invoice(structured_invoice, session)
            
            if classification_result:
                print(f"✓ 分类成功:")
                print(f"  - 一级分类: {classification_result.primary_category_code} ({classification_result.metadata.get('primary_category_name')})")
                print(f"  - 二级分类: {classification_result.secondary_category_code} ({classification_result.metadata.get('secondary_category_name')}) " if classification_result.secondary_category_code else "  - 二级分类: 无")
                print(f"  - 置信度: {classification_result.confidence:.2f}")
                print(f"  - 规则类型: {classification_result.rule_type}")
                print(f"  - 匹配原因: {classification_result.reason}")
                
                # 4. 保存到数据库
                invoice = Invoice(
                    user_id=TEST_USER_ID,
                    invoice_number=main_info.invoice_number,
                    invoice_code=main_info.invoice_code,
                    invoice_type=main_info.invoice_type,
                    invoice_date=main_info.invoice_date if isinstance(main_info.invoice_date, date) else (datetime.strptime(main_info.invoice_date, "%Y-%m-%d").date() if main_info.invoice_date else datetime.now().date()),
                    amount=float(summary.amount) if summary.amount else 0,
                    tax_amount=float(summary.tax_amount) if summary.tax_amount else 0,
                    total_amount=float(summary.total_amount) if summary.total_amount else 0,
                    seller_name=seller_info.name,
                    seller_tax_id=seller_info.tax_id,
                    buyer_name=buyer_info.name,
                    buyer_tax_id=buyer_info.tax_id,
                    extracted_data=ocr_result,
                    file_path=str(pdf_path),
                    file_size=len(file_content),
                    status=InvoiceStatus.COMPLETED,
                    processing_status=ProcessingStatus.OCR_COMPLETED,
                    # 分类信息
                    primary_category_id=classification_result.primary_category_id,
                    secondary_category_id=classification_result.secondary_category_id,
                    auto_classified=True,
                    classification_confidence=classification_result.confidence,
                    classification_metadata={
                        'rule_type': classification_result.rule_type,
                        'reason': classification_result.reason,
                        'classified_at': datetime.utcnow().isoformat()
                    }
                )
                
                session.add(invoice)
                await session.flush()
                
                print(f"\n✓ 发票已保存到数据库 (ID: {invoice.id})")
                
                return {
                    "file": pdf_path.name,
                    "status": "success",
                    "invoice_number": main_info.invoice_number,
                    "amount": float(summary.total_amount),
                    "seller": seller_info.name,
                    "category": f"{classification_result.metadata.get('primary_category_name')}/{classification_result.metadata.get('secondary_category_name') or '无'}",
                    "confidence": classification_result.confidence
                }
            else:
                print("❌ 分类失败: 无法匹配任何规则")
                return {
                    "file": pdf_path.name,
                    "status": "classification_failed",
                    "invoice_number": main_info.invoice_number,
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
    print("🚀 本地PDF发票处理测试")
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
    
    async with async_session_maker() as session:
        # 确保测试用户存在
        await ensure_test_user(session)
        
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
        
        # 提交所有更改
        await session.commit()
    
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
    category_stats = {}
    for r in results:
        if r["status"] == "success":
            category = r.get("category", "未知")
            category_stats[category] = category_stats.get(category, 0) + 1
    
    for category, count in sorted(category_stats.items()):
        print(f"  - {category}: {count} 个")
    
    # 保存详细结果
    output_file = f"local_pdf_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "test_time": str(datetime.now()),
            "total_files": len(results),
            "success_count": success_count,
            "results": results
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 详细结果已保存到: {output_file}")
    
    # 打印失败的文件
    failures = [r for r in results if r["status"] != "success"]
    if failures:
        print("\n❌ 失败的文件:")
        for f in failures:
            print(f"  - {f['file']}: {f.get('error', '未知错误')}")


if __name__ == "__main__":
    asyncio.run(main())