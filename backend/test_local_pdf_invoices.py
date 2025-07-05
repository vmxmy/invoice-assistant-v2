#!/usr/bin/env python3
"""
测试本地PDF发票文件处理
使用downloads目录中的真实发票文件进行测试
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from uuid import UUID
from datetime import datetime
import glob

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_async_db
from app.models.invoice import Invoice, InvoiceSource
from app.services.file_service import FileService
from app.services.ocr_service import OCRService
from app.services.invoice_service import InvoiceService
from app.services.pdf_invoice_processor import PDFInvoiceProcessor
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def test_single_pdf(pdf_path: str, user_id: UUID):
    """测试单个PDF文件处理"""
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
                    "test_time": datetime.utcnow().isoformat()
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


async def test_batch_pdfs(pdf_dir: str, user_id: UUID, limit: int = 5):
    """批量测试PDF文件"""
    # 获取目录中的PDF文件
    pdf_pattern = os.path.join(pdf_dir, "*.pdf")
    pdf_files = glob.glob(pdf_pattern)
    
    if not pdf_files:
        print(f"未找到PDF文件: {pdf_pattern}")
        return
    
    # 限制处理数量
    pdf_files = pdf_files[:limit]
    
    print(f"\n找到 {len(pdf_files)} 个PDF文件，将处理前 {limit} 个")
    
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
            
            # 批量处理
            results = await pdf_processor.batch_process_invoices(
                file_paths=pdf_files,
                user_id=user_id,
                source=InvoiceSource.UPLOAD
            )
            
            # 统计结果
            success_count = len([r for r in results if r['status'] == 'success'])
            failed_count = len([r for r in results if r['status'] == 'error'])
            
            print(f"\n批量处理完成:")
            print(f"- 成功: {success_count}")
            print(f"- 失败: {failed_count}")
            
            # 打印每个文件的结果
            for result in results:
                file_name = Path(result['file_path']).name
                if result['status'] == 'success':
                    print(f"✅ {file_name} -> 发票ID: {result['invoice_id']}")
                else:
                    print(f"❌ {file_name} -> 错误: {result['error']}")
            
            return results
            
        except Exception as e:
            print(f"\n批量处理失败: {e}")
            import traceback
            traceback.print_exc()
            return []
        finally:
            break


async def query_processed_invoices(user_id: UUID):
    """查询已处理的发票"""
    print(f"\n\n{'='*60}")
    print("查询已处理的发票")
    
    async for db in get_async_db():
        try:
            file_service = FileService()
            invoice_service = InvoiceService(db, file_service)
            
            # 查询最近的发票
            invoices, total = await invoice_service.search_invoices(
                user_id=user_id,
                limit=10,
                offset=0
            )
            
            print(f"\n找到 {total} 张发票，显示最近 10 张:")
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
            print(f"- 平均金额: ¥{stats['amount_stats']['average']:,.2f}")
            
            # 状态分布
            print(f"\n状态分布:")
            for status, count in stats['status_distribution'].items():
                print(f"- {status}: {count}")
            
        except Exception as e:
            print(f"\n查询失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            break


async def main():
    """主测试函数"""
    print("开始测试本地PDF发票处理...\n")
    
    # 测试用户ID
    test_user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    
    # PDF文件目录
    pdf_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/downloads"
    
    # 1. 测试单个PDF文件
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    if pdf_files:
        print(f"\n1. 测试单个PDF文件处理")
        first_pdf = pdf_files[0]
        await test_single_pdf(first_pdf, test_user_id)
    
    # 2. 批量测试多个PDF文件
    print(f"\n\n2. 批量测试PDF文件处理")
    await test_batch_pdfs(pdf_dir, test_user_id, limit=5)
    
    # 3. 查询处理结果
    await query_processed_invoices(test_user_id)
    
    print("\n\n=== 测试完成 ===")


if __name__ == "__main__":
    # 设置事件循环策略（解决macOS上的问题）
    import platform
    if platform.system() == 'Darwin':
        import asyncio
        import uvloop
        asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    
    asyncio.run(main())