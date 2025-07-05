#!/usr/bin/env python3
"""
测试发票处理完整流程
包括PDF解析、OCR识别和数据存储
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from uuid import UUID
from datetime import datetime

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_async_db, AsyncSessionLocal
from app.models.invoice import Invoice, InvoiceSource
from app.services.file_service import FileService
from app.services.ocr_service import OCRService
from app.services.invoice_service import InvoiceService
from app.services.pdf_invoice_processor import PDFInvoiceProcessor
from app.utils.logger import get_logger

logger = get_logger(__name__)


async def test_ocr_service():
    """测试OCR服务"""
    print("\n=== 测试OCR服务 ===")
    
    ocr_service = OCRService()
    
    # 测试健康检查
    health_status = await ocr_service.health_check()
    print(f"OCR服务状态: {json.dumps(health_status, indent=2, ensure_ascii=False)}")
    
    # 如果有测试PDF文件，可以测试提取
    test_pdf_path = "/tmp/test_invoice.pdf"
    if Path(test_pdf_path).exists():
        print(f"\n测试PDF提取: {test_pdf_path}")
        result = await ocr_service.extract_invoice_data(test_pdf_path)
        print(f"提取结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
    else:
        print(f"\n测试PDF文件不存在: {test_pdf_path}")
        print("将使用模拟数据进行测试")
        
        # 创建一个空的测试文件
        Path(test_pdf_path).touch()
        result = await ocr_service.extract_invoice_data(test_pdf_path)
        print(f"模拟提取结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        # 清理测试文件
        Path(test_pdf_path).unlink()


async def test_pdf_invoice_processor():
    """测试PDF发票处理器"""
    print("\n=== 测试PDF发票处理器 ===")
    
    # 测试用户ID
    test_user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    
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
            
            # 创建测试PDF文件
            test_pdf_path = "/tmp/test_invoice_processing.pdf"
            with open(test_pdf_path, "wb") as f:
                # 写入最小的PDF文件头
                f.write(b"%PDF-1.4\n")
                f.write(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
                f.write(b"2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n")
                f.write(b"xref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n")
                f.write(b"trailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n116\n%%EOF")
            
            print(f"创建测试PDF文件: {test_pdf_path}")
            
            # 测试处理单个PDF
            print("\n测试单个PDF处理...")
            invoice = await pdf_processor.process_pdf_invoice(
                file_path=test_pdf_path,
                user_id=test_user_id,
                source=InvoiceSource.UPLOAD,
                source_metadata={
                    "test": True,
                    "uploaded_at": datetime.utcnow().isoformat()
                }
            )
            
            print(f"\n处理结果:")
            print(f"- 发票ID: {invoice.id}")
            print(f"- 发票号: {invoice.invoice_number}")
            print(f"- 状态: {invoice.status}")
            print(f"- 处理状态: {invoice.processing_status}")
            print(f"- 金额: {invoice.total_amount}")
            print(f"- 提取数据: {json.dumps(invoice.extracted_data, indent=2, ensure_ascii=False)}")
            
            # 测试批量处理
            print("\n\n测试批量PDF处理...")
            test_files = []
            for i in range(3):
                test_file = f"/tmp/test_batch_invoice_{i}.pdf"
                with open(test_file, "wb") as f:
                    f.write(b"%PDF-1.4\n%%EOF")
                test_files.append(test_file)
            
            results = await pdf_processor.batch_process_invoices(
                file_paths=test_files,
                user_id=test_user_id,
                source=InvoiceSource.EMAIL
            )
            
            print(f"\n批量处理结果:")
            for result in results:
                print(f"- {result['file_path']}: {result['status']}")
                if result['status'] == 'success':
                    print(f"  发票ID: {result['invoice_id']}")
                else:
                    print(f"  错误: {result.get('error', 'Unknown')}")
            
            # 清理测试文件
            for test_file in [test_pdf_path] + test_files:
                try:
                    Path(test_file).unlink()
                except:
                    pass
            
            print("\n✅ PDF发票处理器测试完成")
            
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            break


async def test_invoice_search():
    """测试发票搜索功能"""
    print("\n=== 测试发票搜索功能 ===")
    
    test_user_id = UUID("550e8400-e29b-41d4-a716-446655440000")
    
    async for db in get_async_db():
        try:
            file_service = FileService()
            invoice_service = InvoiceService(db, file_service)
            
            # 搜索发票
            invoices, total = await invoice_service.search_invoices(
                user_id=test_user_id,
                limit=10,
                offset=0
            )
            
            print(f"\n找到 {total} 张发票:")
            for invoice in invoices:
                print(f"- {invoice.invoice_number}: {invoice.seller_name} - ¥{invoice.total_amount}")
            
            # 获取统计信息
            stats = await invoice_service.get_invoice_statistics(test_user_id)
            print(f"\n发票统计:")
            print(f"- 总数: {stats['total_count']}")
            print(f"- 总金额: ¥{stats['amount_stats']['total']}")
            print(f"- 平均金额: ¥{stats['amount_stats']['average']}")
            print(f"- 状态分布: {stats['status_distribution']}")
            print(f"- 来源分布: {stats['source_distribution']}")
            
        except Exception as e:
            print(f"\n❌ 搜索测试失败: {e}")
            import traceback
            traceback.print_exc()
        finally:
            break


async def main():
    """主测试函数"""
    print("开始测试发票处理系统...\n")
    
    # 测试OCR服务
    await test_ocr_service()
    
    # 测试PDF发票处理器
    await test_pdf_invoice_processor()
    
    # 测试发票搜索
    await test_invoice_search()
    
    print("\n\n=== 测试完成 ===")


if __name__ == "__main__":
    asyncio.run(main())