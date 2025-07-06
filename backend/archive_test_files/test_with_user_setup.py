#!/usr/bin/env python3
"""
测试本地PDF发票文件处理（包含用户设置）
先创建测试用户，然后处理发票
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from uuid import UUID
from datetime import datetime, timezone
import glob

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_async_db
from app.models.profile import Profile
from app.models.invoice import Invoice, InvoiceSource
from app.services.file_service import FileService
from app.services.ocr import OCRService
from app.services.invoice_service import InvoiceService
from app.services.pdf_invoice_processor import PDFInvoiceProcessor
from app.utils.logger import get_logger
from sqlalchemy import select

logger = get_logger(__name__)


async def ensure_test_user_exists(user_id: UUID):
    """确保测试用户存在"""
    async for db in get_async_db():
        try:
            # 检查用户是否存在
            query = select(Profile).where(Profile.auth_user_id == user_id)
            result = await db.execute(query)
            profile = result.scalar_one_or_none()
            
            if not profile:
                # 创建新的profile
                profile = Profile(
                    auth_user_id=user_id,
                    display_name="测试用户",
                    is_active=True,
                    preferences={},
                    email_config={}
                )
                db.add(profile)
                await db.commit()
                print(f"✅ 创建测试用户: {profile.display_name} (ID: {profile.auth_user_id})")
            else:
                print(f"✅ 测试用户已存在: {profile.display_name} (ID: {profile.auth_user_id})")
            
            return profile
            
        except Exception as e:
            print(f"❌ 创建用户失败: {e}")
            await db.rollback()
            raise
        finally:
            break


async def process_single_pdf(pdf_path: str, user_id: UUID):
    """处理单个PDF文件"""
    print(f"\n{'='*60}")
    print(f"处理文件: {Path(pdf_path).name}")
    print(f"文件大小: {Path(pdf_path).stat().st_size / 1024:.2f} KB")
    
    async for db in get_async_db():
        try:
            # 创建服务实例
            file_service = FileService()
            ocr_service = OCRService()
            invoice_service = InvoiceService(db, file_service)
            
            pdf_processor = PDFInvoiceProcessor(
                db=db,
                ocr_service=ocr_service,
                invoice_service=invoice_service,
                file_service=file_service
            )
            
            # 处理PDF发票
            invoice = await pdf_processor.process_pdf_invoice(
                file_path=pdf_path,
                user_id=user_id,
                source=InvoiceSource.UPLOAD,
                source_metadata={
                    "source": "local_test",
                    "original_path": pdf_path,
                    "test_time": datetime.now(timezone.utc).isoformat()
                }
            )
            
            # 打印处理结果
            print(f"\n✅ 处理成功!")
            print(f"发票ID: {invoice.id}")
            print(f"发票号: {invoice.invoice_number}")
            print(f"状态: {invoice.status}")
            print(f"处理状态: {invoice.processing_status}")
            
            # 打印提取的信息
            if invoice.extracted_data:
                structured_data = invoice.extracted_data.get('structured_data', {})
                main_info = structured_data.get('main_info', {})
                seller_info = structured_data.get('seller_info', {})
                buyer_info = structured_data.get('buyer_info', {})
                summary = structured_data.get('summary', {})
                
                print(f"\n提取的发票信息:")
                print(f"- 发票代码: {main_info.get('invoice_code', 'N/A')}")
                print(f"- 发票号码: {main_info.get('invoice_number', 'N/A')}")
                print(f"- 开票日期: {main_info.get('invoice_date', 'N/A')}")
                print(f"- 销售方: {seller_info.get('name', 'N/A')}")
                print(f"- 购买方: {buyer_info.get('name', 'N/A')}")
                print(f"- 金额: ¥{summary.get('amount', 0)}")
                print(f"- 税额: ¥{summary.get('tax_amount', 0)}")
                print(f"- 价税合计: ¥{summary.get('total_amount', 0)}")
                
                # 打印置信度
                confidence_scores = invoice.extracted_data.get('confidence_scores', {})
                overall_confidence = confidence_scores.get('overall', 0)
                print(f"\n置信度: {overall_confidence:.2%}")
                
                if overall_confidence < 0.7:
                    print("⚠️ 置信度较低，建议人工审核")
            
            return invoice
            
        except Exception as e:
            print(f"\n❌ 处理失败: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            break


async def test_ocr_service():
    """测试OCR服务状态"""
    print("\n=== 测试OCR服务 ===")
    
    ocr_service = OCRService()
    health_status = await ocr_service.health_check()
    print(f"OCR服务状态: {json.dumps(health_status, indent=2, ensure_ascii=False)}")
    
    if health_status['status'] == 'unavailable':
        print("\n⚠️ OCR服务不可用，将使用模拟数据")
    else:
        print("\n✅ OCR服务正常")


async def query_user_invoices(user_id: UUID):
    """查询用户的发票"""
    print(f"\n\n{'='*60}")
    print("查询用户发票")
    
    async for db in get_async_db():
        try:
            file_service = FileService()
            invoice_service = InvoiceService(db, file_service)
            
            # 查询发票
            invoices, total = await invoice_service.search_invoices(
                user_id=user_id,
                limit=10,
                offset=0
            )
            
            print(f"\n找到 {total} 张发票:")
            if invoices:
                print(f"\n{'发票号':<30} {'销售方':<20} {'金额':>12} {'状态':<10} {'日期'}")
                print("-" * 90)
                
                for invoice in invoices:
                    invoice_number = invoice.invoice_number[:28] + ".." if len(invoice.invoice_number) > 30 else invoice.invoice_number
                    seller_name = (invoice.seller_name or "未知")[:18] + ".." if invoice.seller_name and len(invoice.seller_name) > 20 else (invoice.seller_name or "未知")
                    amount = f"¥{invoice.total_amount or 0:,.2f}"
                    status = invoice.status
                    date = invoice.invoice_date.strftime("%Y-%m-%d") if invoice.invoice_date else "N/A"
                    
                    print(f"{invoice_number:<30} {seller_name:<20} {amount:>12} {status:<10} {date}")
            
            # 获取统计信息
            stats = await invoice_service.get_invoice_statistics(user_id)
            print(f"\n发票统计:")
            print(f"- 总数: {stats['total_count']}")
            print(f"- 总金额: ¥{stats['amount_stats']['total']:,.2f}")
            if stats['total_count'] > 0:
                print(f"- 平均金额: ¥{stats['amount_stats']['average']:,.2f}")
            
        except Exception as e:
            print(f"\n查询失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            break


async def main():
    """主测试函数"""
    print("开始测试本地PDF发票处理（包含用户设置）...\n")
    
    # 测试用户ID
    test_user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    
    # 1. 确保测试用户存在
    print("1. 设置测试用户")
    await ensure_test_user_exists(test_user_id)
    
    # 2. 测试OCR服务
    await test_ocr_service()
    
    # 3. 处理PDF文件
    pdf_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/downloads"
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    
    if pdf_files:
        print(f"\n\n3. 处理PDF发票文件")
        print(f"找到 {len(pdf_files)} 个PDF文件")
        
        # 处理前3个文件作为示例
        for pdf_file in pdf_files[:3]:
            await process_single_pdf(pdf_file, test_user_id)
    else:
        print(f"\n未找到PDF文件: {pdf_dir}")
    
    # 4. 查询处理结果
    await query_user_invoices(test_user_id)
    
    print("\n\n=== 测试完成 ===")


if __name__ == "__main__":
    # 设置事件循环策略（解决macOS上的问题）
    import platform
    if platform.system() == 'Darwin':
        try:
            import uvloop
            asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
        except ImportError:
            pass
    
    asyncio.run(main())