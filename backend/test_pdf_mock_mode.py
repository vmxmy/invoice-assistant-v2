#!/usr/bin/env python3
"""
测试本地PDF发票文件处理（使用模拟模式）
"""

import asyncio
import os
import sys
from pathlib import Path
from uuid import UUID
from datetime import datetime, timezone
import glob

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 设置环境变量以使用模拟模式
os.environ["MINERU_API_TOKEN"] = ""  # 空token将触发模拟模式

from app.core.database import get_async_db
from app.models.profile import Profile
from app.models.invoice import Invoice, InvoiceSource
from app.services.file_service import FileService
from app.services.ocr_service import OCRService
from app.services.invoice_service import InvoiceService
from app.services.pdf_invoice_processor import PDFInvoiceProcessor
from app.utils.logger import get_logger
from sqlalchemy import select

logger = get_logger(__name__)


async def process_pdf_with_mock(pdf_path: str, user_id: UUID):
    """使用模拟模式处理PDF文件"""
    print(f"\n{'='*60}")
    print(f"处理文件: {Path(pdf_path).name}")
    print(f"文件大小: {Path(pdf_path).stat().st_size / 1024:.2f} KB")
    
    async for db in get_async_db():
        try:
            # 创建服务实例
            file_service = FileService()
            ocr_service = OCRService()
            
            # 确认使用模拟模式
            print("\n📝 使用模拟OCR模式处理...")
            
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
                    "source": "local_test_mock",
                    "original_path": pdf_path,
                    "test_time": datetime.now(timezone.utc).isoformat(),
                    "mode": "mock"
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
                
                # 注意这是模拟数据
                print("\n⚠️ 注意：以上为模拟数据，仅用于测试")
            
            return invoice
            
        except Exception as e:
            print(f"\n❌ 处理失败: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            break


async def main():
    """主测试函数"""
    print("开始测试本地PDF发票处理（模拟模式）...\n")
    
    # 测试用户ID
    test_user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    
    # 确保测试用户存在
    async for db in get_async_db():
        try:
            query = select(Profile).where(Profile.auth_user_id == test_user_id)
            result = await db.execute(query)
            profile = result.scalar_one_or_none()
            
            if profile:
                print(f"✅ 使用现有测试用户: {profile.display_name}")
            else:
                print("⚠️ 测试用户不存在，请先运行 test_with_user_setup.py")
                return
        finally:
            break
    
    # PDF文件目录
    pdf_dir = "/Users/xumingyang/app/invoice_assist/v2/backend/downloads"
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    
    if pdf_files:
        print(f"\n找到 {len(pdf_files)} 个PDF文件")
        
        # 处理前2个文件作为示例
        for pdf_file in pdf_files[:2]:
            await process_pdf_with_mock(pdf_file, test_user_id)
    else:
        print(f"\n未找到PDF文件: {pdf_dir}")
    
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